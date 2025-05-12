'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; 

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccessMessage(data.message + ' You can now log in.');
      // router.push('/login'); 
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputBaseClasses = "block w-full px-3 py-2.5 rounded-md shadow-sm sm:text-sm bg-[color:var(--card-bg)] text-[color:var(--foreground)]";
  const labelBaseClasses = "block text-sm font-medium text-[color:var(--foreground)] opacity-90";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8 rounded-lg">
      <div>
        <label
          htmlFor="email-register"
          className={labelBaseClasses}
        >
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email-register"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputBaseClasses}
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password-register"
          className={labelBaseClasses}
        >
          Password
        </label>
        <div className="mt-1">
          <input
            id="password-register"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputBaseClasses}
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className={labelBaseClasses}
        >
          Confirm Password
        </label>
        <div className="mt-1">
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputBaseClasses}
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {successMessage && (
          <p className="text-sm text-green-500">{successMessage}</p>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full cursor-pointer flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Registering...
            </>
          ) : (
            'Register'
          )}
        </button>
      </div>
    </form>
  );
}
