'use client';

import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

interface UseApiOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for API calls with loading and error states
 */
export function useApi<T>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  options?: UseApiOptions
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(
    async (...args: unknown[]) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const data = await apiFunction(...args);
        setState({ data, error: null, isLoading: false });
        options?.onSuccess?.(data);
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState({ data: null, error: err, isLoading: false });
        options?.onError?.(err);
        throw err;
      }
    },
    [apiFunction, options]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for managing form submission with API
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
  }
) {
  const [state, setState] = useState<{
    data: TData | null;
    error: Error | null;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
  }>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const mutate = useCallback(
    async (variables: TVariables) => {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isSuccess: false,
        isError: false,
      }));

      try {
        const data = await mutationFn(variables);
        setState({
          data,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
        });
        options?.onSuccess?.(data);
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState({
          data: null,
          error: err,
          isLoading: false,
          isSuccess: false,
          isError: true,
        });
        options?.onError?.(err);
        throw err;
      }
    },
    [mutationFn, options]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    ...state,
    mutate,
    reset,
  };
}

/**
 * Hook for debounced API calls (useful for search)
 */
export function useDebouncedApi<T>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  delay: number = 300
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const execute = useCallback(
    (...args: unknown[]) => {
      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      setState(prev => ({ ...prev, isLoading: true }));

      const id = setTimeout(async () => {
        try {
          const data = await apiFunction(...args);
          setState({ data, error: null, isLoading: false });
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Unknown error');
          setState({ data: null, error: err, isLoading: false });
        }
      }, delay);

      setTimeoutId(id);
    },
    [apiFunction, delay, timeoutId]
  );

  const cancel = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setState(prev => ({ ...prev, isLoading: false }));
  }, [timeoutId]);

  return {
    ...state,
    execute,
    cancel,
  };
}

export default useApi;
