import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Skeleton } from './Skeleton';

/**
 * Progressive lazy-loading image with a shadcn-style Skeleton shimmer while loading
 * and a clean visual fallback if the remote URL fails to load.
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  fallbackLabel = '',
}) {
  const [status, setStatus] = useState(src ? 'loading' : 'error');

  useEffect(() => {
    setStatus(src ? 'loading' : 'error');
  }, [src]);

  if (!src || status === 'error') {
    return (
      <div className={`lazy-img-wrap is-fallback ${wrapperClassName}`.trim()}>
        <div className="lazy-img-fallback" aria-label={alt || fallbackLabel || 'Image unavailable'}>
          <ImageOff size={20} strokeWidth={1.7} aria-hidden="true" />
          {fallbackLabel && <span>{fallbackLabel}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`lazy-img-wrap ${wrapperClassName}`.trim()}>
      {status === 'loading' && <Skeleton className="lazy-img-skel" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`lazy-img-el${status === 'loaded' ? ' is-loaded' : ''} ${className}`.trim()}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}
