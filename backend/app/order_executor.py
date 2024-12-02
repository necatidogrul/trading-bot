import requests
import os

API_KEY = os.getenv('BINANCE_PUBLIC_KEY')
SECRET_KEY = os.getenv('BINANCE_SECRET_KEY')
BASE_URL = 'https://testnet.binance.vision/api/v3'

def execute_order(order):
    headers = {'X-MBX-APIKEY': API_KEY}
    payload = {
        'symbol': 'BTCUSDT',
        'side': order['action'].upper(),
        'type': 'MARKET',
        'quantity': order['quantity']
    }
    response = requests.post(f"{BASE_URL}/order", headers=headers, data=payload)
    if response.status_code == 200:
        return response.json()
    else:
        return {"error": "Failed to execute order"}
