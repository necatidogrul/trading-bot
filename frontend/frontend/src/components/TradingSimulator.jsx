import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import TradingBot from './TradingBot';

function TradingSimulator() {
  const [balance, setBalance] = useState(10000);
  const [portfolio, setPortfolio] = useState({});
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [pnl, setPnl] = useState({ total: 0, percentage: 0 });
  const [totalPnL, setTotalPnL] = useState(0);
  const ws = useRef(null);

  const [trades, setTrades] = useState([]);
  const [orderAmount, setOrderAmount] = useState(100);

  const [isBotActive, setIsBotActive] = useState(false);

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
    <div className="trading-simulator" style={{ padding: '20px', backgroundColor: '#131722', color: '#fff' }}>
      <div className="trading-info" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Trading Simulator</h2>
          <button
            onClick={() => setIsBotActive(!isBotActive)}
            style={{
              padding: '8px 16px',
              backgroundColor: isBotActive ? '#ef5350' : '#26a69a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isBotActive ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>Balance: ${balance.toFixed(2)} USDT</div>
          <div>Current Price: ${currentPrice.toFixed(2)}</div>
          <div style={{ color: totalPnL >= 0 ? '#26a69a' : '#ef5350' }}>
            Total P&L: ${totalPnL.toFixed(2)}
          </div>
        </div>
        {portfolio[selectedCoin] && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#2a2e39', 
            borderRadius: '5px',
            marginBottom: '10px'
          }}>
            <h3>{selectedCoin} Position</h3>
            <div>Amount: {portfolio[selectedCoin].amount.toFixed(8)}</div>
            <div>Average Price: ${portfolio[selectedCoin].averagePrice.toFixed(2)}</div>
            <div style={{ color: pnl.total >= 0 ? '#26a69a' : '#ef5350' }}>
              Position P&L: ${pnl.total.toFixed(2)} ({pnl.percentage.toFixed(2)}%)
            </div>
          </div>
        )}
      </div>

      <div className="controls" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select 
          value={selectedCoin} 
          onChange={(e) => setSelectedCoin(e.target.value)}
          style={{ padding: '5px', backgroundColor: '#2a2e39', color: '#fff', border: '1px solid #363c4e' }}
        >
          {coins.map(coin => (
            <option key={coin} value={coin}>{coin}</option>
          ))}
        </select>

        <input
          type="number"
          value={orderAmount}
          onChange={(e) => setOrderAmount(Number(e.target.value))}
          placeholder="Order Amount (USDT)"
          style={{ padding: '5px', backgroundColor: '#2a2e39', color: '#fff', border: '1px solid #363c4e' }}
        />

        <button 
          onClick={placeBuyOrder}
          style={{ padding: '5px 15px', backgroundColor: '#26a69a', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Buy
        </button>
        <button 
          onClick={placeSellOrder}
          style={{ padding: '5px 15px', backgroundColor: '#ef5350', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Sell
        </button>
      </div>

      {isBotActive && (
        <TradingBot
          selectedCoin={selectedCoin}
          currentPrice={currentPrice}
          onBuy={placeBuyOrder}
          onSell={placeSellOrder}
          isActive={isBotActive}
          orderAmount={orderAmount}
        />
      )}

      <div className="trades" style={{ marginTop: '20px' }}>
        <h3>Recent Trades</h3>
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {trades.map((trade, index) => (
            <div 
              key={index}
              style={{ 
                padding: '10px',
                backgroundColor: '#2a2e39',
                marginBottom: '5px',
                borderLeft: `4px solid ${trade.type === 'BUY' ? '#26a69a' : '#ef5350'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  {trade.type} {trade.coin}: {trade.amount.toFixed(8)} @ ${trade.price.toFixed(2)}
                </div>
                <div>
                  Total: ${trade.total.toFixed(2)}
                </div>
              </div>
              <div style={{ 
                marginTop: '5px',
                color: trade.type === 'SELL' 
                  ? (trade.realizedPnL >= 0 ? '#26a69a' : '#ef5350')
                  : (trade.currentPnL >= 0 ? '#26a69a' : '#ef5350')
              }}>
                {trade.type === 'SELL' 
                  ? `Realized P&L: $${trade.realizedPnL.toFixed(2)} (${trade.pnlPercentage.toFixed(2)}%)`
                  : `Unrealized P&L: $${trade.currentPnL?.toFixed(2)} (${trade.pnlPercentage?.toFixed(2)}%)`
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TradingSimulator;
