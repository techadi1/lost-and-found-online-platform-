import React, { useState, useEffect } from 'react';
import { FiBox, FiCheckCircle, FiClock, FiTrash2, FiPlus, FiAward, FiUser } from 'react-icons/fi';
import { useNavigate, Link } from 'react-router-dom';
import './AdminDashboard.css'; // Reusing styles
import { API_URL, API_BASE_URL } from '../config';

const UserDashboard = () => {
  const [items, setItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [replyMessages, setReplyMessages] = useState({}); // {claimId: message}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' or 'found'
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  const handleSendReply = async (claimId) => {
    const text = replyMessages[claimId];
    if (!text?.trim()) return;

    try {
      const token = userInfo?.token;
      const response = await fetch(`${API_URL}/claims/${claimId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const updatedClaim = await response.json();
        setMyClaims(myClaims.map(c => c._id === updatedClaim._id ? { ...c, messages: updatedClaim.messages } : c));
        setReplyMessages({ ...replyMessages, [claimId]: '' });
      } else {
        alert('Failed to send reply');
      }
    } catch (err) {
      alert('Error sending reply');
    }
  };

  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
      return;
    }

    // Load cached data for instant feel
    const cachedData = localStorage.getItem(`dashboard_cache_${userInfo._id}`);
    if (cachedData) {
      const { items, notifications, myClaims } = JSON.parse(cachedData);
      setItems(items);
      setNotifications(notifications);
      setMyClaims(myClaims);
      setLoading(false); // Can skip loading state if cache exists
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = userInfo?.token;
        
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const [itemsRes, notifRes, claimsRes] = await Promise.all([
          fetch(`${API_URL}/items?userId=${userInfo._id}`, { headers }),
          fetch(`${API_URL}/notifications?userId=${userInfo._id}`, { headers }),
          fetch(`${API_URL}/claims`, { headers })
        ]);
        
        if (!itemsRes.ok || !notifRes.ok || !claimsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const itemsData = await itemsRes.json();
        const notifData = await notifRes.json();
        const claimsData = await claimsRes.json();
        
        setItems(itemsData);
        setNotifications(notifData);
        // Only show my claims
        const processedClaims = claimsData.filter(c => c.claimantId?._id === userInfo._id || c.claimantId === userInfo._id);
        setMyClaims(processedClaims);
        
        // Cache data for next time
        localStorage.setItem(`dashboard_cache_${userInfo._id}`, JSON.stringify({
          items: itemsData,
          notifications: notifData,
          myClaims: processedClaims
        }));

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const markAsRead = async (id) => {
    try {
      const token = userInfo?.token;
      
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      if (response.ok) {
        setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        const token = userInfo?.token;
        
        const response = await fetch(`${API_URL}/items/${id}`, {
          method: 'DELETE',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
        });
        if (response.ok) {
          setItems(items.filter(item => item._id !== id));
        } else {
          alert('Failed to delete report');
        }
      } catch (err) {
        alert('Error deleting report');
      }
    }
  };

  const activeItems = items.filter(i => i.status && i.status.toLowerCase() !== 'claimed' && (i.reportedBy?._id === userInfo._id || i.reportedBy === userInfo._id));
  const claimedByMe = myClaims;
  
  const filteredItems = filter === 'found' ? activeItems.filter(i => i.status.toLowerCase() === 'found') : activeItems;

  const stats = [
    { label: 'My Reports', value: activeItems.length.toString(), icon: <FiBox />, color: 'blue' },
    { label: 'Found Items', value: activeItems.filter(i => i.status.toLowerCase() === 'found').length.toString(), icon: <FiCheckCircle />, color: 'green' },
    { label: 'Lost Items', value: activeItems.filter(i => i.status.toLowerCase() === 'lost').length.toString(), icon: <FiClock />, color: 'orange' },
    { label: 'My Claims', value: claimedByMe.length.toString(), icon: <FiAward />, color: 'purple' },
  ];

  if (loading) return (
    <div className="admin-page" style={{padding: '100px 0'}}>
      <div className="container">
        <header className="page-header">
          <div className="skeleton" style={{width: '300px', height: '40px', marginBottom: '10px'}}></div>
          <div className="skeleton" style={{width: '200px', height: '20px'}}></div>
        </header>
        <div className="stats-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-card skeleton" style={{height: '100px'}}></div>
          ))}
        </div>
        <div className="skeleton" style={{width: '100%', height: '400px', marginTop: '40px', borderRadius: '12px'}}></div>
      </div>
    </div>
  );

  return (
    <div className="admin-page fade-in">
      <div className="container">
        <header className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h1>Welcome, {userInfo.name}</h1>
            <p>Track and manage your lost and found reports</p>
          </div>
          <Link to="/report" className="login-submit-btn" style={{width: 'auto', padding: '10px 20px', textDecoration: 'none'}}>
            <FiPlus /> New Report
          </Link>
        </header>

        <section className="stats-grid">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={`stat-card ${stat.color} ${filter === 'all' && index === 0 ? 'active' : filter === 'found' && index === 1 ? 'active' : ''}`}
              style={{cursor: 'pointer', transition: 'all 0.2s'}}
              onClick={() => {
                if (index === 0) setFilter('all');
                else if (index === 1) setFilter('found');
                else if (index === 2) setFilter('all');
              }}
            >
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="table-container" style={{marginBottom: '40px'}}>
          <div className="table-header">
            <h2>Notifications & Messages</h2>
          </div>
          <div className="notifications-list" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto'}}>
            {notifications.length > 0 ? notifications.map(notif => (
              <div 
                key={notif._id} 
                className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                style={{
                  padding: '1rem', 
                  borderRadius: '8px', 
                  background: notif.isRead ? '#f8fafc' : '#eff6ff',
                  border: `1px solid ${notif.isRead ? '#e2e8f0' : '#bfdbfe'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <h4 style={{fontSize: '0.95rem', fontWeight: '600', marginBottom: '4px', color: notif.isRead ? '#64748b' : '#1e40af'}}>
                    {notif.title}
                  </h4>
                  <p style={{fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.4'}}>{notif.message}</p>
                  <span style={{fontSize: '0.75rem', color: '#9ca3af'}}>
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
                {!notif.isRead && (
                  <button 
                    onClick={() => markAsRead(notif._id)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      marginLeft: '15px'
                    }}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            )) : (
              <p style={{textAlign: 'center', color: '#9ca3af', padding: '20px'}}>No notifications yet.</p>
            )}
          </div>
        </section>

        <section className="table-container">
          <div className="table-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h2>Your Recent Reports</h2>
            <div className="filter-tabs">
              <button 
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All Items
              </button>
              <button 
                className={`filter-tab ${filter === 'found' ? 'active' : ''}`}
                onClick={() => setFilter('found')}
              >
                Found Items
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Approval Status</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <tr key={item._id}>
                      <td>
                        <div className="item-cell">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl.startsWith('/uploads/') ? `${API_BASE_URL}${item.imageUrl}` : item.imageUrl} 
                              alt="" 
                              className="item-thumb"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="item-thumb" style={{
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '1.5rem',
                              fontWeight: 'bold'
                            }}>
                              {item.title.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{item.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${item.isApproved ? 'approved' : 'pending'}`}>
                          {item.isApproved ? 'Approved' : 'Pending Approval'}
                        </span>
                      </td>
                      <td>{item.category}</td>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="icon-btn delete" 
                            onClick={() => handleDelete(item._id)}
                            title="Delete Report"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{textAlign: 'center', padding: '40px'}}>
                      No active reports found. <Link to="/report">Report something now!</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {claimedByMe.length > 0 && (
          <section className="table-container" style={{marginTop: '40px'}}>
            <div className="table-header">
              <h2>My Claims</h2>
            </div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Original Reporter</th>
                    <th>Status</th>
                    <th>Claimed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {claimedByMe.map(claim => (
                    <tr key={claim._id}>
                      <td>
                        <div className="item-cell">
                          {claim.itemId?.imageUrl && (
                            <img 
                              src={claim.itemId.imageUrl.startsWith('/uploads/') ? `${API_BASE_URL}${claim.itemId.imageUrl}` : claim.itemId.imageUrl} 
                              alt="" 
                              className="item-thumb" 
                            />
                          )}
                          <span>{claim.itemId?.title || 'Unknown Item'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="user-cell" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <FiUser />
                          <span>{claim.itemId?.reportedBy?.name || 'Admin'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${claim.status.toLowerCase()}`}>
                          {claim.status}
                        </span>
                        
                        {/* Chat History */}
                        {claim.messages && claim.messages.length > 0 && (
                          <div style={{marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                            {claim.messages.map((msg, idx) => (
                              <div key={idx} style={{
                                alignSelf: msg.sender?._id === userInfo._id || msg.sender === userInfo._id ? 'flex-end' : 'flex-start',
                                background: msg.sender?._id === userInfo._id || msg.sender === userInfo._id ? '#3b82f6' : '#f1f5f9',
                                color: msg.sender?._id === userInfo._id || msg.sender === userInfo._id ? 'white' : '#475569',
                                padding: '5px 10px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                maxWidth: '90%'
                              }}>
                                <strong>{msg.sender?._id === userInfo._id || msg.sender === userInfo._id ? 'Me: ' : 'Admin: '}</strong>
                                {msg.text}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Input */}
                        {claim.status === 'pending' && (
                          <div style={{marginTop: '10px', display: 'flex', gap: '5px'}}>
                            <input 
                              type="text" 
                              placeholder="Reply to admin..." 
                              value={replyMessages[claim._id] || ''}
                              onChange={(e) => setReplyMessages({...replyMessages, [claim._id]: e.target.value})}
                              style={{flex: 1, padding: '5px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #e2e8f0'}}
                            />
                            <button 
                              onClick={() => handleSendReply(claim._id)} 
                              className="btn btn-primary" 
                              style={{padding: '5px 10px', fontSize: '0.75rem'}}
                              disabled={!replyMessages[claim._id]?.trim()}
                            >
                              <FiSend />
                            </button>
                          </div>
                        )}

                        {claim.collectionTime && claim.status === 'approved' && (
                          <div style={{fontSize: '0.8rem', color: '#047857', marginTop: '5px', background: '#ecfdf5', padding: '5px', borderRadius: '4px'}}>
                            <strong>Slot:</strong> {claim.collectionTime}
                          </div>
                        )}
                      </td>
                      <td>{new Date(claim.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
