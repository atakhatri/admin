import React, { useState } from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { BrandLogo } from './IconSprite';
import { Skeleton } from './ui/Skeleton';
import { OWNER_EMAIL } from '../utils/projectHelpers';

function GoogleColorLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.89z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.96H1.28v3.12A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.27A7.22 7.22 0 0 1 4.91 12c0-.79.14-1.56.38-2.27V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.12z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.12C6.23 6.88 8.88 4.77 12 4.77z"
      />
    </svg>
  );
}

function GithubColorLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="ghColorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6e40c9" />
          <stop offset="52%" stopColor="#2f81f7" />
          <stop offset="100%" stopColor="#2ea043" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ghColorGrad)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.02 11.02 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.4-5.26 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
      />
    </svg>
  );
}

export default function AuthGate({
  authLoading,
  user,
  isUnauthorizedUser,
  authError,
  signingInProvider = '',
  onSignInGoogle,
  onSignInGithub,
  onSignOut,
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const isBusy = Boolean(signingInProvider);
  const providerEmail = user?.providerData?.find((p) => p?.email)?.email || '';
  const accountLabel = user?.email || user?.displayName || providerEmail || 'unlinked account';
  const isMissingTopLevelEmail = Boolean(user && !user.email);
  const isUnverifiedOwnerEmail =
    Boolean(user?.email) &&
    user.email.toLowerCase() === OWNER_EMAIL &&
    user.emailVerified === false;

  return (
    <main className="auth-stage" data-testid="auth-gate">
      <section className="auth-card" aria-label="Admin sign in">
        <div className="auth-hero">
          <div className="auth-favicon-wrap">
            {!faviconFailed ? (
              <img
                src="/favicon.ico"
                alt="Admin Dashboard"
                className="auth-favicon-img"
                onError={() => setFaviconFailed(true)}
              />
            ) : (
              <BrandLogo />
            )}
          </div>
          <h1 className="auth-title">Admin Dashboard</h1>
          <p className="auth-subtitle">Sign in to manage your portfolio.</p>
        </div>

        {authLoading ? (
          <div className="auth-status-box" aria-busy="true" aria-label="Verifying session">
            <p className="auth-copy">Checking session...</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <Skeleton style={{ width: '80%', height: '10px', borderRadius: '6px' }} />
              <Skeleton style={{ width: '56%', height: '10px', borderRadius: '6px' }} />
            </div>
          </div>
        ) : isUnauthorizedUser ? (
          <div className="auth-status-box is-denied" role="alert">
            <div className="auth-denied-head">
              <ShieldAlert size={18} aria-hidden="true" />
              <span>Owner access required</span>
            </div>
            <p className="auth-copy">
              {isMissingTopLevelEmail ? (
                <>
                  Signed in as <strong>{accountLabel}</strong>, but Firebase did not receive a
                  verified primary email. Sign out, sign in with Google, and use{' '}
                  <strong>Link GitHub</strong> in Settings to connect both providers to one account.
                </>
              ) : isUnverifiedOwnerEmail ? (
                <>
                  Signed in as <strong>{user?.email}</strong>, but your email is not verified on
                  this provider. Please verify your email or sign in with Google.
                </>
              ) : (
                <>
                  Signed in as <strong>{accountLabel}</strong>. This dashboard is restricted to{' '}
                  {OWNER_EMAIL}.
                </>
              )}
            </p>
            <div className="auth-actions">
              <button type="button" className="btn-logout-danger" onClick={onSignOut}>
                <LogOut size={15} aria-hidden="true" />
                <span>Sign out &amp; switch account</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-oauth-stack">
            {authError && (
              <p className="field-error-banner" role="alert">
                {authError}
              </p>
            )}

            <button
              type="button"
              className="oauth-flood-btn oauth-flood-google"
              onClick={onSignInGoogle}
              disabled={isBusy}
              data-testid="signin-google-btn"
            >
              <span className="oauth-flood-wave" aria-hidden="true" />
              <span className="oauth-flood-content">
                <span className="oauth-logo-badge">
                  <GoogleColorLogo />
                </span>
                <span className="oauth-flood-label">
                  {signingInProvider === 'google'
                    ? 'Connecting Google...'
                    : 'Continue with Google'}
                </span>
              </span>
            </button>

            <button
              type="button"
              className="oauth-flood-btn oauth-flood-github"
              onClick={onSignInGithub}
              disabled={isBusy}
              data-testid="signin-github-btn"
            >
              <span className="oauth-flood-wave" aria-hidden="true" />
              <span className="oauth-flood-content">
                <span className="oauth-logo-badge">
                  <GithubColorLogo />
                </span>
                <span className="oauth-flood-label">
                  {signingInProvider === 'github'
                    ? 'Connecting GitHub...'
                    : 'Continue with GitHub'}
                </span>
              </span>
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
