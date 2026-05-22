import math
import sqlite3
from datetime import timedelta

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler

try:
    from prophet import Prophet
except Exception:
    Prophet = None

from db import get_database_path


def _connect():
    return sqlite3.connect(get_database_path())


def _round(value, digits=2):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return 0
    return round(float(value), digits)


def forecast_revenue(days=90):
    conn = _connect()
    try:
        df = pd.read_sql_query(
            """
            SELECT date AS ds, SUM(amount) AS y
            FROM orders
            WHERE status = 'completed'
            GROUP BY date
            ORDER BY date
            """,
            conn,
        )
    finally:
        conn.close()

    if df.empty:
        return {"historical": [], "forecast": []}

    df["ds"] = pd.to_datetime(df["ds"])
    historical = [{"date": row.ds.strftime("%Y-%m-%d"), "revenue": _round(row.y)} for row in df.itertuples()]

    if len(df) < 14 or Prophet is None:
        recent = df.tail(min(30, len(df)))
        avg = float(recent["y"].mean()) if not recent.empty else 0
        std = float(recent["y"].std() or avg * 0.12 or 1)
        last_date = df["ds"].max()
        forecast = []
        for index in range(1, days + 1):
            seasonal = 1 + 0.08 * math.sin(index / 9)
            predicted = max(avg * seasonal, 0)
            forecast.append(
                {
                    "date": (last_date + timedelta(days=index)).strftime("%Y-%m-%d"),
                    "predicted": _round(predicted),
                    "lower": _round(max(predicted - std, 0)),
                    "upper": _round(predicted + std),
                }
            )
        return {"historical": historical, "forecast": forecast}

    model = Prophet(interval_width=0.8, daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=True)
    model.fit(df.rename(columns={"ds": "ds", "y": "y"}))
    future = model.make_future_dataframe(periods=days)
    prediction = model.predict(future).tail(days)
    forecast = [
        {
            "date": row.ds.strftime("%Y-%m-%d"),
            "predicted": _round(max(row.yhat, 0)),
            "lower": _round(max(row.yhat_lower, 0)),
            "upper": _round(max(row.yhat_upper, 0)),
        }
        for row in prediction.itertuples()
    ]
    return {"historical": historical, "forecast": forecast}


def detect_anomalies():
    conn = _connect()
    try:
        orders = pd.read_sql_query("SELECT id, user_id, amount, quantity, date FROM orders", conn)
        logs = pd.read_sql_query("SELECT id, service, message, timestamp, response_time_ms, level FROM logs", conn)
    finally:
        conn.close()

    anomalous_orders = []
    anomalous_logs = []

    if len(orders) >= 20:
        features = orders[["amount", "quantity"]].fillna(0)
        labels = IsolationForest(contamination=0.05, random_state=42).fit_predict(features)
        flagged = orders[labels == -1].sort_values("amount", ascending=False).head(20)
        for row in flagged.itertuples():
            reason = "unusually high amount" if row.amount >= orders["amount"].quantile(0.95) else "unusual amount/quantity combination"
            anomalous_orders.append({"id": int(row.id), "user_id": int(row.user_id), "amount": _round(row.amount), "date": row.date, "reason": reason})

    if len(logs) >= 20:
        log_features = logs[["response_time_ms"]].fillna(0)
        labels = IsolationForest(contamination=0.05, random_state=42).fit_predict(log_features)
        flagged_logs = logs[(labels == -1) | (logs["level"].isin(["ERROR", "CRITICAL"]))].sort_values("response_time_ms", ascending=False).head(20)
        for row in flagged_logs.itertuples():
            anomalous_logs.append({"id": int(row.id), "service": row.service, "message": row.message, "timestamp": row.timestamp})

    return {
        "anomalous_orders": anomalous_orders,
        "anomalous_logs": anomalous_logs,
        "total_anomalies": len(anomalous_orders) + len(anomalous_logs),
    }


