import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Global cache to store signed URLs with expiration.
 * Eliminates redundant API calls across component re-mounts and navigation.
 */
const globalUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Hook to resolve S3 paths into signed URLs on-demand.
 * Supports both single path and multiple paths with global client-side caching.
 */
export function useSignedUrls(paths: string | string[], expiresIn: number = 3600) {
  // Stabilize the dependency using a primitive string key
  const pathsKey = useMemo(() => {
    const p = Array.isArray(paths) ? paths.filter(Boolean) : [paths].filter(Boolean);
    return p.sort().join('|');
  }, [paths]);

  // Internal memoized paths for the fetch logic
  const memoizedPaths = useMemo(() => {
    return pathsKey ? pathsKey.split('|') : [];
  }, [pathsKey]);

  // Initial state check from cache
  const initialUrls = useMemo(() => {
    const map: Record<string, string> = {};
    const now = Date.now();
    for (const p of memoizedPaths) {
      if (p.startsWith('http://') || p.startsWith('https://')) {
        map[p] = p;
      } else {
        const cached = globalUrlCache.get(p);
        if (cached && cached.expiresAt > now) {
          map[p] = cached.url;
        }
      }
    }
    return map;
  }, [memoizedPaths]);

  const [urls, setUrls] = useState<Record<string, string>>(initialUrls);
  const [loading, setLoading] = useState(() => {
    // If all paths are already resolved from cache, no initial loading needed
    if (memoizedPaths.length === 0) return false;
    return memoizedPaths.some((p) => !initialUrls[p]);
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memoizedPaths.length === 0) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    const uncachedPaths: string[] = [];
    const resolvedSoFar: Record<string, string> = {};

    for (const p of memoizedPaths) {
      if (p.startsWith('http://') || p.startsWith('https://')) {
        resolvedSoFar[p] = p;
      } else {
        const cached = globalUrlCache.get(p);
        if (cached && cached.expiresAt > now) {
          resolvedSoFar[p] = cached.url;
        } else {
          uncachedPaths.push(p);
        }
      }
    }

    // If everything is already cached, sync state and finish immediately
    if (uncachedPaths.length === 0) {
      setUrls(resolvedSoFar);
      setLoading(false);
      return;
    }

    setUrls(resolvedSoFar);
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    const fetchUrls = async () => {
      try {
        // Fetch signed URLs only for the uncached paths
        const response = await fetch('/api/s3/signed-url', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: uncachedPaths, expiresIn }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch signed URLs');
        }

        const data = await response.json();
        const expiryTimestamp = Date.now() + Math.max(expiresIn - 60, 60) * 1000;
        const newUrlMap: Record<string, string> = { ...resolvedSoFar };

        if (data.urls && Array.isArray(data.urls)) {
          data.urls.forEach((item: { path: string; signedUrl: string }) => {
            newUrlMap[item.path] = item.signedUrl;
            globalUrlCache.set(item.path, {
              url: item.signedUrl,
              expiresAt: expiryTimestamp,
            });
          });
        } else if (data.signedUrl && uncachedPaths.length === 1) {
          const singlePath = uncachedPaths[0];
          newUrlMap[singlePath] = data.signedUrl;
          globalUrlCache.set(singlePath, {
            url: data.signedUrl,
            expiresAt: expiryTimestamp,
          });
        }

        setUrls(newUrlMap);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('[useSignedUrls ERROR]', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchUrls();

    return () => controller.abort();
  }, [pathsKey, expiresIn, memoizedPaths]);

  const getUrl = useCallback((path: string) => urls[path] || '', [urls]);

  return { urls, getUrl, loading, error };
}
