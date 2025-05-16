export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('stockletToken') : null;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    try {
      JSON.parse(options.body);
      headers.append('Content-Type', 'application/json');
    } catch {}
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 detik

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.status === 401) {
      console.error('Unauthorized access detected by fetchWithAuth. Token might be invalid or expired.');
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    // Check for a new token in the response header and update localStorage
    const newToken = response.headers.get('X-New-Token');
    if (newToken && typeof window !== 'undefined') {
      localStorage.setItem('stockletToken', newToken);
    }

    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}
