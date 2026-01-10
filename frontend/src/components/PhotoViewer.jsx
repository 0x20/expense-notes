import React, { useState, useEffect } from 'react';

const PhotoViewer = ({ path, type }) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const imageUrl = `${apiUrl}/api/admin/files/${path}`;
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(imageUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) throw new Error('Failed to load');
        const blob = await response.blob();
        setBlobUrl(URL.createObjectURL(blob));
      } catch (e) {
        setError(true);
      }
    };
    fetchImage();
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [imageUrl]);

  return (
    <div style={styles.container}>
      {error ? (
        <div style={styles.errorMessage}>
          Failed to load image
        </div>
      ) : blobUrl ? (
        <img
          src={blobUrl}
          alt="Upload"
          style={styles.image}
        />
      ) : (
        <div style={styles.errorMessage}>
          Loading...
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    overflow: 'hidden',
    backgroundColor: 'rgb(17, 24, 39)',
  },
  image: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'contain',
  },
  errorMessage: {
    padding: '2rem',
    textAlign: 'center',
    color: 'rgb(156, 163, 175)',
  },
};

export default PhotoViewer;
