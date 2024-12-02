import React from 'react';
import CryptoChart from './components/CryptoChart';
import TradingSimulator from './components/TradingSimulator';
import BacktestResults from './components/BacktestResults';
import { Box, Tab, Tabs } from '@mui/material';

function App() {
  const [currentTab, setCurrentTab] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <div style={{ backgroundColor: '#131722', minHeight: '100vh', padding: '20px' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': { color: '#fff' },
            '& .Mui-selected': { color: '#26a69a' },
            '& .MuiTabs-indicator': { backgroundColor: '#26a69a' }
          }}
        >
          <Tab label="Live Trading" />
          <Tab label="Backtest" />
        </Tabs>
      </Box>

      {currentTab === 0 && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <CryptoChart />
          </div>
          <div>
            <TradingSimulator />
          </div>
        </>
      )}

      {currentTab === 1 && (
        <BacktestResults />
      )}
    </div>
  );
}

export default App;
