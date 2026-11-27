import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';

export default function LogoutConfirmModal({ open, signingOut, onCancel, onConfirm }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !signingOut) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, signingOut, onCancel]);

  if (!open) return null;

  return (
    <div
      className="confirm-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !signingOut) {
          onCancel();
        }
      }}
    >
      <div
        className="confirm-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-desc"
      >
        <div className="confirm-modal-top">
          <div className="confirm-modal-icon" aria-hidden="true">
            <LogOut size={20} />
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onCancel}
            disabled={signingOut}
            aria-label="Close confirmation"
          >
            <X size={16} />
          </button>
        </div>

        <h2 id="logout-confirm-title" className="confirm-modal-title">
          Sign out of Admin Dashboard?
        </h2>
        <p id="logout-confirm-desc" className="confirm-modal-desc">
          You will need to sign in again to manage your portfolio content.
        </p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={signingOut}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-logout-confirm"
            onClick={onConfirm}
            disabled={signingOut}
          >
            <LogOut size={15} />
            <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
