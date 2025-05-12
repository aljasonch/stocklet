import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';

export default function RegisterPage() {
  const registrationEnabled = process.env.NEXT_PUBLIC_REGISTRATION_ENABLED === 'true';

  return (
    <div className="  flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-2xl sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900">
          Sign Up
        </h2>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 sm:rounded-lg sm:px-10">
          {registrationEnabled ? (
            <RegisterForm />
          ) : (
            <div className="text-center">
              <p className="text-lg text-gray-700">
                Public registration is currently disabled.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Please contact an administrator if you need an account.
              </p>
            </div>
          )}
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login">
              <span className="font-medium text-[color:var(--primary)] cursor-pointer">
                Sign in
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
