import React, { useState, useEffect, useRef } from 'react';

function TradingBot({ 
    selectedCoin,
    currentPrice,
    onBuy,
    onSell,
    orderAmount
}) {
    const [botState, setBotState] = useState('idle'); // 'idle', 'configuring', 'ready', 'running'
    
    const [indicators, setIndicators] = useState({
        bollinger: {
            window: 20,
            std: 2,
            upper: null,
            lower: null,
            values: []
        },
        rsi: {
            length: 14,
            value: null,
            values: [],
            overbought: 70,
            oversold: 30,
            isCustom: true
        },
        macd: {
            fast: 12,
            slow: 26,
            signal: 9,
            value: null,
            signalValue: null,
            values: [],
            signalValues: []
        }
    });

    const [botSettings, setBotSettings] = useState({
        rsiOversold: 30,
        rsiOverbought: 70,
        settingsConfirmed: false
    });

    const [botStats, setBotStats] = useState({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        lastTradeResult: null,
        position: null,
        entryPrice: null
    });

    const priceHistory = useRef([]);
    const lastCheck = useRef(Date.now());
    const checkInterval = 1000; // Check every second

    const handleBotSettingChange = (setting, value) => {
        setBotSettings(prev => ({
            ...prev,
            [setting]: Number(value)
        }));
    };

    const startConfiguration = () => {
        setBotState('configuring');
    };

    const confirmSettings = () => {
        setIndicators(prev => ({
            ...prev,
            rsi: {
                ...prev.rsi,
                oversold: botSettings.rsiOversold,
                overbought: botSettings.rsiOverbought,
                isCustom: true
            }
        }));
        setBotSettings(prev => ({
            ...prev,
            settingsConfirmed: true
        }));
        setBotState('ready');
    };

    const startTrading = () => {
        setBotState('running');
    };

    const calculateBollinger = (prices, window, std) => {
        if (prices.length < window) return { upper: null, lower: null };
        
        const sma = prices.slice(-window).reduce((a, b) => a + b, 0) / window;
        const squaredDiffs = prices.slice(-window).map(p => Math.pow(p - sma, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / window;
        const stdDev = Math.sqrt(variance);

        return {
            upper: sma + (stdDev * std),
            lower: sma - (stdDev * std)
        };
    };

    const calculateRSI = (prices, length) => {
        if (prices.length < length + 1) return null;

        let gains = 0;
        let losses = 0;

        for (let i = prices.length - length; i < prices.length; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
        }

        const avgGain = gains / length;
        const avgLoss = losses / length;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    };

    const calculateEMA = (prices, period) => {
        if (prices.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        
        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }
        
        return ema;
    };

    const calculateMACD = (prices, fast, slow, signal) => {
        const fastEMA = calculateEMA(prices, fast);
        const slowEMA = calculateEMA(prices, slow);
        
        if (!fastEMA || !slowEMA) return { macd: null, signal: null };
        
        const macd = fastEMA - slowEMA;
        const signalLine = calculateEMA([...indicators.macd.values, macd], signal);
        
        return { macd, signal: signalLine };
    };

    const checkSignals = () => {
        const { rsi } = indicators;
        
        if (!rsi.value) {
            return;
        }

        if (!botStats.position) {
            // Buy Signal
            if (rsi.value < rsi.oversold) {
                handleBuy();
            }
        } else {
            // Sell Signal
            if (rsi.value > rsi.overbought) {
                handleSell();
            }
        }
    };

    const handleBuy = () => {
        if (!botState === 'running' || botStats.position) return;
        
        onBuy();
        setBotStats(prev => ({
            ...prev,
            position: 'LONG',
            entryPrice: currentPrice,
            totalTrades: prev.totalTrades + 1
        }));
    };

    const handleSell = () => {
        if (!botState === 'running' || !botStats.position) return;
        
        onSell();
        const profit = currentPrice - botStats.entryPrice;
        setBotStats(prev => ({
            ...prev,
            position: null,
            entryPrice: null,
            totalProfit: prev.totalProfit + profit,
            winningTrades: profit > 0 ? prev.winningTrades + 1 : prev.winningTrades,
            losingTrades: profit < 0 ? prev.losingTrades + 1 : prev.losingTrades,
            lastTradeResult: profit
        }));
    };

    useEffect(() => {
        if (!currentPrice || !botState === 'running') return;

        const now = Date.now();
        if (now - lastCheck.current < checkInterval) return;
        lastCheck.current = now;

        priceHistory.current.push(currentPrice);
        if (priceHistory.current.length > 100) priceHistory.current.shift();

        const prices = priceHistory.current;
        const { bollinger, rsi, macd } = indicators;

        const bollingerValues = calculateBollinger(prices, bollinger.window, bollinger.std);
        const rsiValue = calculateRSI(prices, rsi.length);
        const macdValues = calculateMACD(prices, macd.fast, macd.slow, macd.signal);

        setIndicators(prev => ({
            ...prev,
            bollinger: {
                ...prev.bollinger,
                upper: bollingerValues.upper,
                lower: bollingerValues.lower,
                values: [...prev.bollinger.values, bollingerValues]
            },
            rsi: {
                ...prev.rsi,
                value: rsiValue,
                values: [...prev.rsi.values, rsiValue]
            },
            macd: {
                ...prev.macd,
                value: macdValues.macd,
                signalValue: macdValues.signal,
                values: [...prev.macd.values, macdValues.macd],
                signalValues: [...prev.macd.signalValues, macdValues.signal]
            }
        }));

        checkSignals();
    }, [currentPrice, botState]);

    return (
        <div className="trading-bot">
            {botState === 'idle' && (
                <button 
                    onClick={startConfiguration}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        width: '100%',
                        fontSize: '16px'
                    }}
                >
                    Configure Trading Bot
                </button>
            )}

            {botState === 'configuring' && (
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
                    <h3 style={{ color: '#fff', marginBottom: '15px' }}>Bot Settings</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                                RSI Oversold (Buy) Level:
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={botSettings.rsiOversold}
                                onChange={(e) => handleBotSettingChange('rsiOversold', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #444',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>
                                RSI Overbought (Sell) Level:
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={botSettings.rsiOverbought}
                                onChange={(e) => handleBotSettingChange('rsiOverbought', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #444',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff'
                                }}
                            />
                        </div>
                    </div>
                    <button 
                        onClick={confirmSettings}
                        style={{
                            marginTop: '15px',
                            padding: '10px 20px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: '16px'
                        }}
                    >
                        Confirm Settings
                    </button>
                </div>
            )}

            {botState === 'ready' && (
                <div>
                    <div style={{
                        marginTop: '15px',
                        padding: '10px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '4px',
                        color: '#fff',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>Confirmed Settings:</h4>
                        <div>Buy when RSI below: {botSettings.rsiOversold}</div>
                        <div>Sell when RSI above: {botSettings.rsiOverbought}</div>
                    </div>
                    <button 
                        onClick={startTrading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: '16px'
                        }}
                    >
                        Start Trading
                    </button>
                </div>
            )}

            {botState === 'running' && (
                <div style={{ marginTop: '15px', color: '#fff' }}>
                    <h4>Active Trading Bot Status:</h4>
                    <div style={{ 
                        backgroundColor: '#2a2a2a',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '10px'
                    }}>
                        <div>Buy Level (Oversold): {indicators.rsi.oversold}</div>
                        <div>Sell Level (Overbought): {indicators.rsi.overbought}</div>
                        <div>Current RSI: {indicators.rsi.value ? indicators.rsi.value.toFixed(2) : 'Calculating...'}</div>
                    </div>
                    <div style={{ 
                        backgroundColor: '#2a2e39', 
                        padding: '15px',
                        borderRadius: '5px',
                        marginTop: '20px'
                    }}>
                        <h3 style={{ color: '#fff', marginBottom: '15px' }}>Trading Bot Status</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ color: '#fff' }}>
                                <div>Total Trades: {botStats.totalTrades}</div>
                                <div>Winning Trades: {botStats.winningTrades}</div>
                                <div>Losing Trades: {botStats.losingTrades}</div>
                                <div style={{ color: botStats.totalProfit >= 0 ? '#26a69a' : '#ef5350' }}>
                                    Total Profit: ${botStats.totalProfit.toFixed(2)}
                                </div>
                            </div>
                            
                            <div style={{ color: '#fff' }}>
                                <div>Current Position: {botStats.position || 'None'}</div>
                                {botStats.position && (
                                    <div>Entry Price: ${botStats.entryPrice.toFixed(2)}</div>
                                )}
                                {botStats.lastTradeResult !== null && (
                                    <div style={{ 
                                        color: botStats.lastTradeResult >= 0 ? '#26a69a' : '#ef5350'
                                    }}>
                                        Last Trade: ${botStats.lastTradeResult.toFixed(2)}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '15px', color: '#fff' }}>
                            <h4>Current Indicators:</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                <div>
                                    <div>RSI: {indicators.rsi.value?.toFixed(2) || 'N/A'}</div>
                                    <div style={{ 
                                        color: indicators.rsi.value > indicators.rsi.overbought 
                                            ? '#ef5350' 
                                            : indicators.rsi.value < indicators.rsi.oversold 
                                                ? '#26a69a' 
                                                : '#fff'
                                    }}>
                                        Status: {
                                            indicators.rsi.value > indicators.rsi.overbought 
                                                ? 'Overbought' 
                                                : indicators.rsi.value < indicators.rsi.oversold 
                                                    ? 'Oversold' 
                                                    : 'Neutral'
                                        }
                                    </div>
                                </div>
                                
                                <div>
                                    <div>MACD: {indicators.macd.value?.toFixed(4) || 'N/A'}</div>
                                    <div>Signal: {indicators.macd.signalValue?.toFixed(4) || 'N/A'}</div>
                                </div>
                                
                                <div>
                                    <div>BB Upper: {indicators.bollinger.upper?.toFixed(2) || 'N/A'}</div>
                                    <div>BB Lower: {indicators.bollinger.lower?.toFixed(2) || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TradingBot;
