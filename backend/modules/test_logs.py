from infrasage import analyze_logs

logs = """
connection refused
timeout error
service unavailable
"""

result = analyze_logs(logs)

print(result)