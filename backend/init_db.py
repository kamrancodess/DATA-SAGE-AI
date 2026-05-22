import os
import random
import sqlite3
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "data.db")

FIRST_NAMES = [
    "Aarav", "Vivaan", "Ishaan", "Rohan", "Ananya", "Diya", "Meera", "Priya",
    "John", "David", "Emma", "Olivia", "Liam", "Noah", "Sophia", "Mia",
    "Lukas", "Mila", "Hannah", "Noemi", "Mateo", "Sofia", "Carlos", "Lucia",
    "Yuki", "Hana", "Kenji", "Aiko", "Fatima", "Omar", "Layla", "Zoya",
]

LAST_NAMES = [
    "Sharma", "Patel", "Khan", "Rao", "Mehta", "Iyer", "Singh", "Nair",
    "Smith", "Johnson", "Brown", "Wilson", "Taylor", "Davis", "Clark", "Baker",
    "Muller", "Schmidt", "Fischer", "Weber", "Garcia", "Lopez", "Martinez", "Santos",
    "Tanaka", "Sato", "Suzuki", "Kobayashi", "Haddad", "Rahman", "Nasser", "Ali",
]

COUNTRIES = {
    "India": ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai"],
    "United States": ["New York", "Austin", "Seattle", "Chicago", "San Francisco"],
    "United Kingdom": ["London", "Manchester", "Bristol", "Leeds"],
    "Germany": ["Berlin", "Munich", "Hamburg", "Frankfurt"],
    "Canada": ["Toronto", "Vancouver", "Montreal", "Calgary"],
    "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth"],
    "Singapore": ["Singapore"],
    "Japan": ["Tokyo", "Osaka", "Kyoto"],
}

PLANS = ["free", "pro", "enterprise"]
USER_STATUSES = ["active", "churned"]
PRODUCT_CATEGORIES = ["Electronics", "SaaS", "Clothing", "Food", "Books"]
ORDER_STATUSES = ["completed", "refunded", "pending"]
DEVICES = ["mobile", "desktop", "tablet"]
EVENT_TYPES = ["signup", "purchase", "login", "logout", "upgrade", "cancel"]
LOG_LEVELS = ["INFO", "WARN", "ERROR", "CRITICAL"]
SERVICES = ["api", "database", "auth", "payment", "cache"]
CHANNELS = ["Web", "Mobile App", "Marketplace", "Sales Team"]
PAYMENT_METHODS = ["Credit Card", "UPI", "PayPal", "Bank Transfer", "Wallet"]
CARRIERS = ["DHL", "FedEx", "BlueDart", "UPS", "Delhivery"]
SUPPLIERS = ["Nova Supply", "BrightSource", "EverPeak", "Northwind", "Prime Axis"]

PRODUCT_NAMES = {
    "Electronics": ["4K Monitor", "Wireless Earbuds", "Smartwatch", "USB-C Hub", "Mechanical Keyboard", "Bluetooth Speaker", "Webcam Pro", "Tablet Stand", "Laptop Sleeve", "Portable SSD"],
    "SaaS": ["Analytics Pro", "CRM Studio", "Workflow Cloud", "Security Suite", "Billing Automator", "Support Desk", "Data Sync", "Campaign Pilot", "AI Notes", "Team Wiki"],
    "Clothing": ["Classic Hoodie", "Running Shoes", "Denim Jacket", "Formal Shirt", "Travel Backpack", "Cotton T-Shirt", "Sunglasses", "Leather Belt", "Rain Jacket", "Training Shorts"],
    "Food": ["Protein Bars", "Organic Coffee", "Trail Mix", "Green Tea", "Granola Pack", "Olive Oil", "Pasta Kit", "Dark Chocolate", "Energy Drink", "Spice Box"],
    "Books": ["Data Strategy", "Python Handbook", "Startup Playbook", "Design Systems", "AI Operations", "Product Thinking", "Finance Basics", "Cloud Patterns", "Deep Workflows", "Marketing Maps"],
}

PRICE_RANGES = {
    "Electronics": (35, 420),
    "SaaS": (19, 299),
    "Clothing": (18, 160),
    "Food": (8, 65),
    "Books": (12, 80),
}


