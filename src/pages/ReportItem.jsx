import React, { useState, useEffect } from 'react';
import { FiPlus, FiArrowLeft, FiCamera, FiMapPin, FiCalendar, FiTag, FiFileText, FiPhone, FiGrid } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import './ReportItem.css';
import { API_URL } from '../config';

const ReportItem = () => {
  const query = new URLSearchParams(useLocation().search);
  const defaultStatus = query.get('status') || 'lost';
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Electronics',
    location: '',
    date: new Date().toISOString().split('T')[0],
    status: defaultStatus.charAt(0).toUpperCase() + defaultStatus.slice(1),
    contactInfo: '',
    imageUrl: ''
  });
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  useEffect(() => {
    if (!userInfo) {
      navigate('/login?redirect=report');
    }
  }, [userInfo, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setVideoStream(stream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Could not access camera. Please check permissions.');
      console.error('Camera error:', err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
        stopCamera();
      }, 'image/jpeg');
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setShowCamera(false);
  };

  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const submissionData = new FormData();
    Object.keys(formData).forEach(key => {
      submissionData.append(key, formData[key]);
    });
    // Send both userId and reportedBy for compatibility with different backend models
    submissionData.append('userId', userInfo?._id);
    submissionData.append('reportedBy', userInfo?._id);
    
    if (selectedImage) {
      submissionData.append('image', selectedImage);
    }

    try {
      const token = userInfo?.token;
      
      const response = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: submissionData,
      });


      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="report-page fade-in">
      <div className="container narrow-container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>
        
        <header className="page-header">
          <h1>Report an Item</h1>
          <p>Provide details about the item you lost or found</p>
        </header>

        {error && <div className="error-message">{error}</div>}

        <form className="report-form" onSubmit={handleSubmit}>
          <div className="form-group status-toggle">
            <label>I want to report a:</label>
            <div className="toggle-container">
              <button 
                type="button" 
                className={`toggle-btn ${formData.status === 'Lost' ? 'active lost' : ''}`}
                onClick={() => setFormData({...formData, status: 'Lost'})}
              >
                Lost Item
              </button>
              <button 
                type="button" 
                className={`toggle-btn ${formData.status === 'Found' ? 'active found' : ''}`}
                onClick={() => setFormData({...formData, status: 'Found'})}
              >
                Found Item
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Item Name</label>
            <div className="input-wrapper">
              <FiTag className="input-icon" />
              <input 
                type="text" 
                name="title"
                placeholder="e.g. Blue Backpack, iPhone 13" 
                value={formData.title}
                onChange={handleChange}
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label>Category</label>
              <div className="input-wrapper">
                <FiGrid className="input-icon" />
                <select name="category" value={formData.category} onChange={handleChange}>
                  <option value="Electronics">Electronics</option>
                  <option value="Bags">Bags</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Keys">Keys</option>
                  <option value="Documents">Documents</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="form-group half">
              <label>Date</label>
              <div className="input-wrapper">
                <FiCalendar className="input-icon" />
                <input 
                  type="date" 
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <div className="input-wrapper">
              <FiMapPin className="input-icon" />
              <input 
                type="text" 
                name="location"
                placeholder="Where was it lost/found?" 
                value={formData.location}
                onChange={handleChange}
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <div className="input-wrapper textarea-wrapper">
              <FiFileText className="input-icon" />
              <textarea 
                name="description"
                placeholder="Describe the item in detail (color, brand, distinguishing features)..." 
                value={formData.description}
                onChange={handleChange}
                required 
              ></textarea>
            </div>
          </div>

          <div className="form-group">
            <label>Contact Email / Phone</label>
            <div className="input-wrapper">
              <FiPhone className="input-icon" />
              <input 
                type="text" 
                name="contactInfo"
                placeholder="How can people reach you?" 
                value={formData.contactInfo}
                onChange={handleChange}
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Item Image</label>
            <div className="image-upload-section">
              <div className="upload-buttons">
                <button 
                  type="button" 
                  className="upload-btn"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <FiCamera /> Upload from Device
                </button>
                <button 
                  type="button" 
                  className="upload-btn camera-btn"
                  onClick={startCamera}
                >
                  <FiCamera /> Take Photo
                </button>
              </div>
              <input 
                id="file-upload"
                type="file" 
                name="image"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button 
                    type="button" 
                    className="remove-image-btn"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {showCamera && (
            <div className="camera-modal">
              <div className="camera-content">
                <video ref={videoRef} autoPlay playsInline />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="camera-controls">
                  <button type="button" className="camera-btn-cancel" onClick={stopCamera}>Cancel</button>
                  <button type="button" className="camera-btn-capture" onClick={capturePhoto}>Capture</button>
                </div>
              </div>
            </div>
          )}

          <p style={{fontSize: '0.85rem', color: '#64748b', textAlign: 'center', marginBottom: '1.5rem'}}>
            Note: Your report will be reviewed by an administrator before being visible to other users.
          </p>
          <button type="submit" className="report-submit-btn" disabled={loading}>
            <span>{loading ? 'Submitting...' : 'Submit Report'}</span>
            <FiPlus />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportItem;
