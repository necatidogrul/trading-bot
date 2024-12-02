import React, { useState } from 'react';
import axios from 'axios';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Typography,
    Box,
    CircularProgress
} from '@mui/material';

const BacktestResults = () => {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        symbol: 'BTCUSDT',
        interval: '1m',
        startDate: '',
        endDate: '',
        bbLength: 20,
        bbStd: 2,
        rsiLength: 14,
        rsiBuy: 30,
        rsiSell: 70,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        smaLength: 50
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const runBacktest = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('http://localhost:5000/api/backtest', formData);
            setResults(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString();
    };

    const formatNumber = (num, decimals = 2) => {
        return Number(num).toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    };

    return (
        <Box sx={{ p: 3, backgroundColor: '#fff', borderRadius: 2 }}>
            <Typography variant="h4" gutterBottom>
                Backtest Results
            </Typography>

            {/* Form */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        fullWidth
                        label="Symbol"
                        name="symbol"
                        value={formData.symbol}
                        onChange={handleInputChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Interval</InputLabel>
                        <Select
                            name="interval"
                            value={formData.interval}
                            onChange={handleInputChange}
                            label="Interval"
                        >
                            <MenuItem value="1m">1 minute</MenuItem>
                            <MenuItem value="5m">5 minutes</MenuItem>
                            <MenuItem value="15m">15 minutes</MenuItem>
                            <MenuItem value="1h">1 hour</MenuItem>
                            <MenuItem value="4h">4 hours</MenuItem>
                            <MenuItem value="1d">1 day</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        fullWidth
                        type="datetime-local"
                        label="Start Date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        fullWidth
                        type="datetime-local"
                        label="End Date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>

                {/* Indicator Parameters */}
                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                        Indicator Parameters
                    </Typography>
                </Grid>
                
                {/* Bollinger Bands */}
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="BB Length"
                        name="bbLength"
                        value={formData.bbLength}
                        onChange={handleInputChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="BB STD"
                        name="bbStd"
                        value={formData.bbStd}
                        onChange={handleInputChange}
                    />
                </Grid>

                {/* RSI */}
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="RSI Length"
                        name="rsiLength"
                        value={formData.rsiLength}
                        onChange={handleInputChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="RSI Buy"
                        name="rsiBuy"
                        value={formData.rsiBuy}
                        onChange={handleInputChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="RSI Sell"
                        name="rsiSell"
                        value={formData.rsiSell}
                        onChange={handleInputChange}
                    />
                </Grid>

                {/* MACD */}
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="MACD Fast"
                        name="macdFast"
                        value={formData.macdFast}
                        onChange={handleInputChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="MACD Slow"
                        name="macdSlow"
                        value={formData.macdSlow}
                        onChange={handleInputChange}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="MACD Signal"
                        name="macdSignal"
                        value={formData.macdSignal}
                        onChange={handleInputChange}
                    />
                </Grid>

                {/* SMA */}
                <Grid item xs={12} sm={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="SMA Length"
                        name="smaLength"
                        value={formData.smaLength}
                        onChange={handleInputChange}
                    />
                </Grid>

                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        onClick={runBacktest}
                        disabled={loading}
                        sx={{ position: 'relative' }}
                    >
                        {loading ? 'Running...' : 'Run Backtest'}
                        {loading && (
                            <CircularProgress
                                size={24}
                                sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    marginTop: '-12px',
                                    marginLeft: '-12px',
                                }}
                            />
                        )}
                    </Button>
                </Grid>
            </Grid>

            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    Error: {error}
                </Typography>
            )}

            {loading && (
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '200px',
                    backgroundColor: '#fff',
                    borderRadius: 1,
                    p: 3,
                    mb: 2
                }}>
                    <CircularProgress />
                    <Typography variant="h6" sx={{ ml: 2 }}>
                        Running backtest...
                    </Typography>
                </Box>
            )}

            {results && !loading && (
                <>
                    {/* Summary */}
                    <Paper sx={{ p: 2, mb: 2, backgroundColor: '#fff' }}>
                        <Typography variant="h6" gutterBottom>
                            Summary
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="body2" color="text.secondary">
                                    Total Return
                                </Typography>
                                <Typography variant="h6" color={results.total_return_pct >= 0 ? 'success.main' : 'error.main'}>
                                    {formatNumber(results.total_return_pct)}%
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="body2" color="text.secondary">
                                    Number of Trades
                                </Typography>
                                <Typography variant="h6">
                                    {results.num_trades}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="body2" color="text.secondary">
                                    Win Rate
                                </Typography>
                                <Typography variant="h6">
                                    {formatNumber(results.win_rate)}%
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="body2" color="text.secondary">
                                    Avg. Profit per Trade
                                </Typography>
                                <Typography variant="h6" color={results.avg_profit_per_trade >= 0 ? 'success.main' : 'error.main'}>
                                    {formatNumber(results.avg_profit_per_trade)}%
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Trades Table */}
                    <TableContainer component={Paper} sx={{ backgroundColor: '#fff' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Entry Time</TableCell>
                                    <TableCell>Exit Time</TableCell>
                                    <TableCell align="right">Entry Price</TableCell>
                                    <TableCell align="right">Exit Price</TableCell>
                                    <TableCell align="right">Profit %</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {results.trades.map((trade, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{formatDate(trade.entry_time)}</TableCell>
                                        <TableCell>{formatDate(trade.exit_time)}</TableCell>
                                        <TableCell align="right">{formatNumber(trade.entry_price, 4)}</TableCell>
                                        <TableCell align="right">{formatNumber(trade.exit_price, 4)}</TableCell>
                                        <TableCell
                                            align="right"
                                            sx={{
                                                color: trade.profit_pct >= 0 ? 'success.main' : 'error.main'
                                            }}
                                        >
                                            {formatNumber(trade.profit_pct)}%
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>
            )}
        </Box>
    );
};

export default BacktestResults;