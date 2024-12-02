import pandas as pd
import numpy as np
from binance.client import Client
from datetime import datetime, timedelta

def calculate_sma(data, period):
    return data.rolling(window=period).mean()

def calculate_rsi(data, period=14):
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def calculate_bollinger_bands(data, period=20, num_std=2):
    sma = calculate_sma(data, period)
    std = data.rolling(window=period).std()
    upper_band = sma + (std * num_std)
    lower_band = sma - (std * num_std)
    return upper_band, sma, lower_band

def calculate_macd(data, fast_period=12, slow_period=26, signal_period=9):
    fast_ema = data.ewm(span=fast_period, adjust=False).mean()
    slow_ema = data.ewm(span=slow_period, adjust=False).mean()
    macd_line = fast_ema - slow_ema
    signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
    macd_histogram = macd_line - signal_line
    return macd_line, signal_line, macd_histogram

def fetch_historical_data(symbol, interval, start_date, end_date):
    client = Client()
    klines = client.get_historical_klines(
        symbol,
        interval,
        start_date.strftime("%d %b %Y %H:%M:%S"),
        end_date.strftime("%d %b %Y %H:%M:%S")
    )
    
    df = pd.DataFrame(klines, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_asset_volume', 'number_of_trades',
        'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
    ])
    
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    df = df.set_index('timestamp')
    
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    return df

def calculate_indicators(df, params):
    #Bollinger bands
    df['bb_upper'], df['bb_middle'], df['bb_lower'] = calculate_bollinger_bands(
        df['close'],
        period=params['bb_length'],
        num_std=params['bb_std']
    )
    
    #RSI
    df['rsi'] = calculate_rsi(df['close'], period=params['rsi_length'])
    
    #MACD
    df['macd'], df['macd_signal'], df['macd_hist'] = calculate_macd(
        df['close'],
        fast_period=params['macd_fast'],
        slow_period=params['macd_slow'],
        signal_period=params['macd_signal']
    )
    
    # SMA
    df['sma'] = calculate_sma(df['close'], params['sma_length'])
    
    return df

def generate_signals(df, params):
    df['signal'] = 0  
    
    for i in range(1, len(df)):
        buy_condition = (
            df['close'].iloc[i] < df['bb_lower'].iloc[i] and
            df['rsi'].iloc[i] < params['rsi_buy'] and
            df['macd'].iloc[i] > df['macd_signal'].iloc[i] and
            df['close'].iloc[i] > df['sma'].iloc[i]
        )
        
        sell_condition = (
            df['close'].iloc[i] > df['bb_upper'].iloc[i] and
            df['rsi'].iloc[i] > params['rsi_sell'] and
            df['macd'].iloc[i] < df['macd_signal'].iloc[i] and
            df['close'].iloc[i] < df['sma'].iloc[i]
        )
        
        if buy_condition:
            df.iloc[i, df.columns.get_loc('signal')] = 1
        elif sell_condition:
            df.iloc[i, df.columns.get_loc('signal')] = -1
            
    return df

def backtest(symbol, interval, start_date, end_date, initial_params):
    df = fetch_historical_data(symbol, interval, start_date, end_date)
    
    params = {
        'bb_length': initial_params.get('bb_length', 20),
        'bb_std': initial_params.get('bb_std', 2),
        'rsi_length': initial_params.get('rsi_length', 14),
        'rsi_buy': initial_params.get('rsi_buy', 30),
        'rsi_sell': initial_params.get('rsi_sell', 70),
        'macd_fast': initial_params.get('macd_fast', 12),
        'macd_slow': initial_params.get('macd_slow', 26),
        'macd_signal': initial_params.get('macd_signal', 9),
        'sma_length': initial_params.get('sma_length', 50)
    }
    
    df = calculate_indicators(df, params)
    
    df = generate_signals(df, params)
    
    initial_balance = 10000 
    balance = initial_balance
    position = None
    trades = []
    
    for i in range(1, len(df)):
        if df['signal'].iloc[i] == 1 and position is None: 
            position = {
                'entry_price': df['close'].iloc[i],
                'entry_time': df.index[i]
            }
        elif df['signal'].iloc[i] == -1 and position is not None: 
            profit = (df['close'].iloc[i] - position['entry_price']) / position['entry_price']
            balance *= (1 + profit)
            trades.append({
                'entry_time': position['entry_time'].isoformat(),
                'exit_time': df.index[i].isoformat(),
                'entry_price': float(position['entry_price']),
                'exit_price': float(df['close'].iloc[i]),
                'profit_pct': float(profit * 100)
            })
            position = None
    
    total_return = ((balance - initial_balance) / initial_balance) * 100
    num_trades = len(trades)
    winning_trades = len([t for t in trades if t['profit_pct'] > 0])
    losing_trades = len([t for t in trades if t['profit_pct'] <= 0])
    
    if num_trades > 0:
        win_rate = (winning_trades / num_trades) * 100
        avg_profit = sum(t['profit_pct'] for t in trades) / num_trades
    else:
        win_rate = 0
        avg_profit = 0
    
    results = {
        'symbol': symbol,
        'interval': interval,
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'initial_balance': initial_balance,
        'final_balance': float(balance),
        'total_return_pct': float(total_return),
        'num_trades': num_trades,
        'winning_trades': winning_trades,
        'losing_trades': losing_trades,
        'win_rate': float(win_rate),
        'avg_profit_per_trade': float(avg_profit),
        'trades': trades
    }
    
    return results

def optimize_parameters(df, initial_params):
    """
    Parametreleri optimize et
    """
    if len(df) < 2:
        return initial_params
        
    close_prices = df['close'].values
    price_changes = np.diff(close_prices)
    volatility = np.std(price_changes)
    
    optimized_params = initial_params.copy()
    
    if volatility > np.mean(price_changes) + np.std(price_changes):
        optimized_params['rsi_buy'] = max(20, initial_params['rsi_buy'] - 5)
        optimized_params['rsi_sell'] = min(80, initial_params['rsi_sell'] + 5)
    
    return optimized_params
