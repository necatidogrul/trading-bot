import React from 'react';
import { ThemeProvider, CssBaseline, Container, Box, Tab, Tabs, Paper } from '@mui/material';
import CryptoChart from './components/CryptoChart';
import TradingSimulator from './components/TradingSimulator';
import BacktestResults from './components/BacktestResults';
import { theme } from './theme';

function App() {
  const [currentTab, setCurrentTab] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh',
        backgroundColor: 'background.default',
        py: 3
      }}>
        <Container maxWidth="xl">
          <Paper elevation={0} sx={{ 
            p: 3,
            backgroundColor: 'background.paper',
            borderRadius: 2
          }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange}
                sx={{
                  '& .MuiTab-root': { 
                    fontSize: '1rem',
                    fontWeight: 600,
                    px: 4
                  }
                }}
              >
                <Tab label="Live Trading" />
                <Tab label="Backtest" />
              </Tabs>
            </Box>

            {currentTab === 0 && (
              <Box sx={{ display: 'grid', gap: 3 }}>
                <Box>
                  <CryptoChart />
                </Box>
                <Box>
                  <TradingSimulator />
                </Box>
              </Box>
            )}

            {currentTab === 1 && (
              <BacktestResults />
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
