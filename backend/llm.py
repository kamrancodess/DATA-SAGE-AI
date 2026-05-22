import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5-coder:7b"     



def ask_llm(prompt):
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0,
                "top_p": 0.2,
                "num_predict": 220,
                "num_ctx": 2048,
            },
        },
        timeout=25,
    )
    response.raise_for_status()

    data = response.json()
    text = data.get("response", "").strip()
    if not text:
        raise ValueError("The local model returned an empty response.")

    return text
