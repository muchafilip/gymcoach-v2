import { isOnline } from '../utils/network';

/**
 * Wrapper for API calls with offline fallback.
 * Reduces code duplication across all API functions.
 *
 * @param apiCall - The online API call to attempt
 * @param localFallback - The offline fallback function
 * @param options - Optional configuration
 */
export async function withFallback<T>(
  apiCall: () => Promise<T>,
  localFallback: () => Promise<T>,
  options?: {
    /** If true, always try API first even if offline check fails */
    forceOnline?: boolean;
    /** Custom error handler - return true to suppress error and use fallback */
    shouldFallback?: (error: unknown) => boolean;
  }
): Promise<T> {
  const { forceOnline = false, shouldFallback } = options ?? {};

  if (forceOnline || isOnline()) {
    try {
      return await apiCall();
    } catch (error) {
      // Check if we should fallback on this specific error
      if (shouldFallback && !shouldFallback(error)) {
        throw error; // Re-throw if not a fallback-able error
      }
      console.warn('[API] Call failed, using local fallback');
      // Fall through to local fallback
    }
  }

  return localFallback();
}

/**
 * Get HTTP status code from an error (works with axios errors)
 */
export function getErrorStatus(error: unknown): number | null {
  const axiosError = error as { response?: { status?: number } };
  return axiosError?.response?.status ?? null;
}

/**
 * Check if error is a specific HTTP status
 */
export function isHttpStatus(error: unknown, status: number): boolean {
  return getErrorStatus(error) === status;
}

/**
 * Check if error is a "not found" (404)
 */
export function isNotFound(error: unknown): boolean {
  return isHttpStatus(error, 404);
}

/**
 * Check if error is rate limited (429)
 */
export function isRateLimited(error: unknown): boolean {
  return isHttpStatus(error, 429);
}
