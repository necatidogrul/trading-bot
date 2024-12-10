import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import TradingBot from './TradingBot';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  TextField,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SmartToyIcon from '@mui/icons-material/SmartToy';

function TradingSimulator() {
  const [balance, setBalance] = useState(10000);
  const [portfolio, setPortfolio] = useState({});
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [pnl, setPnl] = useState({ total: 0, percentage: 0 });
  const [totalPnL, setTotalPnL] = useState(0);
  const [trades, setTrades] = useState([]);
  const [orderAmount, setOrderAmount] = useState(100);
  const [isBotActive, setIsBotActive] = useState(false);
  const ws = useRef(null);

  const coins = ['BTCUSDT', 'ETHUSDT', 'AVAXUSDT', 'SOLUSDT', 'RENDERUSDT', 'FETUSDT'];

  useEffect(() => {
    startWebSocket();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [selectedCoin]);

  const startWebSocket = () => {
    if (ws.current) {
      ws.current.close();
    }

    ws.current = new WebSocket('wss://stream.binance.com:9443/ws');
    const subscribeMessage = {
      method: "SUBSCRIBE",
      params: [`${selectedCoin.toLowerCase()}@ticker`],
      id: 1,
    };

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify(subscribeMessage));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.c) {
        const newPrice = parseFloat(data.c);
        setCurrentPrice(newPrice);
        updatePnL(newPrice);
        updateTradesPnL(newPrice);
      }
    };
  };

  const updateTradesPnL = (currentPrice) => {
    setTrades(prevTrades => 
      prevTrades.map(trade => {
        if (trade.type === 'BUY') {
          const pnl = (currentPrice - trade.price) * trade.amount;
          const pnlPercentage = ((currentPrice - trade.price) / trade.price) * 100;
          return { ...trade, currentPnL: pnl, pnlPercentage };
        } else {
          const pnl = (trade.price - currentPrice) * trade.amount;
          const pnlPercentage = ((trade.price - currentPrice) / trade.price) * 100;
          return { ...trade, currentPnL: pnl, pnlPercentage };
        }
      })
    );
  };

  const updatePnL = (currentPrice) => {
    if (portfolio[selectedCoin]) {
      const position = portfolio[selectedCoin];
      const currentValue = position.amount * currentPrice;
      const pnlValue = currentValue - position.totalCost;
      const pnlPercentage = (pnlValue / position.totalCost) * 100;

      setPnl({
        total: pnlValue,
        percentage: pnlPercentage
      });

      // Update total P&L across all positions
      let totalPnL = 0;
      Object.entries(portfolio).forEach(([coin, pos]) => {
        if (coin === selectedCoin) {
          totalPnL += pnlValue;
        } else {
          totalPnL += pos.currentPnL || 0;
        }
      });
      setTotalPnL(totalPnL);
    }
  };

  const placeBuyOrder = () => {
    if (balance >= orderAmount) {
      const quantity = orderAmount / currentPrice;
      const newPortfolio = { ...portfolio };
      
      if (newPortfolio[selectedCoin]) {
        newPortfolio[selectedCoin].amount += quantity;
        newPortfolio[selectedCoin].totalCost += orderAmount;
        newPortfolio[selectedCoin].averagePrice = 
          newPortfolio[selectedCoin].totalCost / newPortfolio[selectedCoin].amount;
      } else {
        newPortfolio[selectedCoin] = {
          amount: quantity,
          totalCost: orderAmount,
          averagePrice: currentPrice,
          currentPnL: 0
        };
      }

      setPortfolio(newPortfolio);
      setBalance(prev => prev - orderAmount);
      
      const newTrade = {
        type: 'BUY',
        coin: selectedCoin,
        price: currentPrice,
        amount: quantity,
        total: orderAmount,
        timestamp: new Date(),
        currentPnL: 0,
        pnlPercentage: 0
      };
      
      setTrades(prev => [newTrade, ...prev]);
    }
  };

  const placeSellOrder = () => {
    const position = portfolio[selectedCoin];
    if (position && position.amount > 0) {
      const sellQuantity = orderAmount / currentPrice;
      if (sellQuantity <= position.amount) {
        const sellValue = sellQuantity * currentPrice;
        const costBasis = sellQuantity * position.averagePrice;
        const tradePnL = sellValue - costBasis;
        
        const newPortfolio = { ...portfolio };
        newPortfolio[selectedCoin].amount -= sellQuantity;
        newPortfolio[selectedCoin].totalCost -= costBasis;
        
        if (newPortfolio[selectedCoin].amount <= 0) {
          delete newPortfolio[selectedCoin];
        }

        setPortfolio(newPortfolio);
        setBalance(prev => prev + sellValue);
        
        const newTrade = {
          type: 'SELL',
          coin: selectedCoin,
          price: currentPrice,
          amount: sellQuantity,
          total: sellValue,
          timestamp: new Date(),
          realizedPnL: tradePnL,
          pnlPercentage: (tradePnL / costBasis) * 100
        };
        
        setTrades(prev => [newTrade, ...prev]);
        setTotalPnL(prev => prev + tradePnL);
      }
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={0} sx={{ p: 3, backgroundColor: 'background.paper', borderRadius: 2 }}>
        {/* Header Section */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Trading Simulator
          </Typography>
          <Button
            variant="contained"
            color={isBotActive ? 'error' : 'success'}
            startIcon={<SmartToyIcon />}
            onClick={() => setIsBotActive(!isBotActive)}
          >
            {isBotActive ? 'Stop Bot' : 'Start Bot'}
          </Button>
        </Box>

        {/* Main Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <AccountBalanceWalletIcon color="primary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Balance
                  </Typography>
                </Stack>
                <Typography variant="h5">
                  ${balance.toFixed(2)} USDT
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <ShowChartIcon color="primary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Current Price
                  </Typography>
                </Stack>
                <Typography variant="h5">
                  ${currentPrice.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  {totalPnL >= 0 ? (
                    <TrendingUpIcon color="success" />
                  ) : (
                    <TrendingDownIcon color="error" />
                  )}
                  <Typography variant="subtitle2" color="text.secondary">
                    Total P&L
                  </Typography>
                </Stack>
                <Typography 
                  variant="h5" 
                  color={totalPnL >= 0 ? 'success.main' : 'error.main'}
                >
                  ${totalPnL.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Trading Controls */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Trading Controls
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Select Coin
                </Typography>
                <Select
                  fullWidth
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value)}
                  size="small"
                >
                  {coins.map((coin) => (
                    <MenuItem key={coin} value={coin}>{coin}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Order Amount (USDT)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(Number(e.target.value))}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    onClick={placeBuyOrder}
                    startIcon={<TrendingUpIcon />}
                  >
                    Buy
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    onClick={placeSellOrder}
                    startIcon={<TrendingDownIcon />}
                  >
                    Sell
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Portfolio Section */}
        {portfolio[selectedCoin] && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Current Position
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="h6">
                    {portfolio[selectedCoin].amount.toFixed(6)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Average Price
                  </Typography>
                  <Typography variant="h6">
                    ${portfolio[selectedCoin].averagePrice.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Cost
                  </Typography>
                  <Typography variant="h6">
                    ${portfolio[selectedCoin].totalCost.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Unrealized P&L
                  </Typography>
                  <Typography 
                    variant="h6"
                    color={pnl.total >= 0 ? 'success.main' : 'error.main'}
                  >
                    ${pnl.total.toFixed(2)} ({pnl.percentage.toFixed(2)}%)
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Trade History */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Trade History
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Total</TableCell>
                    {/* <TableCell>P&L</TableCell> */}
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trades.map((trade, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip
                          label={trade.type}
                          size="small"
                          color={trade.type === 'BUY' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>${trade.price.toFixed(2)}</TableCell>
                      <TableCell>{trade.amount.toFixed(6)}</TableCell>
                      <TableCell>${trade.total.toFixed(2)}</TableCell>
                      {/* <TableCell>
                        <Typography
                          color={trade.currentPnL >= 0 ? 'success.main' : 'error.main'}
                        >
                          ${(trade.currentPnL || trade.realizedPnL || 0).toFixed(2)}
                        </Typography>
                      </TableCell> */}
                      <TableCell>
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Trading Bot Section */}
        {isBotActive && (
          <Box sx={{ mt: 3 }}>
            <TradingBot
              selectedCoin={selectedCoin}
              currentPrice={currentPrice}
              onBuy={placeBuyOrder}
              onSell={placeSellOrder}
              orderAmount={orderAmount}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default TradingSimulator;
