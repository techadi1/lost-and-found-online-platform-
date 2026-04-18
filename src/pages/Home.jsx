import React, { useState, useEffect } from 'react';
import { FiSearch, FiChevronDown, FiPlus, FiBox } from 'react-icons/fi';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ItemCard from '../components/ItemCard/ItemCard';
import './Home.css';

import { API_URL } from '../config';

const Home = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  useEffect(() => {
    // Set status filter based on route
    if (location.pathname === '/lost') {
      setStatusFilter('lost');
    } else if (location.pathname === '/found') {
      setStatusFilter('found');
    } else {
      setStatusFilter('all');
    }
    fetchItems();
  }, [location.pathname]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/items`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const data = await response.json();
      setItems(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleClaim = async (itemId) => {
    if (!userInfo) {
      alert('Please login to claim an item.');
      navigate('/login');
      return;
    }

    if (window.confirm('Are you sure you want to claim this item?')) {
      try {
        const response = await fetch(`${API_URL}/items/${itemId}/claim`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userInfo.token}`
          },
          body: JSON.stringify({ userId: userInfo._id }),
        });

        if (response.ok) {
          alert('Item claimed successfully!');
          fetchItems();
        } else {
          const data = await response.json();
          alert(data.message || 'Failed to claim item');
        }
      } catch (err) {
        alert('Error claiming item');
      }
    }
  };

  const filteredItems = items.filter(item => {
    if (!item.displayInDashboard) return false;

    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (item.status && item.status.toLowerCase() === statusFilter.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    let matchesDateRange = true;
    if (dateFrom) {
      const itemDate = new Date(item.date);
      const fromDate = new Date(dateFrom);
      matchesDateRange = itemDate >= fromDate;
    }
    if (dateTo) {
      const itemDate = new Date(item.date);
      const toDate = new Date(dateTo);
      matchesDateRange = matchesDateRange && itemDate <= toDate;
    }
    
    return matchesSearch && matchesStatus && matchesCategory && matchesDateRange;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortBy === 'date') {
      return new Date(b.date) - new Date(a.date);
    }
    return 0;
  });

  return (
    <div className="home-page fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-content">
          <h1>Bennett Lost and Found</h1>
          <p>The official portal for Bennett University students and staff. Report lost belongings or help others find what they've lost inside the campus.</p>
          <div className="hero-actions">
            <Link to="/report?status=lost" className="btn btn-primary btn-lg">
              <FiPlus />
              <span>Report Lost Item</span>
            </Link>
            <Link to="/report?status=found" className="btn btn-secondary btn-lg">
              <FiPlus />
              <span>Report Found Item</span>
            </Link>
          </div>
        </div>
        <div className="hero-overlay"></div>
      </section>

      <div className="container main-content">
        <header className="section-header">
          <h2>Browse Reports</h2>
          <p>Search through items reported by the community</p>
        </header>

        <section className="filter-section">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Prominent Lost/Found Filter Buttons */}
          <div className="quick-filters">
            <button 
              className={`quick-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              All Items
            </button>
            <button 
              className={`quick-filter-btn ${statusFilter === 'lost' ? 'active lost' : ''}`}
              onClick={() => navigate('/lost')}
            >
              🔴 Lost Items
            </button>
            <button 
              className={`quick-filter-btn ${statusFilter === 'found' ? 'active found' : ''}`}
              onClick={() => navigate('/found')}
            >
              🟢 Found Items
            </button>
            <button 
              className={`quick-filter-btn ${showAdvancedFilters ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              ⚙️ Advanced Filters
            </button>
          </div>
          
          {showAdvancedFilters && (
            <div className="advanced-filters">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Date From</label>
                  <input 
                    type="date" 
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <label>Date To</label>
                  <input 
                    type="date" 
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="filter-row">
                <div className="filter-group">
                  <label>Sort By</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="date">By Date</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          <div className="filter-row">
            <div className="filter-group">
              <label>Category</label>
              <div className="select-wrapper">
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Bags">Bags</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Keys">Keys</option>
                  <option value="Documents">Documents</option>
                  <option value="Other">Other</option>
                </select>
                <FiChevronDown className="select-icon" />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Fetching latest reports...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="btn btn-outline">Try Again</button>
          </div>
        ) : (
          <>
            <div className="results-info">
              <p>Showing <strong>{filteredItems.length}</strong> items</p>
            </div>

            {filteredItems.length > 0 ? (
              <main className="items-grid">
                {filteredItems.map(item => (
                  <ItemCard 
                    key={item._id} 
                    item={item} 
                    onClaim={handleClaim} 
                  />
                ))}
              </main>
            ) : (
              <div className="empty-state">
                <FiBox className="empty-icon" />
                <h3>No items found</h3>
                <p>Try adjusting your filters or search term.</p>
                <button onClick={() => {setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all');}} className="btn btn-outline">Clear All Filters</button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default Home;
