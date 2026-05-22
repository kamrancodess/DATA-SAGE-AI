from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import json
import re

from db import (
    ensure_db,
    get_allowed_tables,
    get_database_path,
    get_schema_map,
    get_schema_description,
    init_db,
    run_query,
    set_database_path,
)
from llm import OLLAMA_MODEL, OLLAMA_URL, ask_llm
from ml import cluster_users, detect_anomalies, forecast_revenue, recommend_products

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

ensure_db()

REFERENCE_DATE = '2025-04-10'
MONTH_PATTERN = r"strftime('%Y-%m', {field})"
DAY_PATTERN = r"strftime('%Y-%m-%d', {field})"

SCHEMA_DESCRIPTION = """
Tables:
- customers(id, name, email, country, city, segment, signup_date)
- categories(id, name)
- products(id, name, category_id, supplier, price, cost, stock, rating)
- orders(id, customer_id, order_date, status, channel, payment_method, shipping_country, shipping_city, discount_amount)
- order_items(id, order_id, product_id, quantity, unit_price, discount)
- payments(id, order_id, amount, status, payment_method, paid_at)
- shipments(id, order_id, carrier, shipped_at, delivered_at, status, shipping_cost)
- returns(id, order_item_id, reason, return_date, status, refund_amount)
- support_tickets(id, customer_id, category, priority, status, created_at, resolved_at, agent_name)

Helpful join paths:
- customers -> orders on customers.id = orders.customer_id
- orders -> payments on orders.id = payments.order_id
- orders -> shipments on orders.id = shipments.order_id
- orders -> order_items on orders.id = order_items.order_id
- order_items -> products on order_items.product_id = products.id
- products -> categories on products.category_id = categories.id
- returns -> order_items on returns.order_item_id = order_items.id
- support_tickets -> customers on support_tickets.customer_id = customers.id
"""

LLM_SQL_EXAMPLES = """
Examples:
Q: which city has the most orders
SELECT o.shipping_city AS label, COUNT(*) AS value
FROM orders o
GROUP BY o.shipping_city
ORDER BY value DESC
LIMIT 10

Q: which countries have high revenue and many returns
SELECT o.shipping_country AS label,
       ROUND(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 2) AS revenue,
       COUNT(DISTINCT r.id) AS returns
FROM orders o
LEFT JOIN payments pay ON pay.order_id = o.id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN returns r ON r.order_item_id = oi.id
GROUP BY o.shipping_country
ORDER BY revenue DESC, returns DESC
LIMIT 10

Q: which supplier has the best gross margin
SELECT supplier AS label,
       ROUND(AVG((price - cost) / NULLIF(price, 0)) * 100, 2) AS value
FROM products
GROUP BY supplier
ORDER BY value DESC
LIMIT 10
"""

DATABASE_TERMS = [
    'customer', 'customers', 'order', 'orders', 'product', 'products', 'category', 'categories',
    'payment', 'payments', 'shipment', 'shipments', 'return', 'returns', 'ticket', 'tickets',
    'support', 'inventory', 'stock', 'revenue', 'sales', 'city', 'country', 'segment', 'carrier',
    'supplier', 'discount', 'refund', 'channel', 'status', 'database', 'dataset', 'table'
]

QUESTION_TERMS = ['show', 'list', 'find', 'which', 'what', 'who', 'how many', 'count', 'average', 'top', 'bottom', 'highest', 'lowest', 'compare', 'trend']


class QueryRequest(BaseModel):
    text: str


class LogRequest(BaseModel):
    logs: str


class ConnectDatabaseRequest(BaseModel):
    path: str


def clean_sql(sql):
    sql = sql.replace('```sql', '').replace('```', '').strip()
    sql = sql.rstrip(';').strip()
    return sql


def compact_whitespace(value):
    return re.sub(r'\s+', ' ', value).strip()


def extract_sql_candidate(raw_text):
    text = raw_text.strip()
    fenced_match = re.search(r'```(?:sql)?\s*(.*?)```', text, re.IGNORECASE | re.DOTALL)
    if fenced_match:
        return clean_sql(fenced_match.group(1))

    select_match = re.search(r'((?:WITH|SELECT)\b.*)', text, re.IGNORECASE | re.DOTALL)
    if select_match:
        return clean_sql(select_match.group(1))

    return clean_sql(text)


def extract_limit(text, default=10, maximum=50):
    match = re.search(r'\b(\d{1,3})\b', text)
    if not match:
        return default
    return max(1, min(maximum, int(match.group(1))))


def contains_any(text, keywords):
    return any(keyword in text for keyword in keywords)


def detect_sort_direction(text):
    if contains_any(text, ['lowest', 'least', 'bottom', 'smallest', 'worst']):
        return 'ASC'
    return 'DESC'


def detect_time_filter(text, field):
    if 'today' in text:
        return f"date({field}) = date('{REFERENCE_DATE}')"
    if 'yesterday' in text:
        return f"date({field}) = date('{REFERENCE_DATE}', '-1 day')"

    days_match = re.search(r'last\s+(\d{1,3})\s+days?', text)
    if days_match:
        days = int(days_match.group(1))
        return f"date({field}) >= date('{REFERENCE_DATE}', '-{days} day')"

    months_match = re.search(r'last\s+(\d{1,2})\s+months?', text)
    if months_match:
        months = int(months_match.group(1))
        return f"date({field}) >= date('{REFERENCE_DATE}', '-{months} month')"

    if contains_any(text, ['this month', 'current month']):
        return f"strftime('%Y-%m', {field}) = strftime('%Y-%m', '{REFERENCE_DATE}')"
    if 'last month' in text:
        return f"strftime('%Y-%m', {field}) = strftime('%Y-%m', date('{REFERENCE_DATE}', '-1 month'))"
    if contains_any(text, ['this year', 'current year']):
        return f"strftime('%Y', {field}) = strftime('%Y', '{REFERENCE_DATE}')"
    if 'last year' in text:
        return f"strftime('%Y', {field}) = strftime('%Y', date('{REFERENCE_DATE}', '-1 year'))"

    return None


def maybe_where(base_sql, condition):
    if not condition:
        return base_sql
    insert_point = base_sql.lower().find('group by')
    if insert_point == -1:
        insert_point = base_sql.lower().find('order by')
    if insert_point == -1:
        return f"{base_sql}\nWHERE {condition}"
    return f"{base_sql[:insert_point]}WHERE {condition}\n{base_sql[insert_point:]}"


def trend_query(label_sql, value_sql, from_sql, date_field, text, default_limit=18):
    granularity = DAY_PATTERN if contains_any(text, ['daily', 'day by day', 'per day']) else MONTH_PATTERN
    period_expr = granularity.format(field=date_field)
    time_filter = detect_time_filter(text, date_field)
    where_clause = f"WHERE {time_filter}" if time_filter else ''
    limit_clause = '' if 'daily' in text or 'monthly' in text or 'trend' in text else f'LIMIT {default_limit}'
    return f'''
    SELECT {label_sql} AS label,
           {value_sql} AS value
    FROM {from_sql}
    {where_clause}
    GROUP BY {period_expr}
    ORDER BY label ASC
    {limit_clause}
    '''


def revenue_by_dimension(dimension_sql, text, from_clause, date_field='o.order_date'):
    direction = detect_sort_direction(text)
    limit = extract_limit(text)
    base = f'''
    SELECT {dimension_sql} AS label,
           ROUND(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 2) AS value
    FROM {from_clause}
    GROUP BY {dimension_sql}
    ORDER BY value {direction}
    LIMIT {limit}
    '''
    return maybe_where(base, detect_time_filter(text, date_field))


def count_by_dimension(dimension_sql, text, from_clause, date_field='o.order_date', count_expr='COUNT(*)'):
    direction = detect_sort_direction(text)
    limit = extract_limit(text)
    base = f'''
    SELECT {dimension_sql} AS label,
           {count_expr} AS value
    FROM {from_clause}
    GROUP BY {dimension_sql}
    ORDER BY value {direction}
    LIMIT {limit}
    '''
    return maybe_where(base, detect_time_filter(text, date_field) if date_field else None)


def average_by_dimension(dimension_sql, value_sql, text, from_clause, date_field='o.order_date'):
    direction = detect_sort_direction(text)
    limit = extract_limit(text)
    base = f'''
    SELECT {dimension_sql} AS label,
           ROUND(AVG({value_sql}), 2) AS value
    FROM {from_clause}
    GROUP BY {dimension_sql}
    ORDER BY value {direction}
    LIMIT {limit}
    '''
    return maybe_where(base, detect_time_filter(text, date_field) if date_field else None)


