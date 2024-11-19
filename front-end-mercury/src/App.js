import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Drivers from './Pages/Drivers';
import InactiveDrivers from './Pages/InactiveDrivers'
import ActiveCompanies from './Pages/ActiveCompanies'
import React, { useState } from 'react';
import Home from './Pages/Home';

function App() {
  return (

    <BrowserRouter>
      {/* Header is displayed on all pages */}
      <Header />
      <Routes>
        {/* Define routes for the app */}
        <Route path="/" element={<Home></Home>} />
        <Route path="/ActiveDrivers" element={<Drivers></Drivers>} />
        <Route path="/InactiveDrivers" element={<InactiveDrivers></InactiveDrivers>} />
        <Route path="/ActiveCompanies" element={<ActiveCompanies></ActiveCompanies>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
