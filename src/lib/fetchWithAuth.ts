// Helper function to make authenticated API calls

interface FetchOptions extends RequestInit {
  // Add any custom options if needed
}

export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const token = localStorage.getItem('stockletToken');

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  // Ensure Content-Type is set for POST/PUT if body is JSON
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    try {
      JSON.parse(options.body); // Check if body is JSON string
      headers.append('Content-Type', 'application/json');
    } catch (e) {
      // Not a JSON string, do nothing
    }
  }


  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Handle unauthorized access, e.g., redirect to login
    // This could be more sophisticated, perhaps using AuthContext's logout
    console.error('Unauthorized access detected by fetchWithAuth. Token might be invalid or expired.');
    // localStorage.removeItem('stockletToken');
    // localStorage.removeItem('stockletUser');
    // window.location.href = '/login'; // Force redirect
    // Throw an error to be caught by the calling component
    throw new Error('Unauthorized'); 
  }

  return response;
}
