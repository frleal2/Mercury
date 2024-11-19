import './index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Drivers from './Pages/Drivers';
import InactiveDrivers from './Pages/InactiveDrivers'

function App() {
  return (
    <BrowserRouter>
      {/* Header is displayed on all pages */}
      <Header />
      <Routes>
        {/* Define routes for the app */}
        <Route path="/" element={<h1>Welcome to the App</h1>} />
        <Route path="/ActiveDrivers" element={<Drivers></Drivers>} />
        <Route path="/InactiveDrivers" element={<InactiveDrivers></InactiveDrivers>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
