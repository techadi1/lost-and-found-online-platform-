import React, { useState, useEffect } from 'react';
import { FiSend, FiMessageCircle, FiClock, FiCheckCircle, FiAlertCircle, FiPlus, FiChevronRight, FiUser, FiInfo } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import { API_URL } from '../config';

const HelpDesk = () => {
  const [tickets, setTickets] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    relatedItemId: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  useEffect(() => {
    if (!userInfo || userInfo.role === 'admin') {
      navigate(userInfo?.role === 'admin' ? '/admin' : '/login');
      return;
    }
    fetchData();
  }, [navigate]);

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
      
      const [ticketsRes, itemsRes] = await Promise.all([
        fetch(`${API_URL}/support/user/${userInfo._id}`, { headers }),
        fetch(`${API_URL}/items`, { headers })
      ]);

      if (!ticketsRes.ok || !itemsRes.ok) throw new Error('Failed to fetch data');

      const ticketsData = await ticketsRes.json();
      const itemsData = await itemsRes.json();

      setTickets(ticketsData);
      setItems(itemsData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = userInfo?.token;
      
      const response = await fetch(`${API_URL}/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          ...newTicket,
          userId: userInfo._id
        }),
      });

      if (response.ok) {
        setShowModal(false);
        setNewTicket({ subject: '', message: '', relatedItemId: '' });
        fetchData();
        alert('Ticket submitted successfully! Admin will get back to you soon.');
      } else {
        alert('Failed to submit ticket');
      }
    } catch (err) {
      alert('Error submitting ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container" style={{padding: '100px 0'}}>Loading help desk...</div>;

  return (
    <div className="admin-page fade-in">
      <div className="container">
        <header className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h1>Help Desk</h1>
            <p>Talk to admin about wrong claims or finding real owners</p>
          </div>
          <button onClick={() => setShowModal(true)} className="login-submit-btn" style={{width: 'auto', padding: '10px 20px'}}>
            <FiPlus /> New Support Request
          </button>
        </header>

        <section className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon"><FiMessageCircle /></div>
            <div className="stat-info">
              <span className="stat-label">Total Tickets</span>
              <span className="stat-value">{tickets.length}</span>
            </div>
          </div>
          <div className="stat-card orange">
            <div className="stat-icon"><FiClock /></div>
            <div className="stat-info">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length}</span>
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon"><FiCheckCircle /></div>
            <div className="stat-info">
              <span className="stat-label">Resolved</span>
              <span className="stat-value">{tickets.filter(t => t.status === 'Resolved').length}</span>
            </div>
          </div>
        </section>

        <section className="table-container">
          <div className="table-header">
            <h2>Your Support Requests</h2>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Related Item</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Admin Reply</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length > 0 ? tickets.map(ticket => (
                  <tr key={ticket._id}>
                    <td>
                      <div style={{fontWeight: '600'}}>{ticket.subject}</div>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px'}}>{ticket.message}</div>
                    </td>
                    <td>{ticket.relatedItemId?.title || 'N/A'}</td>
                    <td>
                      <span className={`status-pill ${(ticket.status || 'unknown').toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                    <td style={{maxWidth: '300px'}}>
                      {ticket.adminReply ? (
                        <div style={{background: '#f8fafc', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #3b82f6'}}>
                          <div style={{fontSize: '0.75rem', fontWeight: '700', color: '#1e40af', marginBottom: '4px'}}>ADMIN RESPONSE:</div>
                          <p style={{fontSize: '0.85rem', color: '#1e293b'}}>{ticket.adminReply}</p>
                          <small style={{color: '#64748b'}}>{new Date(ticket.adminRepliedAt).toLocaleString()}</small>
                        </div>
                      ) : (
                        <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Waiting for response...</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center', padding: '40px'}}>
                      No support tickets yet. Need help? Create a new request!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Info Section for finding real owner */}
        <section style={{marginTop: '40px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid #bfdbfe'}}>
          <div style={{display: 'flex', gap: '20px'}}>
            <div style={{fontSize: '2.5rem', color: '#2563eb'}}><FiInfo /></div>
            <div>
              <h3 style={{color: '#1e40af', marginBottom: '10px'}}>How we help find the real owner</h3>
              <p style={{color: '#1e3a8a', lineHeight: '1.6'}}>
                If you suspect a claim is false, or you're having trouble identifying the real owner of an item you found, our administrative team can step in. 
                We can verify identity documents, review proof of purchase (for electronics/valuables), and moderate disputes between claimants and reporters 
                to ensure items return to their rightful homes.
              </p>
            </div>
          </div>
        </section>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>New Support Request</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><FiChevronRight style={{transform: 'rotate(90deg)'}} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Issue Subject</label>
                <select 
                  value={newTicket.subject} 
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                  required
                >
                  <option value="">Select subject...</option>
                  <option value="Wrong Claim by Another User">Wrong Claim by Another User</option>
                  <option value="Help Identifying Owner">Help Identifying Owner</option>
                  <option value="Item Damage/State Issue">Item Damage/State Issue</option>
                  <option value="Account/Platform Issue">Account/Platform Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Related Item (Optional)</label>
                <select 
                  value={newTicket.relatedItemId} 
                  onChange={(e) => setNewTicket({...newTicket, relatedItemId: e.target.value})}
                >
                  <option value="">No specific item</option>
                  {items.map(item => (
                    <option key={item._id} value={item._id}>{item.title} ({item.status})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Describe your issue</label>
                <textarea 
                  value={newTicket.message} 
                  onChange={(e) => setNewTicket({...newTicket, message: e.target.value})}
                  placeholder="Please provide as much detail as possible to help us resolve the issue..."
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Submit Request'} <FiSend style={{marginLeft: '8px'}} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpDesk;