def sum_by_dimension(dimension_sql, value_sql, text, from_clause, date_field='o.order_date'):
    direction = detect_sort_direction(text)
    limit = extract_limit(text)
    base = f'''
    SELECT {dimension_sql} AS label,
           ROUND(SUM({value_sql}), 2) AS value
    FROM {from_clause}
    GROUP BY {dimension_sql}
    ORDER BY value {direction}
    LIMIT {limit}
    '''
    return maybe_where(base, detect_time_filter(text, date_field) if date_field else None)


def looks_database_question(text):
    return contains_any(text, DATABASE_TERMS) or contains_any(text, QUESTION_TERMS)


def should_use_ai_before_rules(text):
    topic_groups = [
        ['revenue', 'sales', 'spend', 'aov', 'margin', 'profit'],
        ['return', 'returns', 'refund'],
        ['payment', 'payments', 'failed payment'],
        ['shipment', 'shipments', 'shipping', 'delivery', 'carrier'],
        ['ticket', 'tickets', 'support', 'resolution'],
        ['stock', 'inventory', 'supplier', 'product', 'products'],
        ['customer', 'customers', 'segment', 'country', 'city'],
    ]
    matched_groups = sum(1 for group in topic_groups if contains_any(text, group))
    asks_relationship = contains_any(text, [' and ', ' vs ', ' versus ', ' compared with ', 'correlat', 'relationship', 'both ', 'high ', 'low '])

    return matched_groups >= 2 and asks_relationship


def should_use_planner_before_rules(text):
    return contains_any(text, [
        'rate', 'margin', 'profit', 'high ', 'low ', ' and ', ' vs ', ' versus ',
        'compared with', 'relationship', 'correlat', 'delivery time', 'shipping cost'
    ])


def infer_query_shape(text):
    limit = extract_limit(text)
    direction = detect_sort_direction(text)

    metric = None
    if contains_any(text, ['gross margin', 'margin', 'profit']):
        metric = 'margin'
    elif contains_any(text, ['failed payment rate', 'failure rate']):
        metric = 'failed_payment_rate'
    elif contains_any(text, ['failed payment', 'failed payments', 'declined payment']):
        metric = 'failed_payments'
    elif contains_any(text, ['return rate']):
        metric = 'return_rate'
    elif contains_any(text, ['return', 'returns', 'refund']):
        metric = 'returns'
    elif contains_any(text, ['delivery', 'delivered', 'shipping time']):
        metric = 'delivery_days'
    elif contains_any(text, ['shipping cost', 'freight']):
        metric = 'shipping_cost'
    elif contains_any(text, ['shipment', 'shipments', 'shipping']):
        metric = 'shipments'
    elif contains_any(text, ['ticket', 'tickets', 'support']):
        metric = 'tickets'
    elif contains_any(text, ['stock', 'inventory']):
        metric = 'stock'
    elif contains_any(text, ['order', 'orders', 'purchase', 'purchases']):
        metric = 'orders'
    elif contains_any(text, ['customer', 'customers', 'users']):
        metric = 'customers'
    elif contains_any(text, ['revenue', 'sales', 'spend', 'amount', 'payment', 'payments', 'paid']):
        metric = 'revenue'

    dimension = None
    if contains_any(text, ['country', 'countries']):
        dimension = 'country'
    elif contains_any(text, ['city', 'cities']):
        dimension = 'city'
    elif contains_any(text, ['segment', 'customer type']):
        dimension = 'segment'
    elif contains_any(text, ['channel', 'platform']):
        dimension = 'channel'
    elif contains_any(text, ['payment method', 'method']):
        dimension = 'payment_method'
    elif contains_any(text, ['carrier', 'courier']):
        dimension = 'carrier'
    elif contains_any(text, ['category', 'categories']):
        dimension = 'category'
    elif contains_any(text, ['supplier', 'vendor']):
        dimension = 'supplier'
    elif contains_any(text, ['product', 'products', 'item', 'items']):
        dimension = 'product'
    elif contains_any(text, ['customer', 'customers', 'user', 'users', 'people']):
        dimension = 'customer'
    elif contains_any(text, ['month', 'monthly']):
        dimension = 'month'
    elif contains_any(text, ['status']):
        dimension = 'status'

    is_ranking_question = contains_any(text, ['top', 'best', 'highest', 'most', 'bottom', 'lowest', 'least'])

    if metric == 'customers' and dimension == 'customer' and is_ranking_question and not contains_any(text, ['count', 'how many', 'number of']):
        metric = 'revenue'

    if metric is None and is_ranking_question:
        if dimension in ['product', 'category', 'supplier', 'customer', 'country', 'city', 'segment', 'channel', 'payment_method', 'month']:
            metric = 'revenue'
        elif dimension == 'carrier':
            metric = 'shipments'
        elif dimension == 'status':
            metric = 'orders'

    return metric, dimension, limit, direction


def generate_sql_from_planner(text):
    metric, dimension, limit, direction = infer_query_shape(text)
    if not metric:
        return None

    if contains_any(text, ['revenue', 'sales', 'spend']) and contains_any(text, ['stock', 'inventory']) and dimension in ['product', 'category', 'supplier', None]:
        label_expr = {
            'category': 'cat.name',
            'supplier': 'p.supplier',
        }.get(dimension, 'p.name')
        return f"""
        SELECT {label_expr} AS label,
               ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue,
               SUM(p.stock) AS stock
        FROM products p
        LEFT JOIN categories cat ON cat.id = p.category_id
        JOIN order_items oi ON oi.product_id = p.id
        GROUP BY {label_expr}
        ORDER BY revenue DESC, stock ASC
        LIMIT {limit}
        """

    if contains_any(text, ['revenue', 'sales', 'spend']) and contains_any(text, ['return', 'returns', 'refund']) and dimension in ['country', 'city']:
        label_expr = 'o.shipping_country' if dimension == 'country' else 'o.shipping_city'
        return f"""
        WITH revenue_by_place AS (
            SELECT {label_expr} AS label,
                   ROUND(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 2) AS revenue
            FROM orders o
            LEFT JOIN payments pay ON pay.order_id = o.id
            GROUP BY {label_expr}
        ),
        returns_by_place AS (
            SELECT {label_expr} AS label,
                   COUNT(DISTINCT r.id) AS returns
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            JOIN returns r ON r.order_item_id = oi.id
            GROUP BY {label_expr}
        )
        SELECT revenue_by_place.label,
               revenue_by_place.revenue,
               COALESCE(returns_by_place.returns, 0) AS returns
        FROM revenue_by_place
        LEFT JOIN returns_by_place ON returns_by_place.label = revenue_by_place.label
        ORDER BY revenue DESC, returns DESC
        LIMIT {limit}
        """

    product_dimensions = {
        'product': 'p.name',
        'category': 'cat.name',
        'supplier': 'p.supplier',
    }
    customer_dimensions = {
        'customer': 'c.name',
        'country': 'o.shipping_country',
        'city': 'o.shipping_city',
        'segment': 'c.segment',
        'channel': 'o.channel',
        'payment_method': 'pay.payment_method',
        'month': "strftime('%Y-%m', o.order_date)",
        'status': 'o.status',
    }
    shipment_dimensions = {
        'carrier': 's.carrier',
        'country': 'o.shipping_country',
        'city': 'o.shipping_city',
        'month': "strftime('%Y-%m', s.shipped_at)",
        'status': 's.status',
    }

    if metric in ['margin', 'stock'] or dimension in product_dimensions:
        label_expr = product_dimensions.get(dimension, 'p.supplier')
        if metric == 'margin':
            value_expr = "ROUND(AVG((p.price - p.cost) / NULLIF(p.price, 0)) * 100, 2)"
        elif metric == 'stock':
            value_expr = 'SUM(p.stock)'
        elif metric == 'orders':
            value_expr = 'COUNT(DISTINCT o.id)'
        elif metric == 'returns':
            value_expr = 'COUNT(DISTINCT r.id)'
        else:
            value_expr = 'ROUND(SUM(oi.quantity * oi.unit_price), 2)'

        join_returns = 'LEFT JOIN returns r ON r.order_item_id = oi.id' if metric == 'returns' else ''
        return f"""
        SELECT {label_expr} AS label,
               {value_expr} AS value
        FROM products p
        LEFT JOIN categories cat ON cat.id = p.category_id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id
        {join_returns}
        GROUP BY {label_expr}
        ORDER BY value {direction}
        LIMIT {limit}
        """

    if metric in ['shipments', 'delivery_days', 'shipping_cost'] or dimension == 'carrier':
        label_expr = shipment_dimensions.get(dimension, 's.carrier')
        if metric == 'delivery_days':
            value_expr = "ROUND(AVG(julianday(s.delivered_at) - julianday(s.shipped_at)), 2)"
        elif metric == 'shipping_cost':
            value_expr = 'ROUND(AVG(s.shipping_cost), 2)'
        else:
            value_expr = 'COUNT(*)'
        return f"""
        SELECT {label_expr} AS label,
               {value_expr} AS value
        FROM shipments s
        JOIN orders o ON o.id = s.order_id
        GROUP BY {label_expr}
        ORDER BY value {direction}
        LIMIT {limit}
        """

    if metric == 'tickets':
        label_expr = {
            'customer': 'c.name',
            'country': 'c.country',
            'city': 'c.city',
            'segment': 'c.segment',
            'status': 't.status',
            'month': "strftime('%Y-%m', t.created_at)",
        }.get(dimension, 't.category')
        value_expr = (
            "ROUND(AVG((julianday(t.resolved_at) - julianday(t.created_at)) * 24), 2)"
            if contains_any(text, ['resolution', 'resolve', 'hours', 'time'])
            else 'COUNT(*)'
        )
        return f"""
        SELECT {label_expr} AS label,
               {value_expr} AS value
        FROM support_tickets t
        JOIN customers c ON c.id = t.customer_id
        GROUP BY {label_expr}
        ORDER BY value {direction}
        LIMIT {limit}
        """

    label_expr = customer_dimensions.get(dimension, 'c.name')
    if metric == 'failed_payment_rate':
        value_expr = "ROUND(100.0 * SUM(CASE WHEN pay.status = 'failed' THEN 1 ELSE 0 END) / COUNT(pay.id), 2)"
    elif metric == 'failed_payments':
        value_expr = "SUM(CASE WHEN pay.status = 'failed' THEN 1 ELSE 0 END)"
    elif metric == 'customers':
        value_expr = 'COUNT(DISTINCT c.id)'
    elif metric == 'orders':
        value_expr = 'COUNT(DISTINCT o.id)'
    else:
        value_expr = "ROUND(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 2)"

    return f"""
    SELECT {label_expr} AS label,
           {value_expr} AS value
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN payments pay ON pay.order_id = o.id
    GROUP BY {label_expr}
    ORDER BY value {direction}
    LIMIT {limit}
    """


