import React, { useEffect, useState, useRef } from "react";
import Plot from "react-plotly.js";
import axios from "axios";
import {
    Box,
    Paper,
    Typography,
    Select,
    MenuItem,
    Stack,
    Card,
    CardContent,
    ButtonGroup,
    Button,
    Grid,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const INTERVALS = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '1d', label: '1 Day' },
];

const TRADING_PAIRS = [
    { value: 'btcusdt', label: 'BTC/USDT' },
    { value: 'ethusdt', label: 'ETH/USDT' },
    { value: 'avaxusdt', label: 'AVAX/USDT' },
];

function CryptoChart() {
    const [chartData, setChartData] = useState({
        time: [],
        open: [],
        high: [],
        low: [],
        close: [],
        volume: [],
    });

    const [symbol, setSymbol] = useState("btcusdt");
    const [interval, setIntervalValue] = useState("15m");
    const [currentPrice, setCurrentPrice] = useState(0);
    const [previousPrice, setPreviousPrice] = useState(0);
    const ws = useRef(null);

    const fetchHistoricalData = async () => {
        try {
            const response = await axios.get(
                `http://127.0.0.1:5000/api/historical_data?symbol=${symbol.toUpperCase()}&interval=${interval}`
            );
            const data = response.data;

            const time = data.map((item) => new Date(item.time));
            const open = data.map((item) => item.open);
            const high = data.map((item) => item.high);
            const low = data.map((item) => item.low);
            const close = data.map((item) => item.close);
            const volume = data.map((item) => item.volume);

            setChartData({ time, open, high, low, close, volume });
        } catch (error) {
            console.error("Error fetching historical data:", error);
        }
    };

    const startWebSocket = () => {
        if (ws.current) {
            ws.current.close();
        }
        ws.current = new WebSocket("wss://stream.binance.com:9443/ws");

        const subscribeMessage = {
            method: "SUBSCRIBE",
            params: [`${symbol}@kline_${interval}`],
            id: 1,
        };

        ws.current.onopen = () => {
            ws.current.send(JSON.stringify(subscribeMessage));
        };

        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.k) {
                const kline = message.k;
                const newPrice = parseFloat(kline.c);
                handlePriceUpdate(newPrice);
                setChartData((prevData) => {
                    const updatedTime = [...prevData.time, new Date(kline.t)];
                    const updatedOpen = [...prevData.open, parseFloat(kline.o)];
                    const updatedHigh = [...prevData.high, parseFloat(kline.h)];
                    const updatedLow = [...prevData.low, parseFloat(kline.l)];
                    const updatedClose = [...prevData.close, parseFloat(kline.c)];
                    const updatedVolume = [...prevData.volume, parseFloat(kline.v)];

                    return {
                        time: updatedTime.slice(-1000),
                        open: updatedOpen.slice(-1000),
                        high: updatedHigh.slice(-1000),
                        low: updatedLow.slice(-1000),
                        close: updatedClose.slice(-1000),
                        volume: updatedVolume.slice(-1000),
                    };
                });
            }
        };
    };

    const handlePriceUpdate = (newPrice) => {
        setPreviousPrice(currentPrice);
        setCurrentPrice(newPrice);
    };

    useEffect(() => {
        fetchHistoricalData().then(() => {
            startWebSocket();
        });

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [symbol, interval]);

    const isPriceUp = currentPrice >= previousPrice;

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
                {/* Header with Price */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardContent>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <ShowChartIcon color="primary" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Current Price
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography 
                                        variant="h4"
                                        color={isPriceUp ? 'success.main' : 'error.main'}
                                        sx={{ fontWeight: 600 }}
                                    >
                                        ${currentPrice.toLocaleString(undefined, { 
                                            minimumFractionDigits: 2, 
                                            maximumFractionDigits: 2 
                                        })}
                                    </Typography>
                                    {isPriceUp ? (
                                        <TrendingUpIcon color="success" />
                                    ) : (
                                        <TrendingDownIcon color="error" />
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Trading Controls */}
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardContent>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                    <TimelineIcon color="primary" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Chart Controls
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={2}>
                                    <Select
                                        size="small"
                                        value={symbol}
                                        onChange={(e) => setSymbol(e.target.value)}
                                        sx={{ minWidth: 120 }}
                                    >
                                        {TRADING_PAIRS.map(pair => (
                                            <MenuItem key={pair.value} value={pair.value}>
                                                {pair.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <ButtonGroup size="small">
                                        {INTERVALS.map(int => (
                                            <Button
                                                key={int.value}
                                                variant={interval === int.value ? 'contained' : 'outlined'}
                                                onClick={() => setIntervalValue(int.value)}
                                            >
                                                {int.value}
                                            </Button>
                                        ))}
                                    </ButtonGroup>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Chart */}
                <Card variant="outlined">
                    <CardContent>
                        <Plot
                            data={[
                                {
                                    x: chartData.time,
                                    open: chartData.open,
                                    high: chartData.high,
                                    low: chartData.low,
                                    close: chartData.close,
                                    type: "candlestick",
                                    name: "Price",
                                    increasing: { line: { color: "#26a69a" } },
                                    decreasing: { line: { color: "#ef5350" } },
                                },
                                {
                                    x: chartData.time,
                                    y: chartData.volume,
                                    type: "bar",
                                    name: "Volume",
                                    yaxis: "y2",
                                    marker: {
                                        color: chartData.close.map((close, i) => 
                                            (i > 0 ? close >= chartData.close[i-1] : true) 
                                                ? 'rgba(38, 166, 154, 0.3)' 
                                                : 'rgba(239, 83, 80, 0.3)'
                                        )
                                    },
                                },
                            ]}
                            layout={{
                                height: 600,
                                margin: { t: 40, r: 60, l: 60, b: 40 },
                                xaxis: {
                                    title: "Time",
                                    type: "date",
                                    rangeslider: { visible: false },
                                    showgrid: true,
                                    gridcolor: "#363c4e",
                                    tickformat: interval === "1d" ? "%Y-%m-%d" : "%H:%M:%S",
                                },
                                yaxis: {
                                    title: "Price",
                                    showgrid: true,
                                    gridcolor: "#363c4e",
                                    autorange: true,
                                    tickformat: ",.2f",
                                },
                                yaxis2: {
                                    title: "Volume",
                                    overlaying: "y",
                                    side: "right",
                                    showgrid: false,
                                },
                                plot_bgcolor: "#131722",
                                paper_bgcolor: "#131722",
                                font: { color: "#fff", family: "Inter" },
                                modebar: {
                                    bgcolor: 'rgba(0,0,0,0)',
                                    color: '#fff',
                                    activecolor: '#26a69a'
                                },
                                hoverlabel: {
                                    bgcolor: '#2a2e39',
                                    font: { family: 'Inter', color: '#fff' }
                                },
                            }}
                            style={{ width: '100%' }}
                            useResizeHandler
                            config={{
                                displayModeBar: true,
                                displaylogo: false,
                                modeBarButtonsToRemove: [
                                    'select2d',
                                    'lasso2d',
                                    'autoScale2d',
                                ],
                            }}
                        />
                    </CardContent>
                </Card>
            </Paper>
        </Box>
    );
}

export default CryptoChart;