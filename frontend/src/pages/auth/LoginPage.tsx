import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Blocks } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage('Password reset link sent to your email. Check your inbox.');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Please enter both email and password to sign up.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else if (data.session) {
      navigate('/dashboard');
    } else {
      setError('Check your email for the confirmation link.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
      }
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left half - Branding */}
      <div className="hidden lg:flex w-1/2 p-12 flex-col justify-between text-white relative overflow-hidden">
        {/* Background Image & Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none mix-blend-overlay" />
        
        <div className="flex items-center gap-3 relative z-10">
          <span className="text-4xl font-bold tracking-tight">Axon<span className="text-6xl">X</span></span>
        </div>

        <div className="relative z-10 -mt-20">
          <h1 className="text-4xl lg:text-5xl font-bold leading-[1.15] tracking-tight mb-6">
            Build, train, and<br/>visualize AI models.
          </h1>
          <p className="text-lg text-[#aaa] max-w-md leading-relaxed">
            The intuitive block-based architecture platform for deep learning. Assemble powerful networks step-by-step and fundamentally learn ML without the boilerplate.
          </p>
        </div>

      </div>

      {/* Right half - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#faf9f5] p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <span className="text-3xl font-bold tracking-tight text-[#111]">Axon<span className="text-5xl">X</span></span>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#e8e7e2]">
            <h2 className="text-2xl font-semibold text-center mb-8 text-[#111] tracking-tight">{isResetMode ? 'Reset Password' : 'Welcome Back'}</h2>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                {successMessage}
              </div>
            )}

            <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-5">
              <div>
                <label className="block text-[12px] font-bold text-[#888] mb-1.5 uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#e8e8e8] bg-[#fafafa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:bg-white transition-all sm:text-sm"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
              {!isResetMode && (
                <div>
                  <label className="block text-[12px] font-bold text-[#888] mb-1.5 uppercase tracking-widest">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#e8e8e8] bg-[#fafafa] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] focus:bg-white transition-all sm:text-sm"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={() => { setError(null); setSuccessMessage(null); setIsResetMode(true); }} className="text-[12px] font-semibold text-[#555] hover:text-[#111] transition-colors">Forgot password?</button>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 !mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-[#1a1a1a] text-white hover:bg-[#333] px-4 py-2.5 shadow-sm"
                >
                  {loading ? 'Processing...' : (isResetMode ? 'Send Reset Link' : 'Sign In')}
                </button>
                <button
                  type="button"
                  onClick={isResetMode ? () => { setError(null); setSuccessMessage(null); setIsResetMode(false); } : handleSignUp}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-[#e8e8e8] bg-white text-[#111] hover:bg-[#fafafa] px-4 py-2.5 shadow-sm"
                >
                  {isResetMode ? 'Back to Login' : 'Sign Up'}
                </button>
              </div>
            </form>

            <div className="mt-8 flex items-center">
              <div className="grow border-t border-[#e8e8e8]"></div>
              <span className="px-4 text-[#aaa] text-[10px] font-bold uppercase tracking-widest">Or continue with</span>
              <div className="grow border-t border-[#e8e8e8]"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-6 w-full inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-lg text-[13px] font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-[#e8e8e8] bg-white text-[#111] hover:bg-[#fafafa] px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
