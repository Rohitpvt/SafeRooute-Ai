import requests

url = "http://127.0.0.1:8000/api/v1/routes/geocode"
headers = {"Content-Type": "application/json"}

# 1. Test "Inderlok"
resp1 = requests.post(url, json={"query": "Inderlok"}, headers=headers)
print("Inderlok HTTP Status:", resp1.status_code)
print("Inderlok Response:", resp1.json())

# 2. Test "Inderlok Delhi"
resp2 = requests.post(url, json={"query": "Inderlok Delhi"}, headers=headers)
print("Inderlok Delhi HTTP Status:", resp2.status_code)
print("Inderlok Delhi Response:", resp2.json())
