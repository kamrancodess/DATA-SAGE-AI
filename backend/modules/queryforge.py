import sys
import os

# Allow access to parent folder (for llm.py)
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from llm import ask_llm

def generate_sql(user_query):
    prompt = f"""
You are an expert SQL generator.

STRICT RULES:
- Return ONLY SQL query
- Do NOT include explanation
- Do NOT include markdown (no ```sql)
- Start directly with SELECT
- End query with ;

Schema:
users(id, name)
orders(id, user_id, amount, date)

User Query:
{user_query}
"""

    return ask_llm(prompt)