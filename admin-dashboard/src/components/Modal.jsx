import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal renders its children via a React Portal into document.body.
 * This guarantees it is never clipped by parent overflow/transform.
 *
 * Usage:
 *   <Modal onClose={handleClose}>
 *     <div className="modal-box"> ... </div>
 *   </Modal>
 */
export default function Modal({ onClose, children }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>,
    document.body
  );
}
