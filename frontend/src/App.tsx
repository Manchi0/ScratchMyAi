import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import { ReactFlowProvider } from '@xyflow/react';
import { AppShell } from '@/pages/graph/layout/AppShell';

const AppShellWrapper = () => {
  return (
    <ReactFlowProvider>
      <AppShell />
    </ReactFlowProvider>
  );
};
const App = () => {
  return (
    <BrowserRouter>
      <div className="font-sans antialiased">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/graph" element={<AppShellWrapper />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
