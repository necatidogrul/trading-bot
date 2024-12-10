import requests

BASE_URL = 'https://api.binance.com/api/v3'

def fetch_historical_data(symbol, interval):
    endpoint = f"{BASE_URL}/klines"
    params = {
        "symbol": symbol,
        "interval": interval,
        "limit": 1000 
    }
    response = requests.get(endpoint, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        return {"error": "Failed to fetch historical data"}
