import urllib.request
import json

url = "http://127.0.0.1:8000/api/v1/routes/geocode"

def test_query(q):
    req = urllib.request.Request(
        url,
        data=json.dumps({"query": q}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Query: '{q}' -> Status Code: {resp.status}")
            print(json.loads(resp.read().decode()))
    except Exception as e:
        print(f"Query '{q}' failed: {e}")

test_query("Inderlok")
test_query("Inderlok Delhi")
