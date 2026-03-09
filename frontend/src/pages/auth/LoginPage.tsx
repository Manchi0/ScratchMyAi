import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add real auth logic
    navigate('/dashboard');
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#f8f7f4]">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm border border-neutral-200">
        <h1 className="text-2xl font-semibold text-center mb-6 text-neutral-800">Welcome Back</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-neutral-900 text-white hover:bg-neutral-800 px-4 py-2 shadow-sm"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                // TODO: Navigate to register or toggle form
                console.log("Sign up clicked");
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-neutral-200 bg-transparent text-neutral-900 hover:bg-neutral-100 px-4 py-2"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
