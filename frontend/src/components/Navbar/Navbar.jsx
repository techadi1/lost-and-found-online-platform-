import React, { useState, useEffect } from 'react';
import { FiSearch, FiPlus, FiGrid, FiUser, FiLogOut, FiAlertCircle, FiBell } from 'react-icons/fi';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';
import { API_URL } from '../../config';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    setUser(userInfo);
    
    if (userInfo && userInfo.role !== 'admin') {
      fetchNotifications(userInfo);
    }
  }, [location]);

  const fetchNotifications = async (userInfo) => {
    try {
      const token = userInfo?.token;
      const response = await fetch(`${API_URL}/notifications?userId=${userInfo._id}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      if (response.ok) {
        const notifications = await response.json();
        const unread = notifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className="navbar-wrapper">
      <div className="top-red-line"></div>
      
      <div className="logo-header">
        <div className="container header-container">
          <Link to="/" className="main-logo">
            <img src="/logo.png" alt="Bennett Logo" className="logo-img" />
            <div className="logo-separator"></div>
            <span className="platform-name">Lost & Found Portal</span>
          </Link>
        </div>
      </div>

      <div className="nav-bar-blue">
        <div className="container nav-content">
          <div className="nav-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
            <Link to="/lost" className={`nav-link ${location.pathname === '/lost' ? 'active' : ''}`}>Lost Items</Link>
            <Link to="/found" className={`nav-link ${location.pathname === '/found' ? 'active' : ''}`}>Found Items</Link>
          </div>

          <div className="nav-actions">
            {user ? (
              <>
                {user.role !== 'admin' && (
                  <>
                    <Link to="/help-desk" className="nav-action-item">
                      <FiAlertCircle />
                      <span>Help Desk</span>
                    </Link>
                    <Link to="/dashboard" className="notification-bell">
                      <FiBell />
                      {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                    </Link>
                  </>
                )}
                <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="nav-action-item">
                  <FiGrid />
                  <span>{user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}</span>
                </Link>
                <Link to="/report?status=Lost" className="btn-report">
                  <FiPlus /> Report Item
                </Link>
                <button onClick={handleLogout} className="logout-btn">
                  <FiLogOut />
                </button>
              </>
            ) : (
              <Link to="/login" className="login-pill">
                <FiUser />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