def cluster_users():
    conn = _connect()
    try:
        df = pd.read_sql_query(
            """
            SELECT
                u.id,
                u.name,
                u.signup_date,
                COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END), 0) AS total_spend,
                COUNT(o.id) AS order_count,
                COALESCE(AVG(s.duration_seconds), 0) AS avg_session_duration,
                COALESCE(AVG(s.pages_visited), 0) AS pages_visited
            FROM users u
            LEFT JOIN orders o ON o.user_id = u.id
            LEFT JOIN sessions s ON s.user_id = u.id
            GROUP BY u.id, u.name, u.signup_date
            """,
            conn,
        )
    finally:
        conn.close()

    if df.empty:
        return {"clusters": []}

    df["signup_date"] = pd.to_datetime(df["signup_date"])
    df["days_since_signup"] = (pd.Timestamp("2025-01-01") - df["signup_date"]).dt.days.clip(lower=1)
    features = df[["total_spend", "order_count", "avg_session_duration", "pages_visited", "days_since_signup"]].fillna(0)

    if len(df) < 4:
        return {"clusters": [{"label": "New Users", "count": int(len(df)), "avg_spend": _round(df["total_spend"].mean()), "users": df["name"].head(5).tolist()}]}

    scaled = StandardScaler().fit_transform(features)
    df["cluster"] = KMeans(n_clusters=4, random_state=42, n_init=10).fit_predict(scaled)
    summaries = []
    raw = []

    for cluster_id, group in df.groupby("cluster"):
        avg_spend = float(group["total_spend"].mean())
        avg_orders = float(group["order_count"].mean())
        avg_signup_age = float(group["days_since_signup"].mean())
        raw.append((cluster_id, avg_spend, avg_orders, avg_signup_age, group))

    spend_ranked = sorted(raw, key=lambda item: item[1], reverse=True)
    age_ranked = sorted(raw, key=lambda item: item[3])
    labels = {}
    labels[spend_ranked[0][0]] = "Champions"
    labels[spend_ranked[-1][0]] = "Hibernating"
    labels[age_ranked[0][0]] = "New Users"
    for cluster_id, *_ in raw:
        labels.setdefault(cluster_id, "At Risk")

    for cluster_id, avg_spend, _, _, group in raw:
        top_users = group.sort_values("total_spend", ascending=False)["name"].head(5).tolist()
        summaries.append({"label": labels[cluster_id], "count": int(len(group)), "avg_spend": _round(avg_spend), "users": top_users})

    return {"clusters": sorted(summaries, key=lambda item: ["Champions", "At Risk", "New Users", "Hibernating"].index(item["label"]) if item["label"] in ["Champions", "At Risk", "New Users", "Hibernating"] else 9)}


def recommend_products(user_id):
    conn = _connect()
    try:
        users = pd.read_sql_query("SELECT id, name FROM users", conn)
        products = pd.read_sql_query("SELECT id, name, category, price FROM products", conn)
        orders = pd.read_sql_query("SELECT user_id, product_id, quantity FROM orders WHERE status = 'completed'", conn)
    finally:
        conn.close()

    user_match = users[users["id"] == int(user_id)]
    if user_match.empty:
        raise ValueError(f"User {user_id} was not found.")
    user_name = user_match.iloc[0]["name"]

    if orders.empty or products.empty:
        return {"user": user_name, "recommendations": []}

    matrix = orders.pivot_table(index="user_id", columns="product_id", values="quantity", aggfunc="sum", fill_value=0)
    if int(user_id) not in matrix.index:
        popular_ids = orders.groupby("product_id")["quantity"].sum().sort_values(ascending=False).head(5).index.tolist()
        recs = products[products["id"].isin(popular_ids)]
        return {"user": user_name, "recommendations": [{"product_name": row.name, "category": row.category, "price": _round(row.price), "score": 0.5} for row in recs.itertuples()]}

    similarities = cosine_similarity(matrix)
    user_position = list(matrix.index).index(int(user_id))
    similar_scores = pd.Series(similarities[user_position], index=matrix.index).drop(index=int(user_id), errors="ignore")
    similar_users = similar_scores.sort_values(ascending=False).head(12)

    weighted = matrix.loc[similar_users.index].T.dot(similar_users)
    already_bought = set(matrix.loc[int(user_id)][matrix.loc[int(user_id)] > 0].index)
    weighted = weighted.drop(index=list(already_bought), errors="ignore").sort_values(ascending=False).head(5)
    max_score = float(weighted.max()) if len(weighted) and weighted.max() else 1

    recommendations = []
    for product_id, score in weighted.items():
        product = products[products["id"] == product_id].iloc[0]
        recommendations.append({"product_name": product["name"], "category": product["category"], "price": _round(product["price"]), "score": _round(float(score) / max_score, 3)})

    return {"user": user_name, "recommendations": recommendations}
