import React from 'react';

const PhotoViewer = ({ path, type }) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const imageUrl = `${apiUrl}/uploads/${path}`;

  return (
    <div style={styles.container}>
      <img
        src={imageUrl}
        alt="Upload"
        style={styles.image}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <div style={styles.errorMessage}>
        Failed to load image
      </div>
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
    display: 'none',
    padding: '2rem',
    textAlign: 'center',
    color: 'rgb(156, 163, 175)',
  },
};

export default PhotoViewer;
