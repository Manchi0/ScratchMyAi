import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { AppShell } from '@/pages/app/layout/AppShell';

const Home = () => {
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
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
