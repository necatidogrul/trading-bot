import pandas as pd

def calculate_rsi(data, period=14):
    delta = data['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def apply_strategy(symbol, strategy, data, strategy_params=None):
    if strategy == 'RSI':
        strategy_params = strategy_params or {}
        is_custom = strategy_params.get('is_custom', False)
        
        if is_custom:
            rsi_oversold = strategy_params.get('rsi_oversold', 30)
            rsi_overbought = strategy_params.get('rsi_overbought', 70)
        else:
            rsi_oversold = 30
            rsi_overbought = 70
        
        rsi = calculate_rsi(data)
        last_rsi = rsi.iloc[-1]
        
        if last_rsi < rsi_oversold:
            return {"action": "buy", "quantity": 0.01, "price": None}
        elif last_rsi > rsi_overbought:
            return {"action": "sell", "quantity": 0.01, "price": None}
    return {"action": "hold", "quantity": 0}
