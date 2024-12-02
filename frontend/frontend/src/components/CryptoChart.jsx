import React, { useEffect, useState, useRef } from "react";
import Plot from "react-plotly.js";
import axios from "axios";

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
                setCurrentPrice(parseFloat(kline.c));
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

    return (
        <div style={{ width: '100%', backgroundColor: '#131722' }}>
            <h1 style={{ textAlign: 'center', color: '#fff', margin: '0 0 20px 0' }}>Binance Style Crypto Chart</h1>
            <div style={{ textAlign: 'center', color: '#26a69a', fontSize: '24px', marginBottom: '10px' }}>
                Current Price: ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    style={{ marginRight: '10px', padding: '10px', backgroundColor: '#2a2e39', color: '#fff', border: '1px solid #363c4e' }}
                >
                    <option value="btcusdt">BTC/USDT</option>
                    <option value="ethusdt">ETH/USDT</option>
                    <option value="avaxusdt">AVAX/USDT</option>
                </select>
                <select
                    value={interval}
                    onChange={(e) => setIntervalValue(e.target.value)}
                    style={{ padding: '10px', backgroundColor: '#2a2e39', color: '#fff', border: '1px solid #363c4e' }}
                >
                    <option value="1m">1 Minute</option>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="1d">1 Day</option>
                </select>
            </div>
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
                        marker: { color: "#636efa" },
                    },
                ]}
                layout={{
                    height: 600,
                    xaxis: {
                        title: "Time",
                        type: "date",
                        rangeslider: { visible: true },
                        showgrid: true,
                        gridcolor: "#363c4e",
                        tickformat: interval === "1d" ? "%Y-%m-%d" : "%H:%M:%S",
                    },
                    yaxis: {
                        title: "Price",
                        showgrid: true,
                        gridcolor: "#363c4e",
                        autorange: true,
                    },
                    yaxis2: {
                        title: "Volume",
                        overlaying: "y",
                        side: "right",
                        showgrid: false,
                    },
                    plot_bgcolor: "#131722",
                    paper_bgcolor: "#131722",
                    font: { color: "#fff" },
                    title: `${symbol.toUpperCase()} ${interval.toUpperCase()} Candlestick Chart`,
                }}
                style={{ width: '100%' }}
                useResizeHandler
            />
        </div>
    );
}

export default CryptoChart;