def generate_sql_from_rules(text):
    text = text.lower().strip()
    limit = extract_limit(text)
    direction = detect_sort_direction(text)

    if contains_any(text, ['reset database', 'rebuild database', 'refresh dataset']):
        init_db()
        return "SELECT 'Database refreshed' AS label, COUNT(*) AS value FROM customers"

    if contains_any(text, ['what tables', 'database overview', 'dataset overview', 'what data do you have', 'data overview']):
        return '''
        SELECT 'Customers' AS label, COUNT(*) AS value FROM customers
        UNION ALL SELECT 'Orders', COUNT(*) FROM orders
        UNION ALL SELECT 'Products', COUNT(*) FROM products
        UNION ALL SELECT 'Payments', COUNT(*) FROM payments
        UNION ALL SELECT 'Shipments', COUNT(*) FROM shipments
        UNION ALL SELECT 'Returns', COUNT(*) FROM returns
        UNION ALL SELECT 'Support Tickets', COUNT(*) FROM support_tickets
        '''

    if contains_any(text, ['how many customers', 'customer count', 'count customers']) and 'by' not in text and 'segment' not in text and 'country' not in text and 'city' not in text:
        return "SELECT 'Customers' AS label, COUNT(*) AS value FROM customers"

    if contains_any(text, ['how many orders', 'order count', 'count orders']) and 'by' not in text and 'trend' not in text:
        return "SELECT 'Orders' AS label, COUNT(*) AS value FROM orders"

    if contains_any(text, ['how many products', 'product count', 'count products']) and 'top' not in text and 'supplier' not in text and 'category' not in text:
        return "SELECT 'Products' AS label, COUNT(*) AS value FROM products"

    if contains_any(text, ['how many payments', 'payment count', 'count payments']) and 'by' not in text and 'status' not in text and 'method' not in text:
        return "SELECT 'Payments' AS label, COUNT(*) AS value FROM payments"

    if contains_any(text, ['list customers', 'show customers', 'customer list']):
        return f'''
        SELECT name, email, country, city, segment, signup_date
        FROM customers
        ORDER BY signup_date DESC
        LIMIT {limit}
        '''

    if contains_any(text, ['list products', 'show products', 'product list']):
        return f'''
        SELECT p.name, c.name AS category, p.supplier, ROUND(p.price, 2) AS price, p.stock, ROUND(p.rating, 1) AS rating
        FROM products p
        JOIN categories c ON c.id = p.category_id
        ORDER BY p.stock ASC, p.rating DESC
        LIMIT {limit}
        '''

    if contains_any(text, ['list orders', 'show orders', 'recent orders']):
        return f'''
        SELECT o.id AS order_id,
               c.name AS customer,
               o.order_date,
               o.status,
               o.channel,
               ROUND(COALESCE(pay.amount, 0), 2) AS amount
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        LEFT JOIN payments pay ON pay.order_id = o.id
        ORDER BY o.order_date DESC
        LIMIT {limit}
        '''

    if contains_any(text, ['city has most orders', 'cities with most orders', 'orders by city', 'which city has the most orders']):
        return count_by_dimension('o.shipping_city', text, 'orders o', 'o.order_date')

    if contains_any(text, ['orders by country', 'which country has the most orders', 'country has most orders']):
        return count_by_dimension('o.shipping_country', text, 'orders o', 'o.order_date')

    if contains_any(text, ['customers by country', 'customers per country']):
        return count_by_dimension('country', text, 'customers', 'signup_date')

    if contains_any(text, ['customers by city', 'customers per city']):
        return count_by_dimension('city', text, 'customers', 'signup_date')

    if contains_any(text, ['customers by segment', 'segment count', 'segments by customers']):
        return count_by_dimension('segment', text, 'customers', 'signup_date')

    if contains_any(text, ['shipping cost']) and 'carrier' in text:
        return f'''
        SELECT carrier AS label,
               ROUND(AVG(shipping_cost), 2) AS value
        FROM shipments
        GROUP BY carrier
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['orders by carrier', 'shipments by carrier', 'carrier volume']):
        return count_by_dimension('carrier', text, 'shipments', 'shipped_at')

    if contains_any(text, ['revenue by segment', 'sales by segment', 'segment revenue']):
        return f'''
        SELECT c.segment AS label,
               ROUND(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 2) AS value
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        LEFT JOIN payments pay ON pay.order_id = o.id
        GROUP BY c.segment
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['revenue by supplier', 'sales by supplier', 'supplier revenue']):
        return f'''
        SELECT p.supplier AS label,
               ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100.0)), 2) AS value
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        GROUP BY p.supplier
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['orders by payment method', 'payment method volume', 'orders per payment method']):
        return count_by_dimension('payment_method', text, 'orders o', 'o.order_date')

    if contains_any(text, ['orders by customer segment', 'orders per segment']):
        return f'''
        SELECT c.segment AS label,
               COUNT(o.id) AS value
        FROM customers c
        JOIN orders o ON o.customer_id = c.id
        GROUP BY c.segment
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['average payment by method', 'average payment amount by method', 'avg payment by method']):
        return average_by_dimension('payment_method', 'amount', text, 'payments', 'paid_at')

    if contains_any(text, ['average discount by channel', 'avg discount by channel']):
        return average_by_dimension('channel', 'discount_amount', text, 'orders o', 'o.order_date')

    if contains_any(text, ['average discount by payment method', 'avg discount by payment method']):
        return average_by_dimension('payment_method', 'discount_amount', text, 'orders o', 'o.order_date')

    if contains_any(text, ['average items per order', 'avg items per order']) and 'channel' in text:
        return average_by_dimension('o.channel', 'item_counts.item_count', text, '''
        orders o
        JOIN (
            SELECT order_id, SUM(quantity) AS item_count
            FROM order_items
            GROUP BY order_id
        ) item_counts ON item_counts.order_id = o.id
        ''', 'o.order_date')

    if contains_any(text, ['average order value by segment', 'aov by segment']):
        return f'''
        SELECT c.segment AS label,
               ROUND(AVG(CASE WHEN pay.status = 'paid' THEN pay.amount END), 2) AS value
        FROM customers c
        JOIN orders o ON o.customer_id = c.id
        LEFT JOIN payments pay ON pay.order_id = o.id
        GROUP BY c.segment
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['average order value by city', 'aov by city']):
        return average_by_dimension('o.shipping_city', "CASE WHEN pay.status = 'paid' THEN pay.amount END", text, 'orders o LEFT JOIN payments pay ON pay.order_id = o.id', 'o.order_date')

    if contains_any(text, ['average order value by payment method', 'aov by payment method']):
        return average_by_dimension('o.payment_method', "CASE WHEN pay.status = 'paid' THEN pay.amount END", text, 'orders o LEFT JOIN payments pay ON pay.order_id = o.id', 'o.order_date')

    if contains_any(text, ['top suppliers by product count', 'supplier with most products', 'products by supplier']):
        return count_by_dimension('supplier', text, 'products', None, 'COUNT(*)')

    if contains_any(text, ['top suppliers by inventory value', 'inventory value by supplier']):
        return sum_by_dimension('supplier', 'stock * cost', text, 'products', None)

    if contains_any(text, ['average product price by category', 'avg price by category']):
        return average_by_dimension('c.name', 'p.price', text, 'products p JOIN categories c ON c.id = p.category_id', None)

    if contains_any(text, ['average product price by supplier', 'avg price by supplier']):
        return average_by_dimension('supplier', 'price', text, 'products', None)

    if contains_any(text, ['products by category', 'product count by category']):
        return f'''
        SELECT c.name AS label,
               COUNT(p.id) AS value
        FROM products p
        JOIN categories c ON c.id = p.category_id
        GROUP BY c.name
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['stock by category', 'inventory units by category']):
        return f'''
        SELECT c.name AS label,
               SUM(p.stock) AS value
        FROM products p
        JOIN categories c ON c.id = p.category_id
        GROUP BY c.name
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['top expensive products', 'most expensive products', 'highest priced products']):
        return f'''
        SELECT p.name AS label,
               ROUND(p.price, 2) AS value
        FROM products p
        ORDER BY value DESC
        LIMIT {limit}
        '''

    if contains_any(text, ['cheapest products', 'lowest priced products']):
        return f'''
        SELECT p.name AS label,
               ROUND(p.price, 2) AS value
        FROM products p
        ORDER BY value ASC
        LIMIT {limit}
        '''

    if contains_any(text, ['top discounts', 'highest discounts']) and 'order' in text:
        return f'''
        SELECT 'Order #' || o.id AS label,
               ROUND(o.discount_amount, 2) AS value
        FROM orders o
        ORDER BY value DESC
        LIMIT {limit}
        '''

    if contains_any(text, ['refund amount by reason', 'refunds by reason']):
        return sum_by_dimension('reason', 'refund_amount', text, 'returns', 'return_date')

    if contains_any(text, ['average refund by reason', 'avg refund by reason']):
        return average_by_dimension('reason', 'refund_amount', text, 'returns', 'return_date')

    if contains_any(text, ['payment status breakdown', 'payments by status']):
        return count_by_dimension('status', text, 'payments', 'paid_at')

    if contains_any(text, ['revenue by payment method', 'sales by payment method']):
        return revenue_by_dimension('pay.payment_method', text, 'payments pay', 'pay.paid_at')

    if contains_any(text, ['payment amount by status', 'average payment by status']):
        return average_by_dimension('status', 'amount', text, 'payments', 'paid_at')

    if contains_any(text, ['average shipping cost by country', 'shipping cost by country']):
        return average_by_dimension('o.shipping_country', 's.shipping_cost', text, 'shipments s JOIN orders o ON o.id = s.order_id', 'o.order_date')

    if contains_any(text, ['average shipping cost by city', 'shipping cost by city']):
        return average_by_dimension('o.shipping_city', 's.shipping_cost', text, 'shipments s JOIN orders o ON o.id = s.order_id', 'o.order_date')

    if contains_any(text, ['delivery time by carrier', 'average delivery time by carrier', 'avg delivery time by carrier']):
        return f'''
        SELECT carrier AS label,
               ROUND(AVG((julianday(delivered_at) - julianday(shipped_at)) * 24), 2) AS value
        FROM shipments
        WHERE delivered_at IS NOT NULL
          AND shipped_at IS NOT NULL
        GROUP BY carrier
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['delivery time by country', 'average delivery time by country']):
        return f'''
        SELECT o.shipping_country AS label,
               ROUND(AVG((julianday(s.delivered_at) - julianday(s.shipped_at)) * 24), 2) AS value
        FROM shipments s
        JOIN orders o ON o.id = s.order_id
        WHERE s.delivered_at IS NOT NULL
          AND s.shipped_at IS NOT NULL
        GROUP BY o.shipping_country
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['unresolved tickets by agent', 'open tickets by agent']):
        return f'''
        SELECT agent_name AS label,
               COUNT(*) AS value
        FROM support_tickets
        WHERE status IN ('Open', 'Pending')
        GROUP BY agent_name
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['tickets by status', 'support status breakdown']):
        return count_by_dimension('status', text, 'support_tickets', 'created_at')

    if contains_any(text, ['tickets by customer segment', 'support tickets by segment']):
        return f'''
        SELECT c.segment AS label,
               COUNT(t.id) AS value
        FROM support_tickets t
        JOIN customers c ON c.id = t.customer_id
        GROUP BY c.segment
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['tickets by country', 'support tickets by country']):
        return f'''
        SELECT c.country AS label,
               COUNT(t.id) AS value
        FROM support_tickets t
        JOIN customers c ON c.id = t.customer_id
        GROUP BY c.country
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['average ticket resolution by priority', 'resolution time by priority']):
        return f'''
        SELECT priority AS label,
               ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 24), 1) AS value
        FROM support_tickets
        WHERE resolved_at IS NOT NULL
        GROUP BY priority
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['returns by country', 'return volume by country']):
        return f'''
        SELECT o.shipping_country AS label,
               COUNT(r.id) AS value
        FROM returns r
        JOIN order_items oi ON oi.id = r.order_item_id
        JOIN orders o ON o.id = oi.order_id
        GROUP BY o.shipping_country
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['returns by customer segment', 'return volume by segment']):
        return f'''
        SELECT c.segment AS label,
               COUNT(r.id) AS value
        FROM returns r
        JOIN order_items oi ON oi.id = r.order_item_id
        JOIN orders o ON o.id = oi.order_id
        JOIN customers c ON c.id = o.customer_id
        GROUP BY c.segment
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['returned revenue by category', 'refund amount by category']):
        return f'''
        SELECT c.name AS label,
               ROUND(SUM(r.refund_amount), 2) AS value
        FROM returns r
        JOIN order_items oi ON oi.id = r.order_item_id
        JOIN products p ON p.id = oi.product_id
        JOIN categories c ON c.id = p.category_id
        GROUP BY c.name
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['new customers by month', 'customer signup trend', 'customer growth over time']):
        return trend_query(
            label_sql=MONTH_PATTERN.format(field='c.signup_date') if not contains_any(text, ['daily', 'per day']) else DAY_PATTERN.format(field='c.signup_date'),
            value_sql='COUNT(*)',
            from_sql='customers c',
            date_field='c.signup_date',
            text=text,
        )

    if contains_any(text, ['trend', 'over time', 'month over month', 'daily']) and contains_any(text, ['revenue', 'sales']):
        return trend_query(
            label_sql=MONTH_PATTERN.format(field='o.order_date') if not contains_any(text, ['daily', 'per day']) else DAY_PATTERN.format(field='o.order_date'),
            value_sql="ROUND(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 2)",
            from_sql='orders o LEFT JOIN payments pay ON pay.order_id = o.id',
            date_field='o.order_date',
            text=text,
        )

    if contains_any(text, ['trend', 'over time', 'month over month', 'daily']) and contains_any(text, ['orders', 'order', 'order count', 'order volume']):
        return trend_query(
            label_sql=MONTH_PATTERN.format(field='o.order_date') if not contains_any(text, ['daily', 'per day']) else DAY_PATTERN.format(field='o.order_date'),
            value_sql='COUNT(*)',
            from_sql='orders o',
            date_field='o.order_date',
            text=text,
        )

    if contains_any(text, ['compare countries', 'country comparison']):
        return revenue_by_dimension('o.shipping_country', text, 'orders o LEFT JOIN payments pay ON pay.order_id = o.id')

    if contains_any(text, ['compare categories', 'category comparison']):
        return f'''
        SELECT c.name AS label,
               ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100.0)), 2) AS value
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN categories c ON c.id = p.category_id
        GROUP BY c.name
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['highest revenue country', 'best country', 'top country by revenue']):
        return revenue_by_dimension('o.shipping_country', 'highest', 'orders o LEFT JOIN payments pay ON pay.order_id = o.id')

    if contains_any(text, ['lowest revenue country', 'worst country by revenue']):
        return revenue_by_dimension('o.shipping_country', 'lowest', 'orders o LEFT JOIN payments pay ON pay.order_id = o.id')

    if 'low stock' in text or 'inventory low' in text or 'running out of stock' in text:
        return f'''
        SELECT p.name AS label, p.stock AS value
        FROM products p
        ORDER BY value ASC, p.price DESC
        LIMIT {limit}
        '''

    if contains_any(text, ['inventory value', 'stock value']):
        return f'''
        SELECT c.name AS label,
               ROUND(SUM(p.stock * p.cost), 2) AS value
        FROM products p
        JOIN categories c ON c.id = p.category_id
        GROUP BY c.name
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['highest rated products', 'best rated products', 'top rated']):
        return f'''
        SELECT p.name AS label,
               ROUND(AVG(p.rating), 2) AS value
        FROM products p
        GROUP BY p.id, p.name
        ORDER BY value DESC
        LIMIT {limit}
        '''

    if contains_any(text, ['payment failure', 'failed payment', 'payment failed']):
        return count_by_dimension('payment_method', text, 'payments', 'paid_at')

    if contains_any(text, ['delayed shipments', 'late shipments', 'slow shipments']):
        return f'''
        SELECT carrier AS label,
               COUNT(*) AS value
        FROM shipments
        WHERE delivered_at IS NOT NULL
          AND shipped_at IS NOT NULL
          AND julianday(delivered_at) - julianday(shipped_at) > 5
        GROUP BY carrier
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['support tickets', 'tickets by', 'ticket volume']):
        if 'priority' in text:
            return count_by_dimension('priority', text, 'support_tickets', 'created_at')
        if 'agent' in text:
            return count_by_dimension('agent_name', text, 'support_tickets', 'created_at')
        return count_by_dimension('category', text, 'support_tickets', 'created_at')

    if contains_any(text, ['average resolution time', 'resolution time', 'resolve tickets']):
        return f'''
        SELECT category AS label,
               ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 24), 1) AS value
        FROM support_tickets
        WHERE resolved_at IS NOT NULL
        GROUP BY category
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['returns', 'returned products', 'refunds']):
        if 'reason' in text:
            return count_by_dimension('reason', text, 'returns', 'return_date')
        if 'category' in text:
            return f'''
            SELECT c.name AS label,
                   COUNT(r.id) AS value
            FROM returns r
            JOIN order_items oi ON oi.id = r.order_item_id
            JOIN products p ON p.id = oi.product_id
            JOIN categories c ON c.id = p.category_id
            GROUP BY c.name
            ORDER BY value {direction}
            LIMIT {limit}
            '''
        return f'''
        SELECT p.name AS label,
               COUNT(r.id) AS value
        FROM returns r
        JOIN order_items oi ON oi.id = r.order_item_id
        JOIN products p ON p.id = oi.product_id
        GROUP BY p.name
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['inactive customers', 'customers with no purchase', 'no purchase in']) or ('customers' in text and 'days' in text and 'purchase' in text):
        days_match = re.search(r'(\d{1,3})\s*day', text)
        days = int(days_match.group(1)) if days_match else 90
        return f'''
        SELECT c.name AS label,
               CAST(julianday('{REFERENCE_DATE}') - julianday(COALESCE(MAX(o.order_date), c.signup_date)) AS INTEGER) AS value
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        GROUP BY c.id, c.name, c.signup_date
        HAVING value >= {days}
        ORDER BY value DESC
        LIMIT {limit}
        '''

    if contains_any(text, ['top products', 'best selling products', 'products by revenue', 'products by quantity']):
        if contains_any(text, ['quantity', 'units', 'sold']):
            return f'''
            SELECT p.name AS label,
                   SUM(oi.quantity) AS value
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            GROUP BY p.id, p.name
            ORDER BY value {direction}
            LIMIT {limit}
            '''
        return f'''
        SELECT p.name AS label,
               ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100.0)), 2) AS value
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        GROUP BY p.id, p.name
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if (('payment' in text or 'payments' in text) and contains_any(text, ['top', 'highest'])) or contains_any(text, ['payments by amount']):
        return f'''
        SELECT 'Payment #' || id AS label,
               ROUND(amount, 2) AS value
        FROM payments
        WHERE status = 'paid'
        ORDER BY value DESC
        LIMIT {limit}
        '''

    if contains_any(text, ['top customers', 'top users', 'customers by spend', 'customers by revenue', 'customers by orders']):
        if contains_any(text, ['orders', 'order count']):
            return f'''
            SELECT c.name AS label,
                   COUNT(o.id) AS value
            FROM customers c
            JOIN orders o ON o.customer_id = c.id
            GROUP BY c.id, c.name
            ORDER BY value {direction}
            LIMIT {limit}
            '''
        return f'''
        SELECT c.name AS label,
               ROUND(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 2) AS value
        FROM customers c
        JOIN orders o ON o.customer_id = c.id
        LEFT JOIN payments pay ON pay.order_id = o.id
        GROUP BY c.id, c.name
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    if contains_any(text, ['average order value', 'aov']):
        if 'country' in text:
            return f'''
            SELECT shipping_country AS label,
                   ROUND(AVG(CASE WHEN pay.status = 'paid' THEN pay.amount END), 2) AS value
            FROM orders o
            LEFT JOIN payments pay ON pay.order_id = o.id
            GROUP BY shipping_country
            ORDER BY value {direction}
            LIMIT {limit}
            '''
        if 'channel' in text:
            return f'''
            SELECT channel AS label,
                   ROUND(AVG(CASE WHEN pay.status = 'paid' THEN pay.amount END), 2) AS value
            FROM orders o
            LEFT JOIN payments pay ON pay.order_id = o.id
            GROUP BY channel
            ORDER BY value {direction}
            LIMIT {limit}
            '''
        return "SELECT 'Average Order Value' AS label, ROUND(AVG(CASE WHEN status = 'paid' THEN amount END), 2) AS value FROM payments"

    if contains_any(text, ['revenue by', 'sales by', 'show me revenue', 'show revenue']):
        if 'country' in text:
            return revenue_by_dimension('o.shipping_country', text, 'orders o LEFT JOIN payments pay ON pay.order_id = o.id')
        if 'city' in text:
            return revenue_by_dimension('o.shipping_city', text, 'orders o LEFT JOIN payments pay ON pay.order_id = o.id')
        if 'category' in text:
            return f'''
            SELECT c.name AS label,
                   ROUND(SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100.0)), 2) AS value
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            JOIN categories c ON c.id = p.category_id
            GROUP BY c.name
            ORDER BY value {direction}
            LIMIT {limit}
            '''
        if 'payment' in text:
            return revenue_by_dimension('payment_method', text, 'payments pay', 'pay.paid_at')
        if 'channel' in text:
            return revenue_by_dimension('o.channel', text, 'orders o LEFT JOIN payments pay ON pay.order_id = o.id')
        if contains_any(text, ['month', 'monthly']):
            return trend_query(
                label_sql=MONTH_PATTERN.format(field='o.order_date'),
                value_sql="ROUND(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 2)",
                from_sql='orders o LEFT JOIN payments pay ON pay.order_id = o.id',
                date_field='o.order_date',
                text='monthly revenue trend',
            )
        if 'status' in text:
            return revenue_by_dimension('o.status', text, 'orders o LEFT JOIN payments pay ON pay.order_id = o.id')
        return "SELECT 'Total Revenue' AS label, ROUND(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 2) AS value FROM payments"

    if contains_any(text, ['orders by', 'order volume', 'order count']):
        if 'status' in text:
            return count_by_dimension('status', text, 'orders o')
        if 'channel' in text:
            return count_by_dimension('channel', text, 'orders o')
        if contains_any(text, ['month', 'monthly']):
            return trend_query(
                label_sql=MONTH_PATTERN.format(field='o.order_date'),
                value_sql='COUNT(*)',
                from_sql='orders o',
                date_field='o.order_date',
                text='monthly order trend',
            )

    if contains_any(text, ['customer segments', 'segment performance']):
        return f'''
        SELECT c.segment AS label,
               ROUND(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount ELSE 0 END), 2) AS value
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        LEFT JOIN payments pay ON pay.order_id = o.id
        GROUP BY c.segment
        ORDER BY value {direction}
        LIMIT {limit}
        '''

    return None


def generate_sql_with_llm(user_query, previous_sql=None, previous_error=None):
    live_schema_description = get_schema_description()
    repair_context = ''
    if previous_sql and previous_error:
        repair_context = f"""
The previous SQL failed.
Previous SQL:
{previous_sql}

Database error:
{previous_error}

Fix the SQL and return only the corrected query.
"""

    prompt = f"""
You are an expert SQLite SQL generator for an analytics dashboard.

Rules:
- Return ONLY SQL.
- Use SQLite syntax only.
- Generate exactly one read-only query.
- Use only SELECT or WITH ... SELECT.
- Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, PRAGMA, ATTACH, or DETACH.
- Use only tables and columns from the schema below.
- Prefer clear aliases.
- When the question is a ranking, comparison, count, or aggregate question, return two columns aliased exactly as label and value.
- When the user asks to list or inspect records, you may return multiple columns.
- Respect the user's requested limit if present; otherwise use LIMIT 10 for rankings and lists.
- If the user asks for a time window like last 30 days, last month, or this year, use the reference date '{REFERENCE_DATE}'.
- Use the live schema below as the source of truth.
- Never invent tables or columns.
- Prefer joining through documented foreign-key style relationships when possible.
- For analytics answers, produce result columns that the frontend can display directly.

Live SQLite schema:
{live_schema_description}

{LLM_SQL_EXAMPLES}

User question:
{user_query}

{repair_context}
"""
    raw_response = ask_llm(prompt)
    sql = extract_sql_candidate(raw_response)
    if not sql:
        raise ValueError('The local SQL model returned an empty response.')
    return sql


def has_limit(sql):
    return re.search(r'\blimit\s+\d+\b', sql, re.IGNORECASE) is not None


def add_default_limit(sql, limit=50):
    cleaned = clean_sql(sql)
    if has_limit(cleaned):
        return cleaned
    return f'{cleaned}\nLIMIT {limit}'


def referenced_tables(sql):
    table_names = set()
    for match in re.finditer(r'\b(?:from|join)\s+["`\[]?([A-Za-z_][A-Za-z0-9_]*)', sql, re.IGNORECASE):
        table_names.add(match.group(1))
    return table_names


def referenced_ctes(sql):
    if not sql.lower().lstrip().startswith('with'):
        return set()
    return set(re.findall(r'(?:with|,)\s+([A-Za-z_][A-Za-z0-9_]*)\s+as\s*\(', sql, re.IGNORECASE))


def extract_json_object(raw_text):
    cleaned = raw_text.strip().replace('```json', '').replace('```', '').strip()
    try:
        return json.loads(cleaned)
    except Exception:
        match = re.search(r'(\{.*\})', cleaned, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(1))


def fallback_query_intelligence(question, sql, columns, data):
    tables = sorted(referenced_tables(sql) - referenced_ctes(sql))
    row_count = len(data)
    visible_columns = columns[:6]
    metric_column = columns[1] if len(columns) > 1 else columns[0] if columns else 'value'
    numeric_values = []
    for row in data:
        if len(row) > 1 and isinstance(row[1], (int, float)):
            numeric_values.append(float(row[1]))

    top_label = str(data[0][0]) if data and data[0] else 'the leading row'
    top_value = numeric_values[0] if numeric_values else None
    total_value = sum(numeric_values) if numeric_values else None
    average_value = (total_value / len(numeric_values)) if numeric_values else None
    dominance = (top_value / total_value * 100) if top_value is not None and total_value else None
    spread = (max(numeric_values) / max(min([value for value in numeric_values if value > 0] or [1]), 1)) if numeric_values else None

    if dominance is not None and dominance >= 35:
        first_insight = (
            f"{top_label} is the clear concentration point: it contributes about {dominance:.1f}% "
            f"of the visible {metric_column}, so this result is not evenly distributed."
        )
    elif top_value is not None:
        first_insight = (
            f"{top_label} leads the result, but its share is not overwhelmingly dominant. "
            f"That suggests the {metric_column} is spread across multiple rows rather than depending on one outlier."
        )
    else:
        first_insight = (
            f"The query returned {row_count} row(s) across {', '.join(visible_columns)}, which makes this result better for inspection than a single KPI."
        )

    if spread is not None and spread >= 5:
        second_insight = (
            f"The gap between the strongest and weakest visible rows is wide, roughly {spread:.1f}x. "
            "That is a useful signal for prioritization because the lower-ranked rows behave materially differently."
        )
    elif average_value is not None:
        second_insight = (
            f"The average visible {metric_column} is about {average_value:,.2f}. "
            "Rows above that benchmark deserve attention first, while rows below it are candidates for comparison or cleanup."
        )
    else:
        second_insight = (
            f"The SQL touched {len(tables)} table(s), so the answer is coming from connected database relationships rather than a flat canned response."
        )

    if len(columns) > 2:
        third_insight = (
            f"This result includes extra context columns beyond the main label and metric: {', '.join(columns[2:5])}. "
            "Use the table view to compare those supporting signals before making a decision from the chart alone."
        )
    else:
        third_insight = (
            f"The SQL uses {', '.join(tables) if tables else 'the connected schema'} and returns a clean label-to-metric shape, "
            "so it is suitable for the bar chart and for saving as a reusable report."
        )

    return {
        'understood': f"QueryForge interpreted this as a read-only analytics request over {', '.join(tables) if tables else 'the connected database'}.",
        'tables_used': tables,
        'why': f"The generated SQL groups, filters, or ranks the result set and returned {row_count} row(s) with columns: {', '.join(visible_columns)}.",
        'confidence': 0.84 if row_count and tables else 0.68,
        'insights': [first_insight, second_insight, third_insight],
        'recommendation': (
            f"Turn this into a sharper follow-up by adding a time window, segment, status, or country. "
            f"For example: compare {metric_column} for the top rows by month, return status, or customer segment."
        )
    }


def build_query_intelligence(question, sql, columns, data):
    # Keep normal query responses fast. The local model is reserved for SQL generation
    # on unknown schemas and explicit on-demand scans, where the extra latency is worth it.
    intelligence = fallback_query_intelligence(question, sql, columns, data)
    intelligence['generated_by_model'] = False
    return intelligence


def scan_data_quality():
    schema = get_schema_map()
    tables = []
    findings = []

    for table_name, column_defs in schema.items():
        safe_table = table_name.replace('"', '""')
        count_columns, count_rows = run_query(f'SELECT COUNT(*) AS row_count FROM "{safe_table}"')
        row_count = int(count_rows[0][0]) if count_columns and count_rows else 0
        table_summary = {
            'table': table_name,
            'rows': row_count,
            'columns': len(column_defs),
            'checks': [],
        }

        for column in column_defs[:12]:
            column_name = column['name']
            safe_column = column_name.replace('"', '""')
            null_columns, null_rows = run_query(
                f'SELECT COUNT(*) FROM "{safe_table}" WHERE "{safe_column}" IS NULL OR CAST("{safe_column}" AS TEXT) = \'\''
            )
            missing_count = int(null_rows[0][0]) if null_columns and null_rows else 0
            if missing_count:
                message = f'{table_name}.{column_name} has {missing_count} missing value(s).'
                table_summary['checks'].append(message)
                findings.append(message)

            if any(token in (column.get('type') or '').upper() for token in ['INT', 'REAL', 'NUM', 'DEC', 'FLOAT']):
                stat_columns, stat_rows = run_query(
                    f'SELECT MIN("{safe_column}"), MAX("{safe_column}"), AVG("{safe_column}") FROM "{safe_table}" WHERE "{safe_column}" IS NOT NULL'
                )
                if stat_columns and stat_rows and stat_rows[0][0] is not None:
                    min_value, max_value, avg_value = stat_rows[0]
                    if isinstance(avg_value, (int, float)) and avg_value > 0 and isinstance(max_value, (int, float)) and max_value > avg_value * 8:
                        message = f'{table_name}.{column_name} has a high outlier: max {round(max_value, 2)} vs avg {round(avg_value, 2)}.'
                        table_summary['checks'].append(message)
                        findings.append(message)

        if not table_summary['checks']:
            table_summary['checks'].append('No obvious missing-value or numeric outlier issue found in sampled checks.')
        tables.append(table_summary)

    prompt = f"""
Summarize this SQLite data-quality scan for a dashboard. Return ONLY JSON:
{{"summary":"...", "risk_level":"low|medium|high", "next_actions":["...","...","..."]}}

Tables scanned:
{tables[:10]}

Findings:
{findings[:20]}
"""
    fallback = {
        'summary': f'Scanned {len(tables)} table(s) and found {len(findings)} quality signal(s).',
        'risk_level': 'medium' if findings else 'low',
        'next_actions': [
            'Review missing values in fields used for joins, grouping, and financial calculations.',
            'Inspect numeric outliers before trusting top-ranked charts.',
            'Run a focused query against any table flagged by the scanner.'
        ],
        'generated_by_model': False,
    }
    try:
        parsed = extract_json_object(ask_llm(prompt))
        fallback.update({
            'summary': str(parsed.get('summary') or fallback['summary']),
            'risk_level': str(parsed.get('risk_level') or fallback['risk_level']),
            'next_actions': [str(item) for item in parsed.get('next_actions', [])][:3] or fallback['next_actions'],
            'generated_by_model': True,
        })
    except Exception as exc:
        fallback['model_error'] = str(exc)

    return {
        'tables': tables,
        'findings': findings[:20],
        'ai_summary': fallback,
    }


def generate_sql(text):
    normalized_text = text.lower().strip()
    ai_first = should_use_ai_before_rules(normalized_text)

    if should_use_planner_before_rules(normalized_text):
        sql = generate_sql_from_planner(normalized_text)
        if sql:
            validate_sql(sql)
            columns, data = run_query(sql)
            if columns is not None:
                return sql

    if not ai_first:
        sql = generate_sql_from_rules(text)
        if sql:
            return sql

    if not looks_database_question(normalized_text):
        raise ValueError('Ask QueryForge about the database, such as customers, orders, products, payments, shipments, returns, tickets, or revenue.')

    sql = generate_sql_from_planner(normalized_text)
    if sql:
        validate_sql(sql)
        columns, data = run_query(sql)
        if columns is not None:
            return sql

    previous_sql = None
    previous_error = None

    for _ in range(2):
        try:
            sql = generate_sql_with_llm(text, previous_sql, previous_error)
            sql = add_default_limit(sql)
            validate_sql(sql)

            columns, data = run_query(sql)
            if columns is None:
                previous_sql = sql
                previous_error = data
                continue

            return sql
        except Exception as exc:
            previous_sql = previous_sql or sql if 'sql' in locals() else None
            previous_error = str(exc)

    try:
        raise ValueError(previous_error or 'The local SQL model could not generate a usable query.')
    except Exception as exc:
        raise ValueError(
            'QueryForge could not interpret that database question right now. Make sure your local model service is running on localhost:11434, then try again with the same question or a slightly clearer phrasing.'
        ) from exc


FORBIDDEN_SQL = ['insert ', 'update ', 'delete ', 'drop ', 'alter ', 'pragma ', 'attach ', 'detach ', 'create ']


def validate_sql(sql):
    lowered = sql.lower().strip()
    if not (lowered.startswith('select') or lowered.startswith('with')):
        raise ValueError('Only SELECT queries are allowed.')
    if any(keyword in lowered for keyword in FORBIDDEN_SQL):
        raise ValueError('Unsafe SQL was blocked.')
    if ';' in lowered[:-1]:
        raise ValueError('Multiple SQL statements are not allowed.')

    allowed_tables = get_allowed_tables()
    unknown_tables = referenced_tables(sql) - allowed_tables - referenced_ctes(sql)
    if unknown_tables:
        raise ValueError(f"Unknown table(s) blocked: {', '.join(sorted(unknown_tables))}")


@app.post('/query')
def query_api(req: QueryRequest):
    try:
        raw_sql = generate_sql(req.text)
        sql = clean_sql(raw_sql)
        validate_sql(sql)

        columns, data = run_query(sql)
        if columns is None:
            raise ValueError(data)

        intelligence = build_query_intelligence(req.text, sql, columns, data)

        return {
            'success': True,
            'sql': sql,
            'columns': columns,
            'data': data,
            'intelligence': intelligence,
            'report': {
                'title': req.text.strip()[:80] or 'Untitled query',
                'rows': len(data),
                'columns': len(columns),
                'model': OLLAMA_MODEL,
                'database': get_database_path(),
            },
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


@app.get('/database/status')
def database_status_api():
    try:
        schema = get_schema_map()
        return {
            'success': True,
            'path': get_database_path(),
            'schema': get_schema_description(),
            'tables': [
                {'name': table_name, 'columns': [column['name'] for column in columns]}
                for table_name, columns in schema.items()
            ],
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


@app.get('/model/status')
def model_status_api():
    try:
        schema = get_schema_map()
        return {
            'success': True,
            'model': OLLAMA_MODEL,
            'url': OLLAMA_URL,
            'database': get_database_path(),
            'tables': len(schema),
            'columns': sum(len(columns) for columns in schema.values()),
            'mode': 'Local Ollama SQL copilot with SQLite safety validation',
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


@app.get('/database/quality')
def database_quality_api():
    try:
        return {
            'success': True,
            **scan_data_quality(),
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


@app.get('/insights/forecast')
def insights_forecast_api():
    try:
        return {
            'success': True,
            'data': forecast_revenue(days=90),
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


@app.get('/insights/anomalies')
def insights_anomalies_api():
    try:
        return {
            'success': True,
            'data': detect_anomalies(),
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


@app.get('/insights/clusters')
def insights_clusters_api():
    try:
        return {
            'success': True,
            'data': cluster_users(),
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


@app.get('/insights/recommend')
def insights_recommend_api(user_id: int = 1):
    try:
        return {
            'success': True,
            'data': recommend_products(user_id),
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


@app.post('/database/connect')
def database_connect_api(req: ConnectDatabaseRequest):
    try:
        path = set_database_path(req.path)
        return {
            'success': True,
            'path': path,
            'schema': get_schema_description(),
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
        }


from collections import Counter


def _find_matching_lines(lines, patterns, limit=5):
    matched = []
    for line in lines:
        lowered = line.lower()
        if any(re.search(pattern, lowered) for pattern in patterns):
            matched.append(line.strip())
        if len(matched) >= limit:
            break
    return matched


def _status_from_logs(lines):
    signal_map = {
        'memory pressure': {
            'patterns': [r'out of memory', r'\boom\b', r'memoryerror', r'killed process', r'heap', r'cannot allocate memory'],
            'summary': 'The logs point to memory pressure or exhaustion inside the runtime.',
            'fixes': [
                'Inspect process memory usage and identify the worker or request path consuming unusually large memory.',
                'Reduce payload size, concurrency, batch size, or caching pressure to confirm whether the failures drop.',
                'Review recent code changes for leaks, unbounded collections, or oversized in-memory query results.',
            ],
        },
        'database/connectivity failures': {
            'patterns': [r'database.*timeout', r'db.*timeout', r'connection refused', r'connection reset', r'too many connections', r'could not connect', r'pool exhausted', r'sqlite.*locked', r'deadlock', r'lock wait timeout'],
            'summary': 'The logs point to database access problems such as timeouts, lock contention, or connection failures.',
            'fixes': [
                'Check whether the database is reachable, locked, overloaded, or hitting connection-pool limits.',
                'Inspect the exact query or transaction around the first failing database line.',
                'Correlate the incident with slow queries, spikes in concurrent traffic, or recent schema/config changes.',
            ],
        },
        'latency/performance degradation': {
            'patterns': [r'timeout', r'timed out', r'slow query', r'latency', r'took \d+ms', r'response time', r'deadline exceeded', r'slow request'],
            'summary': 'The logs show a slowdown pattern where requests or background work are taking too long to complete.',
            'fixes': [
                'Trace the slow request path and identify whether the delay begins in the app, database, or an upstream dependency.',
                'Compare slow and healthy requests in the same time window to isolate the bottleneck.',
                'Add targeted timing and tracing around external calls so the next incident exposes the delay source faster.',
            ],
        },
        'authentication/authorization problems': {
            'patterns': [r'\b401\b', r'\b403\b', r'unauthorized', r'forbidden', r'invalid token', r'token expired', r'permission denied', r'auth failed'],
            'summary': 'The logs indicate access control problems such as invalid credentials, expired tokens, or missing permissions.',
            'fixes': [
                'Validate tokens, credentials, role mappings, and service-to-service secrets.',
                'Check whether the issue started after a deployment, key rotation, or permission update.',
                'Compare one successful request with one failing request to isolate the missing authorization context.',
            ],
        },
        'application/server errors': {
            'patterns': [r'\b500\b', r'\b502\b', r'\b503\b', r'\b504\b', r'exception', r'traceback', r'stack trace', r'panic', r'fatal', r'error:'],
            'summary': 'The logs contain application-level failures, exceptions, or upstream server errors.',
            'fixes': [
                'Start with the first exception or server error in time order and treat later lines as possible downstream symptoms.',
                'Capture the full stack trace and correlate it with the request path or job execution path.',
                'Check for recent releases or config changes that align with the first failure timestamp.',
            ],
        },
        'network instability': {
            'patterns': [r'dns', r'host unreachable', r'network is unreachable', r'broken pipe', r'econnreset', r'socket hang up', r'connection timed out'],
            'summary': 'The logs suggest unstable network paths, name resolution problems, or broken connections between services.',
            'fixes': [
                'Check DNS resolution, firewall rules, service discovery, and network path stability between the affected services.',
                'Correlate the failures with infrastructure restarts, routing changes, or upstream outages.',
                'Retry the same failing connection from the same environment to confirm whether the issue is persistent or intermittent.',
            ],
        },
        'storage/disk saturation': {
            'patterns': [r'no space left on device', r'disk full', r'enospc', r'read-only file system', r'i/o error', r'filesystem full', r'disk quota exceeded'],
            'summary': 'The logs indicate storage pressure, disk exhaustion, or filesystem write failures.',
            'fixes': [
                'Check free disk space, inode usage, and whether the affected volume has switched to read-only mode.',
                'Identify the process or retention policy that caused the storage spike around the first failing line.',
                'Clear stale artifacts or rotate logs carefully, then confirm whether writes recover without new errors.',
            ],
        },
        'cache/session store failures': {
            'patterns': [r'redis', r'cache miss storm', r'cache connection failed', r'cache unavailable', r'session store', r'evicted', r'cache timeout'],
            'summary': 'The logs point to cache or session-store instability that may be amplifying load on the primary application path.',
            'fixes': [
                'Check whether the cache service is reachable, saturated, evicting aggressively, or timing out under load.',
                'Compare latency and error spikes with cache failures to see whether the app is falling back to slower paths.',
                'Review TTL, memory limits, and connection pool settings for the cache or session-store layer.',
            ],
        },
        'queue/backlog congestion': {
            'patterns': [r'backlog', r'queue depth', r'pending_jobs', r'job delayed', r'consumer lag', r'retry queue', r'dlq', r'dead letter'],
            'summary': 'The logs suggest queued work is backing up, retrying excessively, or falling behind available consumers.',
            'fixes': [
                'Measure queue depth, consumer lag, and worker throughput around the first congestion signal.',
                'Check whether a downstream dependency is slowing workers and causing retries or dead-letter growth.',
                'Temporarily scale consumers or reduce inflow to confirm whether the backlog drains as expected.',
            ],
        },
        'deployment/configuration regression': {
            'patterns': [r'unknown config', r'missing env', r'feature flag', r'config error', r'schema mismatch', r'migration', r'after deploy', r'rollback'],
            'summary': 'The logs look consistent with a deploy-time or configuration regression rather than a random runtime fault.',
            'fixes': [
                'Correlate the first failing line with the most recent deploy, config change, feature flag flip, or migration.',
                'Diff environment variables, secrets, and service configuration between the last good release and the failing one.',
                'If the issue is recent and isolated to a release window, validate with rollback or a targeted config revert.',
            ],
        },
        'third-party/payment gateway failures': {
            'patterns': [r'gateway timeout', r'payment provider', r'upstream rejected', r'webhook failed', r'rate limit exceeded', r'third[- ]party', r'provider unavailable', r'429'],
            'summary': 'The logs indicate failures from an external provider such as a payment gateway, webhook target, or other third-party dependency.',
            'fixes': [
                'Check the provider status, request quotas, and whether failures cluster around one endpoint or credential set.',
                'Inspect retries and fallback behavior so temporary provider errors do not cascade into application instability.',
                'Compare successful and failed outbound calls to identify payload, auth, or rate-limit differences.',
            ],
        },
    }

    scored_signals = []
    for label, config in signal_map.items():
        matches = _find_matching_lines(lines, config['patterns'])
        if matches:
            scored_signals.append({
                'label': label,
                'count': len(matches),
                'evidence': matches,
                'summary': config['summary'],
                'fixes': config['fixes'],
            })

    scored_signals.sort(key=lambda item: item['count'], reverse=True)
    return scored_signals


def _summarize_log_shape(lines):
    lowered = [line.lower() for line in lines]
    error_count = sum(1 for line in lowered if 'error' in line or 'exception' in line or 'traceback' in line)
    warn_count = sum(1 for line in lowered if 'warn' in line or 'warning' in line)
    info_count = sum(1 for line in lowered if 'info' in line)
    return error_count, warn_count, info_count


def _build_issue_paragraph(signal, total_lines):
    evidence_text = ' | '.join(signal['evidence'][:3])
    return (
        f"InfraSage found {signal['label']} in this log batch. "
        f"It scanned {total_lines} non-empty lines and matched {signal['count']} line(s) to that failure family. "
        f"{signal['summary']} Evidence from your pasted logs: {evidence_text}."
    )


def _incident_timeline(lines, scored_signals):
    first_signal = scored_signals[0] if scored_signals else None
    first_evidence = first_signal['evidence'][0] if first_signal and first_signal['evidence'] else lines[0]
    affected_service_match = re.search(r'\b(api|worker|scheduler|database|redis|payments|checkout|auth|gateway|frontend|backend)[-_a-z0-9]*\b', first_evidence.lower())
    affected_service = affected_service_match.group(0) if affected_service_match else 'unknown service'
    severity = 'high' if first_signal and any(word in first_signal['label'] for word in ['memory', 'database', 'application', 'storage']) else 'medium' if first_signal else 'low'
    root_cause = first_signal['summary'] if first_signal else 'No dominant failure family was detected from the pasted log slice.'

    return {
        'severity': severity,
        'affected_service': affected_service,
        'root_cause': root_cause,
        'timeline': [
            {
                'stage': 'First evidence',
                'detail': first_evidence[:240],
            },
            {
                'stage': 'Dominant signal',
                'detail': first_signal['label'] if first_signal else 'No known high-confidence signature matched.',
            },
            {
                'stage': 'Recommended next move',
                'detail': first_signal['fixes'][0] if first_signal else 'Paste a wider log window with timestamps and service names.',
            },
        ],
    }


def analyze_logs(logs):
    raw_lines = [line.rstrip() for line in logs.splitlines() if line.strip()]
    if not raw_lines:
        return {
            'issues': [
                'No log content was provided, so there is nothing to analyze. Paste application, server, database, or container logs into InfraSage and it will inspect the actual lines you provide.',
                'Because the input is empty, there is no evidence to correlate across timestamps, services, or error signatures. InfraSage needs raw log lines to determine whether the problem is caused by memory pressure, connectivity failures, slow requests, crashes, or authentication issues.',
                'The immediate next step is to rerun the failing action and paste the relevant log window, ideally including the first error, the lines immediately before it, and any stack trace or timeout message that follows.'
            ],
            'suggested_fixes': [
                'Paste the real failing log lines, not a summary.',
                'Include 30 to 100 lines around the first visible error.',
                'Include timestamps, status codes, and stack traces if available.'
            ],
            'severity': 'low',
            'affected_service': 'unknown service',
            'root_cause': 'No log content was provided.',
            'timeline': [
                {'stage': 'Input received', 'detail': 'InfraSage received an empty log payload.'},
                {'stage': 'Analysis blocked', 'detail': 'No evidence lines are available to classify.'},
                {'stage': 'Next move', 'detail': 'Paste real log lines around the first visible failure.'},
            ],
        }

    scored_signals = _status_from_logs(raw_lines)
    total_lines = len(raw_lines)
    error_count, warn_count, info_count = _summarize_log_shape(raw_lines)

    if scored_signals:
        issues = [_build_issue_paragraph(signal, total_lines) for signal in scored_signals[:3]]
        suggested_fixes = []
        for signal in scored_signals[:3]:
            for fix in signal['fixes']:
                if fix not in suggested_fixes:
                    suggested_fixes.append(fix)

        suggested_fixes.extend([
            'Start with the earliest matching line for the dominant failure family rather than the last repeated error.',
            'Keep the exact evidence lines and timestamps so you can correlate them with deploys, metrics, and traces.',
            'If this signature repeats often, add an alert on the first matching error pattern instead of waiting for the full cascade.',
        ])

        return {
            'issues': issues[:3],
            'suggested_fixes': suggested_fixes[:6],
            **_incident_timeline(raw_lines, scored_signals),
        }

    sample_lines = ' | '.join(raw_lines[:3])
    issues = [
        (
            f"InfraSage did not find a strong known failure signature in these {total_lines} non-empty lines, "
            f"so it is avoiding a fake diagnosis. The log mix here looks like {error_count} error line(s), "
            f"{warn_count} warning line(s), and {info_count} info line(s)."
        ),
        (
            f"The first visible evidence in the pasted logs is: {sample_lines}. "
            f"That suggests the next step should come from the exact service names, status codes, timestamps, or stack-trace context in those lines rather than a canned issue label."
        ),
        (
            "Because no dominant signature was matched, the safest reading is that these logs may be informational, incomplete, or too short around the failure window. "
            "Paste a slightly wider slice around the first suspicious line so InfraSage can distinguish between app errors, auth issues, timeouts, network faults, and database failures."
        ),
    ]
    suggested_fixes = [
        'Paste 30 to 100 lines around the first suspicious event instead of a very short excerpt.',
        'Include timestamps, service names, status codes, and any stack trace lines that appear nearby.',
        'Prefer the earliest failing line over later repeated symptoms when choosing what to paste.',
        'If the logs came from multiple services, include the matching time window from each service.',
        'If this happened after a deploy or config change, include the exact time of that change with the logs.',
        'If there is still no clear signature, pair the logs with a failing request path or job name for better correlation.',
    ]
    return {
        'issues': issues,
        'suggested_fixes': suggested_fixes[:6],
        **_incident_timeline(raw_lines, scored_signals),
    }


@app.post('/logs')
def logs_api(req: LogRequest):
    try:
        analysis = analyze_logs(req.logs)
        return {
            'success': True,
            'analysis': analysis
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
