import './index.css';
import {useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import Header from './components/Header';
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <Header>
        <Routes>
          <Route path ='/' elemnt = {<Home />} />
        </Routes>
      </Header>
    </BrowserRouter>
  );
}

export default App;
