import React, { useState } from 'react';
import axios from 'axios';

function StrategySettings() {
  const [strategy, setStrategy] = useState('RSI');

  const handleTrade = () => {
    axios.post('http://localhost:5000/api/trade', { symbol: 'BTCUSDT', strategy })
      .then(response => console.log(response.data))
      .catch(error => console.error(error));
  };

  return (
    <div>
      <h2>Strategy Settings</h2>
      <select onChange={e => setStrategy(e.target.value)} value={strategy}>
        <option value="RSI">RSI</option>
        <option value="BollingerBands">Bollinger Bands</option>
      </select>
      <button onClick={handleTrade}>Execute Trade</button>
    </div>
  );
}

export default StrategySettings;
