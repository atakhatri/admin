import React from 'react';
import { Lock, LogOut, ShieldAlert } from 'lucide-react';
import { BrandLogo } from './IconSprite';
import { Skeleton } from './ui/Skeleton';
import { OWNER_EMAIL } from '../utils/projectHelpers';

export default function AuthGate({
  authLoading,
  user,
  isUnauthorizedUser,
  authError,
  signingIn,
  onSignIn,
  onSignOut,
}) {
  return (
    <main className="auth-stage" data-testid="auth-gate">
      <section className="auth-card" aria-label="Owner authentication">
        <div className="auth-brand">
          <div className="auth-logo-wrap">
            <BrandLogo />
          </div>
          <div>
            <h1 className="auth-title">Aurora Command Hub</h1>
            <p className="auth-subtitle">Personal Admin & Portfolio Control Center</p>
          </div>
        </div>

        {authLoading ? (
          <div className="auth-status-box" aria-busy="true" aria-label="Verifying owner session">
            <p className="auth-copy">Verifying owner session...</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <Skeleton style={{ width: '82%', height: '11px', borderRadius: '6px' }} />
              <Skeleton style={{ width: '58%', height: '11px', borderRadius: '6px' }} />
            </div>
          </div>
        ) : isUnauthorizedUser ? (
          <div className="auth-status-box is-denied" role="alert">
            <div className="auth-denied-head">
              <ShieldAlert size={18} aria-hidden="true" />
              <span>Owner access required</span>
            </div>
            <p className="auth-copy">
              Signed in as <strong>{user?.email || 'unknown account'}</strong>. This workspace is
              locked to the verified owner account ({OWNER_EMAIL}).
            </p>
            <div className="auth-actions">
              <button type="button" className="btn-secondary" onClick={onSignOut}>
                <LogOut size={16} aria-hidden="true" />
                <span>Sign out and switch account</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="auth-copy">
              Sign in with your verified Google owner account to manage portfolio projects, publish
              updates to your hosted JSON API, and launch project auth and database consoles.
            </p>

            <div className="auth-meta-list">
              <span>Owner-only rules</span>
              <span className="auth-meta-sep" aria-hidden="true">·</span>
              <span>Private consoles</span>
              <span className="auth-meta-sep" aria-hidden="true">·</span>
              <span>Public JSON API</span>
            </div>

            {authError && (
              <p className="field-error-banner" role="alert">
                {authError}
              </p>
            )}

            <button
              type="button"
              className="btn-primary auth-signin-btn"
              onClick={onSignIn}
              disabled={signingIn}
            >
              <Lock size={16} aria-hidden="true" />
              <span>{signingIn ? 'Opening Google Sign-In...' : 'Sign in with Google'}</span>
            </button>
          </>
        )}
      </section>
    </main>
  );
}
