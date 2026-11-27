import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Radio, RefreshCw } from 'lucide-react';
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

  const [previewTarget, setPreviewTarget] = useState('blogs'); // 'projects' | 'gallery' | 'blogs' | 'all'
  const [codeTab, setCodeTab] = useState('blogsLib'); // 'blogsLib' | 'liveBridge' | 'blogsPage' | 'nextConfig'
  const [liveData, setLiveData] = useState(null);
  const [statusCode, setStatusCode] = useState(null);
  const [etagValue, setEtagValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // Optional live SSE verification toggle
  const [streamActive, setStreamActive] = useState(false);
  const [streamState, setStreamState] = useState('idle'); // 'idle' | 'connected' | 'reconnecting'
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

  useEffect(() => {
    fetchLivePreview(previewTarget);
  }, [fetchLivePreview, previewTarget, publishedCount, publishedGalleryCount, publishedBlogsCount]);

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

    const handleReady = () => {
      setStreamState('connected');
    };
    const handleUpdate = () => {
      setStreamState('connected');
      setLastPushAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      fetchLivePreview(previewTarget);
    };
    const handleError = () => {
      setStreamState('reconnecting');
    };

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

  return (
    <section className="workspace-section" aria-label="Hosted Portfolio JSON REST API">
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Portfolio REST API & Real-Time Bridge</h2>
          <p className="section-subtitle">
            Zero-Firebase REST transport for your Next.js portfolio — serving exact{' '}
            <code>BlogPostMeta</code> posts + categories, Projects, 5-slot Gallery, and live SSE
            push updates.
          </p>
        </div>
        <div className="api-header-actions">
          <button
            type="button"
            className={streamActive ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setStreamActive((v) => !v)}
          >
            <Radio size={15} aria-hidden="true" />
            <span>
              {streamActive
                ? streamState === 'connected'
                  ? 'Live Stream On'
                  : 'Reconnecting...'
                : 'Test Live SSE Stream'}
            </span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={() => fetchLivePreview(previewTarget)}
          >
            <RefreshCw size={15} className={loading ? 'is-spinning' : ''} aria-hidden="true" />
            <span>{loading ? 'Testing...' : 'Refresh Preview'}</span>
          </button>
        </div>
      </div>

      <div className="api-grid">
        <div className="api-panel">
          <div className="api-panel-head">
            <h3>Public REST Endpoints</h3>
            <div className="segmented-control" role="group" aria-label="Snippet base URL">
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

          <div className="endpoint-row">
            <code>GET {snippets.blogsEndpoint}</code>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => copyText('blogsUrl', snippets.blogsEndpoint)}
            >
              {copiedKey === 'blogsUrl' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === 'blogsUrl' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="endpoint-row">
            <code>GET {snippets.endpoint}</code>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => copyText('url', snippets.endpoint)}
            >
              {copiedKey === 'url' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === 'url' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="endpoint-row">
            <code>GET {snippets.galleryEndpoint}</code>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => copyText('galleryUrl', snippets.galleryEndpoint)}
            >
              {copiedKey === 'galleryUrl' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === 'galleryUrl' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="endpoint-row">
            <code>GET {snippets.allEndpoint}</code>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => copyText('allUrl', snippets.allEndpoint)}
            >
              {copiedKey === 'allUrl' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === 'allUrl' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="endpoint-row">
            <code>SSE {snippets.streamEndpoint}</code>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => copyText('streamUrl', snippets.streamEndpoint)}
            >
              {copiedKey === 'streamUrl' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === 'streamUrl' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <p className="api-hint">
            Use <strong>Shared URL</strong> in your deployed Next.js portfolio (
            <code>NEXT_PUBLIC_PORTFOLIO_API_URL</code>). Supports <code>ETag</code>/304 conditional
            caching and single-post lookup via <code>/api/portfolio/blogs/&lt;slug&gt;</code>.
          </p>

          <div className="snippet-block">
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
        </div>

        <div className="api-panel">
          <div className="api-panel-head">
            <h3>Live JSON Response Preview</h3>
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
      </div>
    </section>
  );
}
