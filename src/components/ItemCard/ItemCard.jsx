import React from 'react';
import { FiTag, FiMapPin, FiCalendar, FiUser } from 'react-icons/fi';
import { API_BASE_URL } from '../../config';
import './ItemCard.css';

const ItemCard = ({ item, onClaim }) => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const reporterName = item.reportedBy ? item.reportedBy.name : (item.userId ? item.userId.name : 'Unknown User');
  const [imageError, setImageError] = React.useState(false);

  const getImageUrl = () => {
    if (!item.imageUrl) {
      return null;
    }
    if (item.imageUrl?.startsWith('/uploads/')) {
      return `${API_BASE_URL}${item.imageUrl}`;
    }
    return item.imageUrl;
  };

  return (
    <div className="item-card">
      <div className="item-image-container">
        {getImageUrl() && !imageError ? (
          <img 
            src={getImageUrl()} 
            alt={item.title} 
            className="item-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="item-image placeholder-image">
            <div className="placeholder-content">
              <span className="placeholder-icon">{item.status === 'found' ? '🟢' : '🔴'}</span>
              <span className="placeholder-text">{item.title.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>
      <div className="item-content">
        <div className="item-header">
          <h3 className="item-title">{item.title}</h3>
          <span className={`item-status ${item.status.toLowerCase()}`}>
            {item.status}
          </span>
        </div>
        
        <p className="item-description">{item.description}</p>
        
        <div className="item-details">
          <div className="detail-row">
            <FiUser className="detail-icon" />
            <span style={{fontWeight: '600', color: 'var(--primary)'}}>Reporter: {reporterName}</span>
          </div>
          <div className="detail-row">
            <FiTag className="detail-icon" />
            <span>{item.category}</span>
          </div>
          <div className="detail-row">
            <FiMapPin className="detail-icon" />
            <span>{item.location}</span>
          </div>
          <div className="detail-row">
            <FiCalendar className="detail-icon" />
            <span>{new Date(item.date).toLocaleDateString()}</span>
          </div>
        </div>

        {item.claimRecords && item.claimRecords.length > 0 && (
          <div className="claimants-list" style={{marginTop: '1rem', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
            <div style={{fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px'}}>
              <FiUser /> Claim Requests ({item.claimRecords.length})
            </div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '5px'}}>
              {item.claimRecords.map((record, index) => (record && record.claimantId && (
                <span key={index} style={{fontSize: '0.8rem', padding: '2px 8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155'}}>
                  {record.claimantId.name}
                </span>
              )))}
            </div>
          </div>
        )}

        <div className="item-actions-footer" style={{display: 'flex', gap: '10px', marginTop: '1.5rem'}}>
          {item.status === 'Found' && (
            <button 
              className="btn btn-primary claim-btn" 
              style={{
                flex: 1,
                opacity: (userInfo && (item.reportedBy?._id === userInfo._id || item.reportedBy === userInfo._id || item.userId?._id === userInfo._id || item.userId === userInfo._id)) ? 0.5 : 1,
                cursor: (userInfo && (item.reportedBy?._id === userInfo._id || item.reportedBy === userInfo._id || item.userId?._id === userInfo._id || item.userId === userInfo._id)) ? 'not-allowed' : 'pointer'
              }}
              disabled={userInfo && (item.reportedBy?._id === userInfo._id || item.reportedBy === userInfo._id || item.userId?._id === userInfo._id || item.userId === userInfo._id)}
              onClick={() => onClaim && onClaim(item._id)}
              title={userInfo && (item.reportedBy?._id === userInfo._id || item.reportedBy === userInfo._id || item.userId?._id === userInfo._id || item.userId === userInfo._id) ? "You cannot claim your own reported item" : ""}
            >
              {userInfo && (item.reportedBy?._id === userInfo._id || item.reportedBy === userInfo._id || item.userId?._id === userInfo._id || item.userId === userInfo._id) ? 'Cannot Claim Own Item' : 'Claim Item'}
            </button>
          )}
          {item.status === 'Lost' && (
            <div style={{flex: 1, textAlign: 'center', padding: '10px', background: '#f1f5f9', borderRadius: '8px', color: '#64748b', fontSize: '0.9rem', fontWeight: '500'}}>
              Lost Item (Not Claimable)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
