import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from llm import ask_llm

def analyze_logs(log_text):
    prompt = f"""
You are an expert DevOps engineer.

Analyze the following logs and provide:

1. Root Cause
2. Why it happened
3. Suggested Fix

Logs:
{log_text}
"""

    return ask_llm(prompt)