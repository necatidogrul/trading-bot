from flask import Blueprint, jsonify, request
from .data_fetcher import fetch_historical_data
from datetime import datetime
from .backtesting import backtest

api = Blueprint('api', __name__)

@api.route('/historical_data', methods=['GET'])
def historical_data():
    symbol = request.args.get('symbol', 'BTCUSDT')
    interval = request.args.get('interval', '1m')
    data = fetch_historical_data(symbol, interval)
    if "error" in data:
        return jsonify({"error": data["error"]}), 500
    formatted_data = [
        {
            "time": int(item[0]),      # Zaman damgası
            "open": float(item[1]),    # Açılış fiyatı
            "high": float(item[2]),    # En yüksek fiyat
            "low": float(item[3]),     # En düşük fiyat
            "close": float(item[4])    # Kapanış fiyatı
        }
        for item in data
    ]
    return jsonify(formatted_data)

@api.route('/backtest', methods=['POST'])
def run_backtest():
    try:
        data = request.json
        
        # Parametreleri al
        symbol = data.get('symbol', 'BTCUSDT')
        interval = data.get('interval', '1m')
        start_date = datetime.fromisoformat(data['startDate'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['endDate'].replace('Z', '+00:00'))
        
        # İndikatör parametreleri
        initial_params = {
            'bb_length': int(data.get('bbLength', 20)),
            'bb_std': float(data.get('bbStd', 2)),
            'rsi_length': int(data.get('rsiLength', 14)),
            'rsi_buy': int(data.get('rsiBuy', 30)),
            'rsi_sell': int(data.get('rsiSell', 70)),
            'macd_fast': int(data.get('macdFast', 12)),
            'macd_slow': int(data.get('macdSlow', 26)),
            'macd_signal': int(data.get('macdSignal', 9)),
            'sma_length': int(data.get('smaLength', 50))
        }
        
        # Backtest çalıştır
        results = backtest(symbol, interval, start_date, end_date, initial_params)
        
        return jsonify(results)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
