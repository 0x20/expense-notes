import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import SignaturePad from 'react-signature-canvas';

const SignatureCanvas = forwardRef(({ onSave }, ref) => {
  const sigPad = useRef();

  useImperativeHandle(ref, () => ({
    clear: () => {
      sigPad.current.clear();
      onSave(null);
    }
  }));

  const handleEnd = () => {
    if (!sigPad.current.isEmpty()) {
      sigPad.current.getTrimmedCanvas().toBlob((blob) => {
        const file = new File([blob], 'signature.png', { type: 'image/png' });
        onSave(file);
      });
    }
  };

  const clear = () => {
    sigPad.current.clear();
    onSave(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.canvasWrapper}>
        <SignaturePad
          ref={sigPad}
          canvasProps={{
            style: styles.canvas
          }}
          onEnd={handleEnd}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        style={styles.clearButton}
      >
        Clear Signature
      </button>
    </div>
  );
});

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  canvasWrapper: {
    border: '1px solid rgb(55, 65, 81)',
    borderRadius: '0.375rem',
    backgroundColor: 'rgb(17, 24, 39)',
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '200px',
    cursor: 'crosshair',
  },
  clearButton: {
    padding: '0.5rem',
    backgroundColor: 'rgb(55, 65, 81)',
    color: 'rgb(243, 244, 246)',
    fontSize: '0.875rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default SignatureCanvas;
