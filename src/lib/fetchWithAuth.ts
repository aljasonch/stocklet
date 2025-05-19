export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    try {
      JSON.parse(options.body);
      headers.append('Content-Type', 'application/json');
    } catch {
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: 'include',
    });
    clearTimeout(timeoutId);

    if (response.status === 401) {
      try {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const retryResponse = await fetch(url, {
            ...options,
            headers,
            credentials: 'include', 
          });
          return retryResponse;
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unauthorized' }));
          console.error('Unauthorized access detected by fetchWithAuth:', errorData.message);
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error(errorData.message || 'Unauthorized');
        }
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