def random_date(start, end):
    delta = end - start
    return start + timedelta(days=random.randint(0, delta.days), seconds=random.randint(0, 86399))


def weighted_date_2023_2024():
    # Revenue story: Q4 2024 gets more traffic/orders.
    if random.random() < 0.34:
        return random_date(datetime(2024, 10, 1), datetime(2024, 12, 31))
    if random.random() < 0.58:
        return random_date(datetime(2024, 1, 1), datetime(2024, 9, 30))
    return random_date(datetime(2023, 1, 1), datetime(2023, 12, 31))


def create_schema(cursor):
    cursor.executescript(
        """
        DROP VIEW IF EXISTS customers;
        DROP TABLE IF EXISTS support_tickets;
        DROP TABLE IF EXISTS returns;
        DROP TABLE IF EXISTS shipments;
        DROP TABLE IF EXISTS payments;
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS logs;
        DROP TABLE IF EXISTS events;
        DROP TABLE IF EXISTS sessions;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS categories;
        DROP TABLE IF EXISTS users;

        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            country TEXT NOT NULL,
            city TEXT NOT NULL,
            age INTEGER NOT NULL,
            signup_date TEXT NOT NULL,
            plan TEXT NOT NULL,
            status TEXT NOT NULL,
            segment TEXT NOT NULL
        );

        CREATE TABLE categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            cost_price REAL NOT NULL,
            stock INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            supplier TEXT NOT NULL,
            cost REAL NOT NULL,
            rating REAL NOT NULL,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        );

        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            quantity INTEGER NOT NULL,
            status TEXT NOT NULL,
            date TEXT NOT NULL,
            order_date TEXT NOT NULL,
            country TEXT NOT NULL,
            channel TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            shipping_country TEXT NOT NULL,
            shipping_city TEXT NOT NULL,
            discount_amount REAL NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE order_items (
            id INTEGER PRIMARY KEY,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            discount REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE payments (
            id INTEGER PRIMARY KEY,
            order_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            paid_at TEXT NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );

        CREATE TABLE shipments (
            id INTEGER PRIMARY KEY,
            order_id INTEGER NOT NULL,
            carrier TEXT NOT NULL,
            shipped_at TEXT,
            delivered_at TEXT,
            status TEXT NOT NULL,
            shipping_cost REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );

        CREATE TABLE returns (
            id INTEGER PRIMARY KEY,
            order_item_id INTEGER NOT NULL,
            reason TEXT NOT NULL,
            return_date TEXT NOT NULL,
            status TEXT NOT NULL,
            refund_amount REAL NOT NULL,
            FOREIGN KEY (order_item_id) REFERENCES order_items(id)
        );

        CREATE TABLE support_tickets (
            id INTEGER PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            resolved_at TEXT,
            agent_name TEXT NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES users(id)
        );

        CREATE TABLE sessions (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            duration_seconds INTEGER NOT NULL,
            pages_visited INTEGER NOT NULL,
            device TEXT NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE events (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            metadata TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE logs (
            id INTEGER PRIMARY KEY,
            level TEXT NOT NULL,
            service TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            response_time_ms INTEGER NOT NULL
        );

        CREATE VIEW customers AS
            SELECT id, name, email, country, city, segment, signup_date FROM users;
        """
    )


def seed_users(cursor):
    users = []
    for user_id in range(1, 501):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        country = random.choice(list(COUNTRIES.keys()))
        city = random.choice(COUNTRIES[country])
        plan = random.choices(PLANS, weights=[52, 34, 14], k=1)[0]
        churn_probability = 0.28 if plan == "free" else 0.16 if plan == "pro" else 0.08
        status = "churned" if random.random() < churn_probability else "active"
        segment = "Enterprise" if plan == "enterprise" else "SMB" if plan == "pro" else random.choice(["Consumer", "Startup"])
        signup_date = random_date(datetime(2023, 1, 1), datetime(2024, 12, 15)).strftime("%Y-%m-%d")
        users.append((
            user_id,
            f"{first} {last}",
            f"{first.lower()}.{last.lower()}{user_id}@example.com",
            country,
            city,
            random.randint(18, 68),
            signup_date,
            plan,
            status,
            segment,
        ))

    cursor.executemany(
        "INSERT INTO users (id, name, email, country, city, age, signup_date, plan, status, segment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        users,
    )
    return users


