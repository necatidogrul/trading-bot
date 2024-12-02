import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from itertools import product
from binance.client import Client
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('BINANCE_API_KEY')
API_SECRET = os.getenv('BINANCE_API_SECRET')

class BinanceBacktest:
    def __init__(self, symbol='ETHUSDT', interval='5m', start_date='1 month ago UTC'):
        """
        Initialize Binance Backtest with client and historical data
        
        :param symbol: Trading pair symbol
        :param interval: Candle interval
        :param start_date: Start date for historical data
        """
        self.client = Client(API_KEY, API_SECRET)
        
        klines = self.client.get_historical_klines(
            symbol, 
            getattr(Client, f'KLINE_INTERVAL_{interval.upper()}'), 
            start_date
        )
        
        columns = ['Open Time', 'Open', 'High', 'Low', 'Close', 'Volume', 
                   'Close Time', 'Quote Asset Volume', 'Number of Trades', 
                   'TB Base Volume', 'TB Quote Volume', 'Ignore']
        self.data = pd.DataFrame(klines, columns=columns)
        
        numeric_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        self.data[numeric_columns] = self.data[numeric_columns].astype(float)
        
        self.data['Date'] = pd.to_datetime(self.data['Open Time'], unit='ms')
        self.data.set_index('Date', inplace=True)
    
    def bollinger_bands(self, data, window=20, no_of_std=2):
        rolling_mean = data['Close'].rolling(window=window).mean()
        rolling_std = data['Close'].rolling(window=window).std()
        
        data['Bollinger_High'] = rolling_mean + (rolling_std * no_of_std)
        data['Bollinger_Low'] = rolling_mean - (rolling_std * no_of_std)
        
        return data
    
    def calculate_rsi(self, data, length=14):
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=length).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=length).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def calculate_macd(self, data, fast=12, slow=26, signal=9):
        exp1 = data['Close'].ewm(span=fast, adjust=False).mean()
        exp2 = data['Close'].ewm(span=slow, adjust=False).mean()
        
        macd = exp1 - exp2
        signal_line = macd.ewm(span=signal, adjust=False).mean()
        
        data['MACD'] = macd
        data['Signal'] = signal_line
        
        return data
    
    def buy_sell_signals(self, data):
        buy_signal = []
        sell_signal = []
        position = None
        
        for i in range(len(data)):
            if (data['Close'].iloc[i] < data['Bollinger_Low'].iloc[i] and 
                data['RSI'].iloc[i] < 35 and 
                data['MACD'].iloc[i] > data['Signal'].iloc[i]):
                
                if position != 'Buy':
                    buy_signal.append(data['Close'].iloc[i])
                    sell_signal.append(np.nan)
                    position = 'Buy'
                else:
                    buy_signal.append(np.nan)
                    sell_signal.append(np.nan)
            
            elif (data['Close'].iloc[i] > data['Bollinger_High'].iloc[i] and 
                  data['RSI'].iloc[i] > 65 and 
                  data['MACD'].iloc[i] < data['Signal'].iloc[i]):
                
                if position != 'Sell':
                    buy_signal.append(np.nan)
                    sell_signal.append(data['Close'].iloc[i])
                    position = 'Sell'
                else:
                    buy_signal.append(np.nan)
                    sell_signal.append(np.nan)
            
            else:
                buy_signal.append(np.nan)
                sell_signal.append(np.nan)
        
        return buy_signal, sell_signal
    
    def backtest(self, data, buy_signals, sell_signals, initial_capital=10000, trade_fee=0.001):
        capital = initial_capital
        position = None
        trades = []
        
        for i in range(len(data)):
            if not np.isnan(buy_signals[i]) and position is None:
                # Buy
                position = {
                    'entry_price': data['Close'].iloc[i],
                    'entry_time': data.index[i]
                }
            
            elif not np.isnan(sell_signals[i]) and position is not None:
                exit_price = data['Close'].iloc[i]
                exit_time = data.index[i]
                
                profit_percentage = (exit_price - position['entry_price']) / position['entry_price'] * 100
                profit_amount = capital * (profit_percentage / 100)
                
                profit_amount -= capital * trade_fee * 2 
                
                capital += profit_amount
                
                trades.append({
                    'entry_time': position['entry_time'],
                    'exit_time': exit_time,
                    'entry_price': position['entry_price'],
                    'exit_price': exit_price,
                    'profit_percentage': profit_percentage,
                    'profit_amount': profit_amount
                })
                
                position = None
        
        return capital, trades
    
    def grid_optimization(self, timeframes=['5m', '1h'], symbols=['ETHUSDT', 'BTCUSDT']):
        """
        Perform grid search optimization for multiple timeframes and symbols
        
        :param timeframes: List of timeframes to test
        :param symbols: List of trading pairs to test
        :return: Best parameters and results
        """
        results = {}
        
        bollinger_windows = [10, 20, 30]
        bollinger_std = [1, 2, 2.5]
        rsi_lengths = [10, 14, 20]
        
        for symbol in symbols:
            for timeframe in timeframes:
                klines = self.client.get_historical_klines(
                    symbol, 
                    getattr(Client, f'KLINE_INTERVAL_{timeframe.upper()}'), 
                    '1 month ago UTC'
                )
                
                data = pd.DataFrame(klines, columns=[
                    'Open Time', 'Open', 'High', 'Low', 'Close', 'Volume', 
                    'Close Time', 'Quote Asset Volume', 'Number of Trades', 
                    'TB Base Volume', 'TB Quote Volume', 'Ignore'
                ])
                
                data[['Open', 'High', 'Low', 'Close', 'Volume']] = data[['Open', 'High', 'Low', 'Close', 'Volume']].astype(float)
                data['Date'] = pd.to_datetime(data['Open Time'], unit='ms')
                data.set_index('Date', inplace=True)
                
                best_capital = 0
                best_params = None
                
                for window, std, rsi_length in product(bollinger_windows, bollinger_std, rsi_lengths):
                    data_copy = data.copy()
                    
                    data_copy = self.bollinger_bands(data_copy, window, std)
                    data_copy['RSI'] = self.calculate_rsi(data_copy, rsi_length)
                    data_copy = self.calculate_macd(data_copy)
                    
                    buy_signals, sell_signals = self.buy_sell_signals(data_copy)
                    final_capital, _ = self.backtest(data_copy, buy_signals, sell_signals)
                    
                    if final_capital > best_capital:
                        best_capital = final_capital
                        best_params = {
                            'bollinger_window': window,
                            'bollinger_std': std,
                            'rsi_length': rsi_length
                        }
                
                results[f'{symbol}_{timeframe}'] = {
                    'best_capital': best_capital,
                    'best_params': best_params
                }
        
        return results
    
    def plot_signals(self, data, buy_signals, sell_signals, title):
        plt.figure(figsize=(14, 7))
        plt.plot(data.index, data['Close'], label='Price', alpha=0.5)
        plt.plot(data.index, data['Bollinger_High'], label='Bollinger High', linestyle='--', color='red')
        plt.plot(data.index, data['Bollinger_Low'], label='Bollinger Low', linestyle='--', color='green')
        plt.scatter(data.index, buy_signals, label='Buy Signal', marker='^', color='green', alpha=1)
        plt.scatter(data.index, sell_signals, label='Sell Signal', marker='v', color='red', alpha=1)
        plt.title(title)
        plt.legend()
        plt.show()

if __name__ == '__main__':
    backtest = BinanceBacktest(symbol='ETHUSDT', interval='5m')
    
    backtest.data = backtest.bollinger_bands(backtest.data)
    backtest.data['RSI'] = backtest.calculate_rsi(backtest.data)
    backtest.data = backtest.calculate_macd(backtest.data)
    
    buy_signals, sell_signals = backtest.buy_sell_signals(backtest.data)
    
    final_capital, trades = backtest.backtest(backtest.data, buy_signals, sell_signals)
    
    print(f"Final Capital: ${final_capital:.2f}")
    print(f"Number of Trades: {len(trades)}")
    
    backtest.plot_signals(backtest.data, buy_signals, sell_signals, 'ETHUSDT 5m Backtest')
    
    optimization_results = backtest.grid_optimization()
    for key, result in optimization_results.items():
        print(f"{key} Results:")
        print(f"Best Capital: ${result['best_capital']:.2f}")
        print(f"Best Parameters: {result['best_params']}\n")
