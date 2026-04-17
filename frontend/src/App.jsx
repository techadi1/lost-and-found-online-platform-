import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import ReportItem from './pages/ReportItem';
import HelpDesk from './pages/HelpDesk';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lost" element={<Home />} />
          <Route path="/found" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/report" element={<ReportItem />} />
          <Route path="/help-desk" element={<HelpDesk />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

