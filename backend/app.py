import streamlit as st
import pandas as pd
import re
import requests
from streamlit_lottie import st_lottie
import plotly.express as px

from modules.queryforge import generate_sql
from modules.infrasage import analyze_logs
from db import run_query

# ---------- CSS (DARK + GLOW UI) ----------
st.markdown("""
<style>

/* Background */
.stApp {
    background-color: #0e1117;
    color: white;
}

/* Input */
input {
    background-color: #1e1e2f !important;
    color: white !important;
    border-radius: 10px !important;
    border: 1px solid #4CAF50 !important;
}

/* Buttons */
button {
    border-radius: 10px !important;
    background: linear-gradient(90deg, #4CAF50, #00c6ff) !important;
    color: white !important;
    font-weight: bold !important;
}

/* Tabs */
div[data-baseweb="tab"] {
    font-size: 18px !important;
}

/* Glow cards */
.glow-card {
    padding: 20px;
    border-radius: 15px;
    background: linear-gradient(145deg, #1e1e2f, #111);
    box-shadow: 0 0 20px rgba(0,255,255,0.2);
    margin-bottom: 20px;
}

/* Footer */
.footer {
    text-align: center;
    color: gray;
    margin-top: 20px;
}

</style>
""", unsafe_allow_html=True)

# ---------- LOTTIE ----------
def load_lottie(url):
    return requests.get(url).json()

lottie_ai = load_lottie("https://assets2.lottiefiles.com/packages/lf20_kyu7xb1v.json")

# ---------- PAGE ----------
st.set_page_config(page_title="DataSage AI", layout="wide")

# ---------- TITLE ----------
st.markdown("""
<h1 style='text-align: center; 
background: linear-gradient(90deg, #4CAF50, #00c6ff); 
-webkit-background-clip: text; 
-webkit-text-fill-color: transparent;'>
🧠 DataSage AI
</h1>
<p style='text-align: center; color: gray;'>AI-Powered Data Intelligence Platform</p>
<hr>
""", unsafe_allow_html=True)

# ---------- ANIMATION ----------
st_lottie(lottie_ai, height=200)

# ---------- TABS ----------
tab1, tab2 = st.tabs(["🟦 QueryForge (SQL)", "🟥 InfraSage (Logs)"])

# ================= QUERYFORGE =================
with tab1:

    # Glow card
    st.markdown("""
    <div class="glow-card">
    <h2>🧠 AI Query Engine</h2>
    <p>Ask your database in natural language</p>
    </div>
    """, unsafe_allow_html=True)

    user_query = st.text_input("Ask your data...", placeholder="e.g., Top 10 users by revenue")

    if st.button("🚀 Generate Insights", use_container_width=True):
        if user_query:
            with st.spinner("AI is thinking..."):
                result = generate_sql(user_query)

            st.markdown("### 🧾 Generated SQL")
            st.code(result)

            # Extract SQL safely
            match = re.search(r"(SELECT[\s\S]*?;)", result, re.IGNORECASE)
            sql = match.group(1) if match else result

            st.markdown("### 📊 Query Results")

            cols, data = run_query(sql)

            if cols:
                df = pd.DataFrame(data, columns=cols)

                # Format currency
                if "total_revenue" in df.columns:
                    df["total_revenue"] = df["total_revenue"].apply(lambda x: f"₹{int(x):,}")

                st.dataframe(df, use_container_width=True, height=400)

                # Chart
                if "total_revenue" in df.columns:
                    st.markdown("### 📊 Revenue Insights")

                    df_chart = df.copy()
                    df_chart["total_revenue"] = df_chart["total_revenue"].replace('[₹,]', '', regex=True).astype(float)

                    fig = px.bar(
                        df_chart,
                        x=df_chart.columns[0],
                        y="total_revenue",
                        color="total_revenue",
                        color_continuous_scale="viridis",
                        title="Top Revenue Users"
                    )

                    fig.update_layout(template="plotly_dark", height=500)

                    st.plotly_chart(fig, use_container_width=True)

            else:
                st.error(data)

# ================= INFRASAGE =================
with tab2:

    # Glow card
    st.markdown("""
    <div class="glow-card">
    <h2>🟥 Log Intelligence Engine</h2>
    <p>Analyze system logs using AI</p>
    </div>
    """, unsafe_allow_html=True)

    logs = st.text_area("Paste system logs here...", height=200)

    if st.button("⚡ Analyze Logs", use_container_width=True):
        if logs:
            with st.spinner("Analyzing logs..."):
                result = analyze_logs(logs)

            st.markdown("### 🧠 Analysis Result")
            st.write(result)

# ---------- FOOTER ----------
st.markdown("""
<hr>
<p class="footer">Built with ❤️ using AI • DataSage AI</p>
""", unsafe_allow_html=True)