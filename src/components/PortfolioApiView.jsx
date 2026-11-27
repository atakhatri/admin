import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Code2, Copy, Radio, RefreshCw, Terminal } from 'lucide-react';
import {
  SHARED_PRODUCTION_API_URL,
  generatePortfolioFetchSnippet,
} from '../utils/projectHelpers';
import { ApiPreviewSkeleton } from './ui/Skeleton';

export default function PortfolioApiView({
  publishedCount,
  publishedGalleryCount,
  publishedBlogsCount = 0,
}) {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const [baseMode, setBaseMode] = useState('shared'); // 'shared' | 'origin'
  const activeBaseUrl =
    baseMode === 'shared' ? SHARED_PRODUCTION_API_URL : currentOrigin || SHARED_PRODUCTION_API_URL;

  const snippets = generatePortfolioFetchSnippet(activeBaseUrl);

  const [guideOpen, setGuideOpen] = useState(false);
  const [testerOpen, setTesterOpen] = useState(false);

  const [previewTarget, setPreviewTarget] = useState('blogs');
  const [codeTab, setCodeTab] = useState('blogsLib');
  const [liveData, setLiveData] = useState(null);
  const [statusCode, setStatusCode] = useState(null);
  const [etagValue, setEtagValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const [streamActive, setStreamActive] = useState(false);
  const [streamState, setStreamState] = useState('idle');
  const [lastPushAt, setLastPushAt] = useState('');
  const eventSourceRef = useRef(null);

  const endpointForTarget = (target) => {
    if (target === 'gallery') return '/api/portfolio/gallery';
    if (target === 'blogs') return '/api/portfolio/blogs';
    if (target === 'all') return '/api/portfolio/all';
    return '/api/portfolio/projects';
  };

  const fetchLivePreview = useCallback(async (target) => {
    const endpoint = endpointForTarget(target);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      setStatusCode(res.status);
      setEtagValue(res.headers.get('etag') || '');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Unexpected response format (HTTP ${res.status}).`);
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Request failed with HTTP ${res.status}`);
      }
      setLiveData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to reach ${endpoint}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch live preview when the tester accordion is expanded
  useEffect(() => {
    if (!testerOpen) return;
    fetchLivePreview(previewTarget);
  }, [
    testerOpen,
    fetchLivePreview,
    previewTarget,
    publishedCount,
    publishedGalleryCount,
    publishedBlogsCount,
  ]);

  // Close SSE stream cleanly if tester accordion is collapsed
  useEffect(() => {
    if (!testerOpen && streamActive) {
      setStreamActive(false);
    }
  }, [testerOpen, streamActive]);

  useEffect(() => {
    if (!streamActive || typeof window === 'undefined' || typeof EventSource === 'undefined') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setStreamState('idle');
      return undefined;
    }

    const es = new EventSource('/api/portfolio/stream');
    eventSourceRef.current = es;

    const handleReady = () => setStreamState('connected');
    const handleUpdate = () => {
      setStreamState('connected');
      setLastPushAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      fetchLivePreview(previewTarget);
    };
    const handleError = () => setStreamState('reconnecting');

    es.addEventListener('ready', handleReady);
    es.addEventListener('update', handleUpdate);
    es.onerror = handleError;

    return () => {
      es.removeEventListener('ready', handleReady);
      es.removeEventListener('update', handleUpdate);
      es.close();
      eventSourceRef.current = null;
    };
  }, [streamActive, previewTarget, fetchLivePreview]);

  const copyText = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(''), 1800);
    } catch {
      setCopiedKey('');
    }
  };

  const activeSnippetMeta = (() => {
    if (codeTab === 'liveBridge') {
      return {
        label: 'src/lib/portfolioApi.ts — Real-Time SSE + REST Hooks',
        code: snippets.nextPortfolioBridge,
      };
    }
    if (codeTab === 'blogsPage') {
      return {
        label: 'app/blogs/page.tsx + LiveBlogsBridge.tsx',
        code: snippets.nextBlogsPageExample,
      };
    }
    if (codeTab === 'nextConfig') {
      return {
        label: 'next.config.ts + .env.local',
        code: snippets.nextConfigSnippet,
      };
    }
    return {
      label: 'src/lib/blogs.ts — Drop-in for BlogsClient.tsx',
      code: snippets.nextBlogsLib,
    };
  })();

  const essentialEndpoints = [
    { key: 'projects', label: 'Projects', method: 'GET', url: snippets.endpoint },
    { key: 'gallery', label: 'Gallery', method: 'GET', url: snippets.galleryEndpoint },
    { key: 'blogs', label: 'Blogs', method: 'GET', url: snippets.blogsEndpoint },
    { key: 'stream', label: 'Live Updates', method: 'SSE', url: snippets.streamEndpoint },
  ];

  return (
    <section className="workspace-section" aria-label="Portfolio API Connection">
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Portfolio API</h2>
          <p className="section-subtitle">
            Connect your portfolio to these live endpoints using your Shared URL.
          </p>
        </div>
      </div>

      <div className="api-stack">
        {/* ESSENTIAL CONNECTION PANEL */}
        <div className="api-panel">
          <div className="api-panel-head">
            <h3>Connection URL &amp; Endpoints</h3>
            <div className="segmented-control" role="group" aria-label="Base URL mode">
              <button
                type="button"
                className={baseMode === 'shared' ? 'is-active' : undefined}
                onClick={() => setBaseMode('shared')}
              >
                Shared URL
              </button>
              <button
                type="button"
                className={baseMode === 'origin' ? 'is-active' : undefined}
                onClick={() => setBaseMode('origin')}
              >
                Current Origin
              </button>
            </div>
          </div>

          <div className="endpoint-row endpoint-row-primary">
            <div className="endpoint-meta">
              <span className="endpoint-tag">BASE URL</span>
              <code>{activeBaseUrl}</code>
            </div>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => copyText('baseUrl', activeBaseUrl)}
            >
              {copiedKey === 'baseUrl' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === 'baseUrl' ? 'Copied' : 'Copy Base URL'}</span>
            </button>
          </div>

          <div className="api-endpoint-list">
            {essentialEndpoints.map((ep) => (
              <div key={ep.key} className="endpoint-row">
                <div className="endpoint-meta">
                  <span className="endpoint-tag">{ep.method}</span>
                  <code>{ep.url}</code>
                </div>
                <button
                  type="button"
                  className="btn-ghost-sm"
                  onClick={() => copyText(ep.key, ep.url)}
                >
                  {copiedKey === ep.key ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === ep.key ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ))}
          </div>

          <div className="api-quick-guide">
            <p className="api-hint">
              <strong>Quick setup:</strong> Set{' '}
              <code>NEXT_PUBLIC_PORTFOLIO_API_URL</code> to your <strong>Shared URL</strong> in your
              portfolio environment, fetch the endpoints above, and subscribe to{' '}
              <code>/api/portfolio/stream</code> for real-time updates.
            </p>
          </div>
        </div>

        {/* COLLAPSIBLE ACCORDION 1: NEXT.JS GUIDE & SNIPPETS */}
        <div className="api-accordion-card">
          <button
            type="button"
            className="api-accordion-trigger"
            aria-expanded={guideOpen}
            onClick={() => setGuideOpen((v) => !v)}
          >
            <div className="api-accordion-title-group">
              <Code2 size={17} aria-hidden="true" />
              <div>
                <span className="api-accordion-title">Next.js Integration Guide &amp; Snippets</span>
                <span className="api-accordion-desc">
                  Optional drop-in files and config for connecting your portfolio codebase.
                </span>
              </div>
            </div>
            <ChevronDown
              size={18}
              className={`api-accordion-chevron${guideOpen ? ' is-open' : ''}`}
              aria-hidden="true"
            />
          </button>

          {guideOpen && (
            <div className="api-accordion-body">
              <div className="api-panel-head">
                <div className="segmented-control" role="tablist" aria-label="Next.js integration files">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={codeTab === 'blogsLib'}
                    className={codeTab === 'blogsLib' ? 'is-active' : undefined}
                    onClick={() => setCodeTab('blogsLib')}
                  >
                    lib/blogs.ts
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={codeTab === 'liveBridge'}
                    className={codeTab === 'liveBridge' ? 'is-active' : undefined}
                    onClick={() => setCodeTab('liveBridge')}
                  >
                    SSE Hooks
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={codeTab === 'blogsPage'}
                    className={codeTab === 'blogsPage' ? 'is-active' : undefined}
                    onClick={() => setCodeTab('blogsPage')}
                  >
                    blogs/page.tsx
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={codeTab === 'nextConfig'}
                    className={codeTab === 'nextConfig' ? 'is-active' : undefined}
                    onClick={() => setCodeTab('nextConfig')}
                  >
                    next.config
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-ghost-sm"
                  onClick={() => copyText(codeTab, activeSnippetMeta.code)}
                >
                  {copiedKey === codeTab ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey === codeTab ? 'Copied' : 'Copy File'}</span>
                </button>
              </div>
              <span className="table-muted">{activeSnippetMeta.label}</span>
              <pre className="code-pre code-pre-snippet">{activeSnippetMeta.code}</pre>
            </div>
          )}
        </div>

        {/* COLLAPSIBLE ACCORDION 2: LIVE ENDPOINT & STREAM TESTER */}
        <div className="api-accordion-card">
          <button
            type="button"
            className="api-accordion-trigger"
            aria-expanded={testerOpen}
            onClick={() => setTesterOpen((v) => !v)}
          >
            <div className="api-accordion-title-group">
              <Terminal size={17} aria-hidden="true" />
              <div>
                <span className="api-accordion-title">Live Endpoint &amp; Stream Tester</span>
                <span className="api-accordion-desc">
                  Inspect live JSON responses or verify real-time SSE stream events on demand.
                </span>
              </div>
            </div>
            <ChevronDown
              size={18}
              className={`api-accordion-chevron${testerOpen ? ' is-open' : ''}`}
              aria-hidden="true"
            />
          </button>

          {testerOpen && (
            <div className="api-accordion-body">
              <div className="api-panel-head">
                <div className="segmented-control" role="group" aria-label="API preview endpoint">
                  <button
                    type="button"
                    className={previewTarget === 'blogs' ? 'is-active' : undefined}
                    onClick={() => setPreviewTarget('blogs')}
                  >
                    Blogs ({publishedBlogsCount})
                  </button>
                  <button
                    type="button"
                    className={previewTarget === 'projects' ? 'is-active' : undefined}
                    onClick={() => setPreviewTarget('projects')}
                  >
                    Projects ({publishedCount})
                  </button>
                  <button
                    type="button"
                    className={previewTarget === 'gallery' ? 'is-active' : undefined}
                    onClick={() => setPreviewTarget('gallery')}
                  >
                    Gallery ({publishedGalleryCount})
                  </button>
                  <button
                    type="button"
                    className={previewTarget === 'all' ? 'is-active' : undefined}
                    onClick={() => setPreviewTarget('all')}
                  >
                    All
                  </button>
                </div>

                <div className="api-header-actions">
                  <button
                    type="button"
                    className={streamActive ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => setStreamActive((v) => !v)}
                  >
                    <Radio size={14} aria-hidden="true" />
                    <span>
                      {streamActive
                        ? streamState === 'connected'
                          ? 'Stream Connected'
                          : 'Reconnecting...'
                        : 'Test SSE Stream'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={loading}
                    onClick={() => fetchLivePreview(previewTarget)}
                  >
                    <RefreshCw size={14} className={loading ? 'is-spinning' : ''} aria-hidden="true" />
                    <span>{loading ? 'Loading...' : 'Refresh'}</span>
                  </button>
                </div>
              </div>

              <span className="table-muted">
                {statusCode ? `HTTP ${statusCode}` : 'Checking...'} ·{' '}
                {endpointForTarget(previewTarget)}
                {etagValue ? ` · ETag ${etagValue}` : ''}
                {lastPushAt ? ` · Last SSE push ${lastPushAt}` : ''}
              </span>

              {error && (
                <p className="field-error-banner" role="alert">
                  {error}
                </p>
              )}

              {loading && !liveData ? (
                <div className="code-pre code-pre-tall">
                  <ApiPreviewSkeleton />
                </div>
              ) : (
                <pre className="code-pre code-pre-tall">
                  {liveData ? JSON.stringify(liveData, null, 2) : 'No payload returned.'}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