def seed_products(cursor):
    categories = [(index + 1, name) for index, name in enumerate(PRODUCT_CATEGORIES)]
    cursor.executemany("INSERT INTO categories (id, name) VALUES (?, ?)", categories)

    products = []
    product_id = 1
    for category_id, category in categories:
        low, high = PRICE_RANGES[category]
        for name in PRODUCT_NAMES[category]:
            price = round(random.uniform(low, high), 2)
            cost_price = round(price * random.uniform(0.38, 0.72), 2)
            products.append((
                product_id,
                name,
                category,
                price,
                cost_price,
                random.randint(15, 900),
                category_id,
                random.choice(SUPPLIERS),
                cost_price,
                round(random.uniform(3.4, 4.9), 1),
            ))
            product_id += 1

    cursor.executemany(
        "INSERT INTO products (id, name, category, price, cost_price, stock, category_id, supplier, cost, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        products,
    )
    return products


def seed_orders(cursor, users, products):
    orders = []
    order_items = []
    payments = []
    shipments = []
    returns = []
    tickets = []
    return_reasons = ["Damaged", "Wrong Size", "Not As Expected", "Late Delivery", "Changed Mind"]

    product_weights = []
    for product in products:
        category = product[2]
        product_weights.append({"Electronics": 1.5, "SaaS": 1.35, "Clothing": 1.05, "Food": 0.85, "Books": 0.75}[category])

    for order_id in range(1, 5001):
        user = random.choice(users)
        product = random.choices(products, weights=product_weights, k=1)[0]
        order_dt = weighted_date_2023_2024()
        quantity = random.randint(1, 4 if product[2] != "SaaS" else 2)
        discount = random.choice([0, 0, 0, 5, 10, 15, 20])
        amount = round(product[3] * quantity * (1 - discount / 100), 2)
        status = random.choices(ORDER_STATUSES, weights=[78, 9, 13], k=1)[0]
        channel = random.choices(CHANNELS, weights=[44, 28, 18, 10], k=1)[0]
        payment_method = random.choice(PAYMENT_METHODS)
        city = user[4]
        country = user[3]

        orders.append((order_id, user[0], user[0], product[0], amount, quantity, status, order_dt.strftime("%Y-%m-%d"), order_dt.strftime("%Y-%m-%d %H:%M:%S"), country, channel, payment_method, country, city, discount))
        order_items.append((order_id, order_id, product[0], quantity, product[3], discount))

        payment_status = "paid" if status == "completed" else "failed" if status == "pending" and random.random() < 0.4 else "pending" if status == "pending" else "paid"
        payments.append((order_id, order_id, amount, payment_status, payment_method, (order_dt + timedelta(minutes=random.randint(2, 240))).strftime("%Y-%m-%d %H:%M:%S")))

        shipped_at = order_dt + timedelta(days=random.randint(1, 4)) if status != "pending" else None
        delivered_at = shipped_at + timedelta(days=random.randint(2, 8)) if shipped_at and status == "completed" else None
        shipment_status = "Delivered" if status == "completed" else "Returned" if status == "refunded" else "Pending"
        shipments.append((order_id, order_id, random.choice(CARRIERS), shipped_at.strftime("%Y-%m-%d %H:%M:%S") if shipped_at else None, delivered_at.strftime("%Y-%m-%d %H:%M:%S") if delivered_at else None, shipment_status, round(random.uniform(3.5, 35.0), 2)))

        if status == "refunded":
            returns.append((len(returns) + 1, order_id, random.choice(return_reasons), (order_dt + timedelta(days=random.randint(4, 35))).strftime("%Y-%m-%d"), "approved", round(amount * random.uniform(0.65, 1.0), 2)))

        if random.random() < (0.32 if status in {"refunded", "pending"} else 0.16):
            created_at = order_dt + timedelta(days=random.randint(0, 20))
            resolved = random.random() < 0.72
            tickets.append((len(tickets) + 1, user[0], random.choice(["Billing", "Shipping", "Product", "Returns", "Technical"]), random.choice(["Low", "Medium", "High", "Critical"]), "Resolved" if resolved else random.choice(["Open", "Pending"]), created_at.strftime("%Y-%m-%d %H:%M:%S"), (created_at + timedelta(hours=random.randint(4, 96))).strftime("%Y-%m-%d %H:%M:%S") if resolved else None, random.choice(["Maya", "Arjun", "Lina", "Carlos", "Fatima", "Ibrahim"])))

    cursor.executemany("INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", orders)
    cursor.executemany("INSERT INTO order_items VALUES (?, ?, ?, ?, ?, ?)", order_items)
    cursor.executemany("INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?)", payments)
    cursor.executemany("INSERT INTO shipments VALUES (?, ?, ?, ?, ?, ?, ?)", shipments)
    cursor.executemany("INSERT INTO returns VALUES (?, ?, ?, ?, ?, ?)", returns)
    cursor.executemany("INSERT INTO support_tickets VALUES (?, ?, ?, ?, ?, ?, ?, ?)", tickets)


