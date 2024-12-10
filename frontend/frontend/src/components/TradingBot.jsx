import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Slider, 
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

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
        <Box sx={{ width: '100%' }}>
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3,
                    backgroundColor: 'background.paper',
                    borderRadius: 2
                }}
            >
                {/* Header Section */}
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                        Trading Bot {selectedCoin && `- ${selectedCoin}`}
                    </Typography>
                    <Chip 
                        label={botState.charAt(0).toUpperCase() + botState.slice(1)}
                        color={
                            botState === 'running' ? 'success' :
                            botState === 'configuring' ? 'warning' :
                            botState === 'ready' ? 'info' : 'default'
                        }
                        size="small"
                    />
                </Box>

                {/* Bot Controls */}
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <Button
                        variant="contained"
                        startIcon={<SettingsIcon />}
                        onClick={startConfiguration}
                        disabled={botState !== 'idle'}
                        sx={{ flex: 1 }}
                    >
                        Configure
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={startTrading}
                        disabled={botState !== 'ready'}
                        sx={{ flex: 1 }}
                    >
                        Start Trading
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<StopIcon />}
                        onClick={() => setBotState('idle')}
                        disabled={botState !== 'running'}
                        sx={{ flex: 1 }}
                    >
                        Stop
                    </Button>
                </Stack>

                {/* Configuration Section */}
                {botState === 'configuring' && (
                    <Card variant="outlined" sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                Bot Settings
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography gutterBottom>
                                        RSI Oversold Level
                                    </Typography>
                                    <Slider
                                        value={botSettings.rsiOversold}
                                        onChange={(e, value) => handleBotSettingChange('rsiOversold', value)}
                                        min={0}
                                        max={100}
                                        valueLabelDisplay="auto"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography gutterBottom>
                                        RSI Overbought Level
                                    </Typography>
                                    <Slider
                                        value={botSettings.rsiOverbought}
                                        onChange={(e, value) => handleBotSettingChange('rsiOverbought', value)}
                                        min={0}
                                        max={100}
                                        valueLabelDisplay="auto"
                                    />
                                </Grid>
                            </Grid>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="contained"
                                    onClick={confirmSettings}
                                    color="primary"
                                >
                                    Confirm Settings
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Section */}
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                    Performance Metrics
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Trades
                                        </Typography>
                                        <Typography variant="h6">
                                            {botStats.totalTrades}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Profit
                                        </Typography>
                                        <Typography 
                                            variant="h6" 
                                            color={botStats.totalProfit >= 0 ? 'success.main' : 'error.main'}
                                        >
                                            {botStats.totalProfit?.toFixed(2) || '0.00'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Win Rate
                                        </Typography>
                                        <Typography variant="h6">
                                            {botStats.totalTrades > 0 
                                                ? ((botStats.winningTrades / botStats.totalTrades) * 100).toFixed(1)
                                                : '0'}%
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Current Position
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {botStats.position ? (
                                                <Chip 
                                                    icon={<TrendingUpIcon />}
                                                    label="LONG"
                                                    color="success"
                                                    size="small"
                                                />
                                            ) : (
                                                <Chip 
                                                    label="NO POSITION"
                                                    variant="outlined"
                                                    size="small"
                                                />
                                            )}
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                                    Technical Indicators
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            RSI
                                        </Typography>
                                        <Typography variant="h6">
                                            {indicators.rsi.value?.toFixed(2) || 'N/A'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            MACD
                                        </Typography>
                                        <Typography variant="h6">
                                            {indicators.macd.value?.toFixed(2) || 'N/A'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Bollinger Upper
                                        </Typography>
                                        <Typography variant="h6">
                                            {indicators.bollinger.upper?.toFixed(2) || 'N/A'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">
                                            Bollinger Lower
                                        </Typography>
                                        <Typography variant="h6">
                                            {indicators.bollinger.lower?.toFixed(2) || 'N/A'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}

export default TradingBot;
