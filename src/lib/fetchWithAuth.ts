
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {} 
): Promise<Response> {
  const token = localStorage.getItem('stockletToken');

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    try {
      JSON.parse(options.body);
      headers.append('Content-Type', 'application/json');
    } catch { 
    }
  }


  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.error('Unauthorized access detected by fetchWithAuth. Token might be invalid or expired.');
    throw new Error('Unauthorized'); 
  }

  return response;
}