def seed_sessions_events_logs(cursor, users):
    sessions = []
    events = []
    logs = []

    for session_id in range(1, 3001):
        user = random.choice(users)
        session_dt = weighted_date_2023_2024()
        device = random.choices(DEVICES, weights=[52, 36, 12], k=1)[0]
        pages = random.randint(1, 18)
        duration = random.randint(20, 1800) + pages * random.randint(8, 45)
        sessions.append((session_id, user[0], duration, pages, device, session_dt.strftime("%Y-%m-%d")))

    for event_id in range(1, 10001):
        user = random.choice(users)
        event_type = random.choices(EVENT_TYPES, weights=[5, 38, 34, 13, 6, 4], k=1)[0]
        event_dt = weighted_date_2023_2024()
        metadata = f'{{"source":"{random.choice(["web", "mobile", "email", "ads"])}","plan":"{user[7]}"}}'
        events.append((event_id, user[0], event_type, event_dt.strftime("%Y-%m-%d %H:%M:%S"), metadata))

    messages = {
        "INFO": ["request completed", "cache hit", "payment webhook processed", "login accepted", "query completed"],
        "WARN": ["slow request detected", "cache miss storm", "retrying upstream call", "high queue depth", "token near expiry"],
        "ERROR": ["database timeout while fetching dashboard", "payment provider rejected request", "auth token expired", "cache connection failed", "upstream 503 response"],
        "CRITICAL": ["database pool exhausted", "payment gateway outage", "cache cluster unavailable", "critical auth failure", "api worker out of memory"],
    }
    for log_id in range(1, 2001):
        level = random.choices(LOG_LEVELS, weights=[62, 22, 13, 3], k=1)[0]
        service = random.choice(SERVICES)
        timestamp = weighted_date_2023_2024()
        response_time = int(max(20, random.gauss(140, 70)))
        if level == "WARN":
            response_time += random.randint(300, 900)
        elif level == "ERROR":
            response_time += random.randint(800, 2500)
        elif level == "CRITICAL":
            response_time += random.randint(2500, 6000)
        logs.append((log_id, level, service, random.choice(messages[level]), timestamp.strftime("%Y-%m-%d %H:%M:%S"), response_time))

    cursor.executemany("INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?)", sessions)
    cursor.executemany("INSERT INTO events VALUES (?, ?, ?, ?, ?)", events)
    cursor.executemany("INSERT INTO logs VALUES (?, ?, ?, ?, ?, ?)", logs)


def init_db(db_path=DB_PATH, seed=42):
    random.seed(seed)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    create_schema(cursor)
    users = seed_users(cursor)
    products = seed_products(cursor)
    seed_orders(cursor, users, products)
    seed_sessions_events_logs(cursor, users)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Database created with 500 users, 50 products, 5000 orders, 3000 sessions, 10000 events, and 2000 logs.")
