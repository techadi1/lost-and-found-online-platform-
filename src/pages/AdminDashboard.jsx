import React, { useState, useEffect } from 'react';
import { FiBox, FiCheckCircle, FiClock, FiTrash2, FiEdit2, FiX, FiSave, FiAward, FiUser, FiInfo } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import { API_URL, API_BASE_URL } from '../config';

const AdminDashboard = () => {
  const [items, setItems] = useState([]);
  const [claimRecords, setClaimRecords] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    pendingApprovals: 0,
    totalClaims: 0,
    openTickets: 0,
    resolvedTickets: 0,
  });
  const [editingItem, setEditingItem] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [adminReply, setAdminReply] = useState('');
  const [ticketStatus, setTicketStatus] = useState('Open');
  const [selectedEditImage, setSelectedEditImage] = useState(null);

  const [showAskModal, setShowAskModal] = useState(false);
  const [askMessage, setAskMessage] = useState('');
  const [targetItem, setTargetItem] = useState(null);
  const [itemFilter, setItemFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('reports');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || userInfo.role !== 'admin') {
      navigate('/login');
      return;
    }

    // High speed cache load
    const cachedStats = localStorage.getItem('admin_stats_cache');
    const cachedItems = localStorage.getItem('admin_items_cache');
    if (cachedStats) setAnalytics(JSON.parse(cachedStats));
    if (cachedItems) {
      setItems(JSON.parse(cachedItems));
      setLoading(false);
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const [itemsRes, claimsRes, supportRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/items?isAdmin=true&excludeImage=true`, { headers }), // Exclude image for faster initial load
        fetch(`${API_URL}/claims`, { headers }),
        fetch(`${API_URL}/support`, { headers }),
        fetch(`${API_URL}/admin/stats`, { headers })
      ]);
      
      if (!itemsRes.ok || !claimsRes.ok || !supportRes.ok || !statsRes.ok) throw new Error('Failed to fetch data');

      const itemsData = await itemsRes.json();
      const claimsData = await claimsRes.json();
      const supportData = await supportRes.json();
      const statsData = await statsRes.json();

      setItems(itemsData);
      setClaimRecords(claimsData);
      setSupportTickets(supportData);
      setAnalytics({
        pendingApprovals: statsData.items.pending || 0,
        totalClaims: statsData.totalClaims || 0,
        openTickets: statsData.tickets.open || 0,
        resolvedTickets: statsData.tickets.resolved || 0,
      });

      // Cache for next time
      localStorage.setItem('admin_stats_cache', JSON.stringify({
        pendingApprovals: statsData.items.pending || 0,
        totalClaims: statsData.totalClaims || 0,
        openTickets: statsData.tickets.open || 0,
        resolvedTickets: statsData.tickets.resolved || 0,
        lastUpdated: new Date()
      }));
      localStorage.setItem('admin_items_cache', JSON.stringify(itemsData));

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const dashboardStats = {
    totalItems: items.length,
    pendingApprovals: items.filter(i => !i.isApproved).length,
    approvedItems: items.filter(i => i.isApproved).length,
    lostItems: items.filter(i => i.status.toLowerCase() === 'lost').length,
    foundItems: items.filter(i => i.status.toLowerCase() === 'found').length,
    totalClaims: claimRecords.length,
    pendingClaims: claimRecords.filter(c => c.status.toLowerCase() === 'pending').length,
    approvedClaims: claimRecords.filter(c => c.status.toLowerCase() === 'approved').length,
    totalTickets: supportTickets.length,
    openTickets: supportTickets.filter(t => t.status.toLowerCase() === 'open').length,
    resolvedTickets: supportTickets.filter(t => t.status.toLowerCase() === 'resolved').length,
  };

  const handleApproveItem = async (id) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      
      const response = await fetch(`${API_URL}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ isApproved: true }),
      });
      if (response.ok) {
        fetchData();
        alert('Item approved successfully!');
      } else {
        alert('Failed to approve item');
      }
    } catch (err) {
      alert('Error approving item');
    }
  };

  const handleDisapproveItem = async (id) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      
      const response = await fetch(`${API_URL}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ isApproved: false }),
      });
      if (response.ok) {
        fetchData();
        alert('Item disapproved and removed from public display');
      } else {
        alert('Failed to disapprove item');
      }
    } catch (err) {
      alert('Error disapproving item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
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
          alert('Failed to delete item');
        }
      } catch (err) {
        alert('Error deleting item');
      }
    }
  };

  const handleDeleteClaim = async (id) => {
    if (window.confirm('Are you sure you want to remove this claim record? This will restore the item if it was approved.')) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo?.token;
        
        const response = await fetch(`${API_URL}/claims/${id}`, {
          method: 'DELETE',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
        });
        if (response.ok) {
          fetchData();
          alert('Claim record removed successfully');
        } else {
          alert('Failed to remove claim record');
        }
      } catch (err) {
        alert('Error removing claim record');
      }
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(editingItem).forEach(key => {
      // Don't append objects like userId, claimRecords
      if (typeof editingItem[key] !== 'object' || editingItem[key] === null) {
        formData.append(key, editingItem[key]);
      }
    });
    
    if (selectedEditImage) {
      formData.append('image', selectedEditImage);
    }

    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      
      const response = await fetch(`${API_URL}/items/${editingItem._id}`, {
        method: 'PUT',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData,
      });

      if (response.ok) {
        fetchData();
        setShowItemModal(false);
        setEditingItem(null);
        setSelectedEditImage(null);
        alert('Item updated successfully!');
      } else {
        alert('Failed to update item');
      }
    } catch (err) {
      alert('Error updating item');
    }
  };

  const handleSendClaimMessage = async (e) => {
    e.preventDefault();
    if (!askMessage.trim()) return;

    try {
      const token = userInfo?.token;
      const response = await fetch(`${API_URL}/claims/${editingClaim._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: askMessage }),
      });

      if (response.ok) {
        const updatedClaim = await response.json();
        // Update the claim in the local list to show the new message
        setClaimRecords(claimRecords.map(c => c._id === updatedClaim._id ? { ...c, messages: updatedClaim.messages } : c));
        setEditingClaim({ ...editingClaim, messages: updatedClaim.messages });
        setAskMessage('');
      } else {
        alert('Failed to send message');
      }
    } catch (err) {
      alert('Error sending message');
    }
  };

  const handleUpdateClaimStatus = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      
      const response = await fetch(`${API_URL}/claims/${editingClaim._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          status: editingClaim.status,
          adminNotes: editingClaim.adminNotes
        }),
      });

      if (response.ok) {
        fetchData();
        setShowClaimModal(false);
        setEditingClaim(null);
        alert('Claim record updated successfully!');
      } else {
        alert('Failed to update claim record');
      }
    } catch (err) {
      alert('Error updating claim record');
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      
      const response = await fetch(`${API_URL}/support/${editingTicket._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          status: ticketStatus,
          adminReply: adminReply
        }),
      });

      if (response.ok) {
        fetchData();
        setShowTicketModal(false);
        setEditingTicket(null);
        setAdminReply('');
        alert('Support ticket updated successfully!');
      } else {
        alert('Failed to update ticket');
      }
    } catch (err) {
      alert('Error updating ticket');
    }
  };

  const handleDeleteTicket = async (id) => {
    if (window.confirm('Are you sure you want to delete this support ticket?')) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = userInfo?.token;
        
        const response = await fetch(`${API_URL}/support/${id}`, {
          method: 'DELETE',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
        });
        if (response.ok) {
          setSupportTickets(supportTickets.filter(ticket => ticket._id !== id));
          alert('Ticket deleted successfully');
        } else {
          alert('Failed to delete ticket');
        }
      } catch (err) {
        alert('Error deleting ticket');
      }
    }
  };

  const handleAskUser = async (e) => {
    e.preventDefault();
    if (!targetItem?.reportedBy?._id) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      
      const response = await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          userId: targetItem.reportedBy._id,
          title: `Admin Question: ${targetItem.title}`,
          message: askMessage,
          type: 'admin_message',
          relatedItemId: targetItem._id
        }),
      });

      if (response.ok) {
        setShowAskModal(false);
        setAskMessage('');
        setTargetItem(null);
        alert('Message sent to user successfully!');
      } else {
        alert('Failed to send message');
      }
    } catch (err) {
      alert('Error sending message');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to approve');
      return;
    }
    if (!window.confirm(`Approve ${selectedItems.length} items?`)) return;

    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      
      const promises = selectedItems.map(id =>
        fetch(`${API_URL}/items/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ isApproved: true }),
        })
      );

      await Promise.all(promises);
      fetchData();
      setSelectedItems([]);
      setSelectAll(false);
      alert('Items approved successfully!');
    } catch (err) {
      alert('Error approving items');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to delete');
      return;
    }
    if (!window.confirm(`Delete ${selectedItems.length} items? This cannot be undone.`)) return;

    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const token = userInfo?.token;
      
      const promises = selectedItems.map(id =>
        fetch(`${API_URL}/items/${id}`, {
          method: 'DELETE',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
        })
      );

      await Promise.all(promises);
      fetchData();
      setSelectedItems([]);
      setSelectAll(false);
      alert('Items deleted successfully!');
    } catch (err) {
      alert('Error deleting items');
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredReports.map(item => item._id));
    }
    setSelectAll(!selectAll);
  };

  const filteredReports = itemFilter === 'All' 
    ? items 
    : items.filter(item => item.status && item.status.toLowerCase() === itemFilter.toLowerCase());

  const stats = [
    { label: 'Total Reports', value: items.length.toString(), icon: <FiBox />, color: 'blue', filter: 'All' },
    { label: 'Found Items', value: items.filter(i => i.status && i.status.toLowerCase() === 'found').length.toString(), icon: <FiCheckCircle />, color: 'green', filter: 'Found' },
    { label: 'Lost Items', value: items.filter(i => i.status && i.status.toLowerCase() === 'lost').length.toString(), icon: <FiClock />, color: 'orange', filter: 'Lost' },
  ];

  const analyticsStats = [
    { label: 'Pending Approvals', value: (analytics?.pendingApprovals || 0).toString(), icon: <FiClock />, color: 'orange' },
    { label: 'Total Claims', value: (analytics?.totalClaims || 0).toString(), icon: <FiAward />, color: 'purple' },
    { label: 'Open Tickets', value: (analytics?.openTickets || 0).toString(), icon: <FiInfo />, color: 'red' },
    { label: 'Resolved Tickets', value: (analytics?.resolvedTickets || 0).toString(), icon: <FiCheckCircle />, color: 'green' },
  ];

  if (loading) return (
    <div className="admin-page" style={{padding: '100px 0'}}>
      <div className="container">
        <header className="page-header">
          <div className="skeleton" style={{width: '300px', height: '40px', marginBottom: '10px'}}></div>
          <div className="skeleton" style={{width: '200px', height: '20px'}}></div>
        </header>
        <div className="stats-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="stat-card skeleton" style={{height: '100px'}}></div>
          ))}
        </div>
        <div className="skeleton" style={{width: '100%', height: '500px', marginTop: '40px', borderRadius: '12px'}}></div>
      </div>
    </div>
  );
  if (error) return <div className="container">Error: {error}</div>;

  return (
    <div className="admin-page fade-in">
      <div className="container">
        <header className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Global management of reports, claims and support</p>
        </header>

        <section className="stats-grid">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={`stat-card ${stat.color} ${itemFilter === stat.filter ? 'active-filter' : ''}`}
              onClick={() => setItemFilter(stat.filter)}
              style={{cursor: 'pointer', border: itemFilter === stat.filter ? '2px solid currentColor' : 'none'}}
            >
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="stats-grid" style={{marginTop: '1.5rem'}}>
          {analyticsStats.map((stat, index) => (
            <div key={index} className={`stat-card ${stat.color}`}>
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
            </div>
          ))}
        </section>

        <div className="admin-tabs">
          <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Reports Management</button>
          <button className={`tab-btn ${activeTab === 'claims' ? 'active' : ''}`} onClick={() => setActiveTab('claims')}>Claim Records</button>
          <button className={`tab-btn ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>Support Tickets</button>
        </div>

        {/* Section 1: Reports Table */}
        {activeTab === 'reports' && (
          <section className="table-container fade-in">
            <div className="table-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <h2>{itemFilter === 'All' ? 'All' : itemFilter} Reports (Lost & Found)</h2>
                <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                  {itemFilter === 'All' ? 'Includes claimed and unclaimed items' : `Showing only ${itemFilter.toLowerCase()} items`}
                </p>
              </div>
              {selectedItems.length > 0 && (
                <div className="bulk-actions">
                  <button className="btn btn-sm" style={{background: '#22c55e', color: 'white', border: 'none', marginRight: '0.5rem'}} onClick={handleBulkApprove}>
                    Approve Selected ({selectedItems.length})
                  </button>
                  <button className="btn btn-sm" style={{background: '#ef4444', color: 'white', border: 'none'}} onClick={handleBulkDelete}>
                    Delete Selected ({selectedItems.length})
                  </button>
                </div>
              )}
            </div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{width: '40px'}}>
                      <input 
                        type="checkbox" 
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Item</th>
                    <th>Reporter</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length > 0 ? filteredReports.map(item => (
                    <tr key={item._id}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedItems.includes(item._id)}
                          onChange={() => handleSelectItem(item._id)}
                        />
                      </td>
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
                      <td>{item.reportedBy?.name || 'Unknown'}</td>
                      <td><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span></td>
                      <td>
                        <span className={`status-pill ${item.isApproved ? 'approved' : 'pending'}`}>
                          {item.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          {!item.isApproved && (
                            <button 
                              className="icon-btn edit" 
                              style={{background: '#10b981', color: 'white'}} 
                              onClick={() => handleApproveItem(item._id)}
                              title="Approve Item"
                            >
                              <FiCheckCircle />
                            </button>
                          )}
                          {item.isApproved && (
                            <button 
                              className="icon-btn edit" 
                              style={{background: '#ef4444', color: 'white'}} 
                              onClick={() => handleDisapproveItem(item._id)}
                              title="Disapprove Item"
                            >
                              <FiX />
                            </button>
                          )}
                          <button className="icon-btn edit" onClick={() => { setEditingItem(item); setShowItemModal(true); }}><FiEdit2 /></button>
                          <button className="icon-btn delete" onClick={() => handleDeleteItem(item._id)}><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>No reports found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 2: Support Tickets */}
        {activeTab === 'support' && (
          <section className="table-container fade-in" style={{marginTop: '20px'}}>
            <div className="table-header">
              <h2>Support & Help Tickets</h2>
              <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Manage user concerns and remove completed tickets</p>
            </div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Subject</th>
                    <th>Related Item</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {supportTickets.length > 0 ? supportTickets.map(ticket => (
                    <tr key={ticket._id}>
                      <td>{ticket.user?.name || 'Unknown'}</td>
                      <td>{ticket.subject}</td>
                      <td>{ticket.relatedItemId?.title || 'None'}</td>
                      <td>
                        <span className={`status-pill ${ticket.status.toLowerCase().replace(' ', '-')}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="icon-btn edit" 
                            onClick={() => { 
                              setEditingTicket(ticket); 
                              setTicketStatus(ticket.status);
                              setAdminReply(ticket.adminReply || '');
                              setShowTicketModal(true); 
                            }}
                            title="Respond to Ticket"
                          >
                            <FiEdit2 />
                          </button>
                          <button 
                            className="icon-btn delete" 
                            onClick={() => handleDeleteTicket(ticket._id)}
                            title="Delete Ticket"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>No support tickets found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Section 3: Claim Management */}
        {activeTab === 'claims' && (
          <section className="table-container fade-in" style={{marginTop: '20px'}}>
            <div className="table-header">
              <h2>Claim Records Management</h2>
              <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Review and audit all item claims</p>
            </div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Claimant</th>
                    <th>Reporter</th>
                    <th>Date</th>
                    <th>Internal Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {claimRecords.length > 0 ? claimRecords.map(record => (
                    <tr key={record._id}>
                      <td>{record.itemId?.title || 'Unknown Item'}</td>
                      <td>{record.claimantId?.name || 'Unknown User'}</td>
                      <td>{record.reporterId?.name || 'Unknown Reporter'}</td>
                      <td>{new Date(record.claimDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-pill ${record.status.toLowerCase()}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="icon-btn edit" 
                            onClick={() => { setEditingClaim(record); setShowClaimModal(true); }}
                            title="Manage Claim Record"
                          >
                            <FiInfo />
                          </button>
                          <button 
                            className="icon-btn delete" 
                            onClick={() => handleDeleteClaim(record._id)}
                            title="Delete Claim Record"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>No claim records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Modal for Editing Item */}
      {showItemModal && editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Item</h2>
              <button className="close-btn" onClick={() => { setShowItemModal(false); setSelectedEditImage(null); }}><FiX /></button>
            </div>
            <form onSubmit={handleUpdateItem}>
              <div className="form-group"><label>Title</label><input type="text" value={editingItem.title} onChange={(e)=>setEditingItem({...editingItem, title: e.target.value})} required/></div>
              <div className="form-row">
                <div className="form-group half"><label>Status</label>
                  <select value={editingItem.status} onChange={(e)=>setEditingItem({...editingItem, status: e.target.value})}>
                    <option value="Lost">Lost</option><option value="Found">Found</option><option value="Claimed">Claimed</option>
                  </select>
                </div>
                <div className="form-group half"><label>Category</label>
                  <select value={editingItem.category} onChange={(e)=>setEditingItem({...editingItem, category: e.target.value})}>
                    <option value="Electronics">Electronics</option><option value="Bags">Bags</option><option value="Jewelry">Jewelry</option><option value="Keys">Keys</option><option value="Documents">Documents</option><option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Change Image (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setSelectedEditImage(e.target.files[0])} 
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowItemModal(false); setSelectedEditImage(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary"><FiSave /> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Managing Claim Record */}
      {showClaimModal && editingClaim && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Manage Claim Record</h2>
              <button className="close-btn" onClick={() => setShowClaimModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleUpdateClaimStatus}>
              <div className="chat-section" style={{marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                <h3 style={{fontSize: '0.9rem', marginBottom: '10px', color: '#475569'}}>One-to-One Verification Chat</h3>
                <div className="message-history" style={{maxHeight: '200px', overflowY: 'auto', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {editingClaim.messages && editingClaim.messages.length > 0 ? editingClaim.messages.map((msg, idx) => (
                    <div key={idx} style={{
                      alignSelf: msg.sender?.role === 'admin' || msg.sender === userInfo._id ? 'flex-end' : 'flex-start',
                      background: msg.sender?.role === 'admin' || msg.sender === userInfo._id ? '#3b82f6' : '#e2e8f0',
                      color: msg.sender?.role === 'admin' || msg.sender === userInfo._id ? 'white' : 'black',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      maxWidth: '80%',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{fontSize: '0.7rem', opacity: 0.8, marginBottom: '2px'}}>{msg.sender?.name || (msg.sender?.role === 'admin' ? 'Admin' : 'User')}</div>
                      {msg.text}
                    </div>
                  )) : <p style={{fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic'}}>No messages yet. Ask the user a question to verify the claim.</p>}
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <textarea 
                    value={askMessage} 
                    onChange={(e)=>setAskMessage(e.target.value)} 
                    placeholder="Ask user for details (e.g. Serial number, specific marks)..."
                    style={{flex: 1, minHeight: '60px', padding: '10px', fontSize: '0.85rem'}}
                  ></textarea>
                  <button type="button" onClick={handleSendClaimMessage} className="btn btn-primary" style={{alignSelf: 'flex-end', height: 'fit-content'}} disabled={!askMessage.trim()}>
                    <FiSend />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Claim Status</label>
                <select value={editingClaim.status} onChange={(e)=>setEditingClaim({...editingClaim, status: e.target.value.toLowerCase()})}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="form-group">
                <label>Collection Time Slot (Visible to User after Approval)</label>
                <input 
                  type="text"
                  value={editingClaim.collectionTime || ''} 
                  onChange={(e)=>setEditingClaim({...editingClaim, collectionTime: e.target.value})}
                  placeholder="e.g. Monday 10:00 AM at Guard Gate"
                />
              </div>
              <div className="form-group">
                <label>Admin Internal Notes (Private)</label>
                <textarea 
                  value={editingClaim.adminNotes || ''} 
                  onChange={(e)=>setEditingClaim({...editingClaim, adminNotes: e.target.value})}
                  placeholder="Private notes for administrators..."
                ></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowClaimModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><FiSave /> Update Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Managing Support Ticket */}
      {showTicketModal && editingTicket && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Respond to Ticket</h2>
              <button className="close-btn" onClick={() => setShowTicketModal(false)}><FiX /></button>
            </div>
            <div style={{marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px'}}>
              <h4 style={{marginBottom: '5px'}}>{editingTicket.subject}</h4>
              <p style={{fontSize: '0.9rem', color: '#64748b'}}>{editingTicket.message}</p>
              {editingTicket.relatedItemId && (
                <div style={{marginTop: '10px', fontSize: '0.8rem', fontWeight: '600'}}>
                  Item: {editingTicket.relatedItemId.title}
                </div>
              )}
            </div>
            <form onSubmit={handleUpdateTicket}>
              <div className="form-group">
                <label>Ticket Status</label>
                <select value={ticketStatus} onChange={(e)=>setTicketStatus(e.target.value)}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div className="form-group">
                <label>Admin Reply to User</label>
                <textarea 
                  value={adminReply} 
                  onChange={(e)=>setAdminReply(e.target.value)}
                  placeholder="Type your response to the user here..."
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowTicketModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><FiSave /> Send Response</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal for Asking User Question */}
      {showAskModal && targetItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Ask User about {targetItem.title}</h2>
              <button className="close-btn" onClick={() => setShowAskModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleAskUser}>
              <div className="form-group">
                <label>Question for {targetItem.reportedBy?.name || 'User'}</label>
                <textarea 
                  value={askMessage} 
                  onChange={(e)=>setAskMessage(e.target.value)}
                  placeholder="e.g. Can you provide more details about where exactly you lost/found this?"
                  required
                ></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><FiSave /> Send Question</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

