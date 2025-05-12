import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mx-1">
          Log in to your account
        </h2>
        {process.env.NEXT_PUBLIC_REGISTRATION_ENABLED === 'true' && (
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/register">
              <span className="font-medium text-[color:var(--primary)] cursor-pointer">
                create a new account
              </span>
            </Link>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 sm:rounded-lg sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
