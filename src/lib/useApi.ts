import {useCallback, useEffect, useRef, useState} from 'react';
import {ApiError, RateLimitError} from './api';

type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  errorStatus: number | null;
  reload: () => void;
};

// Minimal request hook: fires `fetcher` on mount / when deps change, tracks
// loading + error, and aborts in-flight requests on unmount or reload. The
// api.ts request pipeline already handles retries, refresh, and rate-limit
// classification — this hook just surfaces the final result to the screen.
//
// Return `null` from fetcher to skip the request (e.g. no auth token yet).
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T> | null | undefined,
  deps: React.DependencyList,
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const p = fetcher(controller.signal);
    if (!p) {
      setLoading(false);
      return () => {
        controller.abort();
      };
    }

    setLoading(true);
    setError(null);
    setErrorStatus(null);

    p.then(result => {
      if (controller.signal.aborted) {
        return;
      }
      setData(result);
      setLoading(false);
    }).catch(err => {
      if (controller.signal.aborted) {
        return;
      }
      const message = extractErrorMessage(err);
      setError(message);
      setErrorStatus(err instanceof ApiError ? err.status : null);
      setLoading(false);
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return {data, loading, error, errorStatus, reload};
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof RateLimitError) {
    const secs = Math.max(1, Math.ceil(err.retryAfterMs / 1000));
    return `${err.message} (try again in ~${secs}s)`;
  }
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}
