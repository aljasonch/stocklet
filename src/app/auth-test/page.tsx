'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useAuth } from '@/context/AuthContext';

export default function TokenRefreshTest() {
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('Never');
  const [refreshStatus, setRefreshStatus] = useState<string>('Not started');
  const [testApiCallResult, setTestApiCallResult] = useState<string>('Not tested');
  const { isAuthenticated, user } = useAuth();

  const handleManualRefresh = async () => {
    setRefreshStatus('Refreshing...');
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const _data = await response.json();
        setRefreshStatus('Refresh successful');
        setLastRefreshTime(new Date().toLocaleTimeString());
      } else {
        setRefreshStatus(`Refresh failed: ${response.status}`);
      }
    } catch (error) {
      setRefreshStatus(`Refresh error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testAuthenticatedCall = async () => {
    setTestApiCallResult('Testing...');
    try {
      const response = await fetchWithAuth('/api/items');
      
      if (response.ok) {
        const _data = await response.json();
        setTestApiCallResult(`API call successful: ${_data.items?.length || 0} items retrieved`);
      } else {
        setTestApiCallResult(`API call failed: ${response.status}`);
      }
    } catch (error) {
      setTestApiCallResult(`API call error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const [tokenExpiration, setTokenExpiration] = useState<string>('Unknown');
  
  useEffect(() => {
    const checkTokenExpiration = () => {
      const tokenCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='));
        
      if (tokenCookie) {
        try {
          const token = tokenCookie.split('=')[1];
          const decoded = JSON.parse(atob(token.split('.')[1]));
          if (decoded.exp) {
            const expiryDate = new Date(decoded.exp * 1000);
            const timeUntilExpiry = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 1000));
            setTokenExpiration(`${expiryDate.toLocaleTimeString()} (${timeUntilExpiry} seconds from now)`);
          } else {
            setTokenExpiration('No expiration found in token');
          }
        } catch (e) {
          setTokenExpiration(`Error decoding: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        setTokenExpiration('No token cookie found');
      }
    };
    
    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Authentication Token Test Page</h1>
      
      <div className="bg-white shadow overflow-hidden rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium">Authentication Status</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Authentication Status</dt>
              <dd className="mt-1 text-sm text-gray-900">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User</dt>
              <dd className="mt-1 text-sm text-gray-900">{user ? user.email : 'No user'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Token Expiration</dt>
              <dd className="mt-1 text-sm text-gray-900">{tokenExpiration}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Manual Refresh</dt>
              <dd className="mt-1 text-sm text-gray-900">{lastRefreshTime}</dd>
            </div>
          </dl>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium">Token Refresh Test</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <p className="mb-4">Status: <span className="font-medium">{refreshStatus}</span></p>
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Manually Refresh Token
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium">API Call Test</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <p className="mb-4">Result: <span className="font-medium">{testApiCallResult}</span></p>
          <button
            onClick={testAuthenticatedCall}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Test Authenticated API Call
          </button>
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <p className="mb-2">Understanding Token Refresh:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The server sets a JWT token that expires after 15 minutes</li>
          <li>The token should automatically refresh when you make API calls close to expiration</li>
          <li>Background refresh also happens every 10 minutes</li>
          <li>User activity (clicks, typing) will also trigger refreshes</li>
        </ul>
      </div>
    </div>
  );
}
