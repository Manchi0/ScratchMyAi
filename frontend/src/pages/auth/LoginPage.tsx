import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  ToastProvider,
  addToast,
} from '@heroui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface EmailLoginArgs {
  email: string;
  password: string;
  fullName: string;
  isSigningUp: boolean;
  navigate: (path: string) => void;
  setAuthErrorMessage: React.Dispatch<React.SetStateAction<string>>;
}

async function handleEmailLogin({
  email,
  password,
  fullName,
  isSigningUp,
  navigate,
  setAuthErrorMessage,
}: EmailLoginArgs): Promise<boolean> {
  setAuthErrorMessage('');

  const { error } = isSigningUp
    ? await supabase.auth.signUp({
        email,
        password,
        options: { data: { fullName } },
      })
    : await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthErrorMessage(error.message);
    return false;
  }

  if (isSigningUp) {
    addToast({
      title: 'Sign Up Successful',
      description: 'Account created. Sign in to continue to your dashboard.',
      color: 'primary',
      timeout: 5000,
    });
    return true;
  }

  navigate('/dashboard');
  return true;
}

export const EyeSlashFilledIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="1em"
    role="presentation"
    viewBox="0 0 24 24"
    width="1em"
    {...props}
  >
    <path
      d="M21.2714 9.17834C20.9814 8.71834 20.6714 8.28834 20.3514 7.88834C19.9814 7.41834 19.2814 7.37834 18.8614 7.79834L15.8614 10.7983C16.0814 11.4583 16.1214 12.2183 15.9214 13.0083C15.5714 14.4183 14.4314 15.5583 13.0214 15.9083C12.2314 16.1083 11.4714 16.0683 10.8114 15.8483C10.8114 15.8483 9.38141 17.2783 8.35141 18.3083C7.85141 18.8083 8.01141 19.6883 8.68141 19.9483C9.75141 20.3583 10.8614 20.5683 12.0014 20.5683C13.7814 20.5683 15.5114 20.0483 17.0914 19.0783C18.7014 18.0783 20.1514 16.6083 21.3214 14.7383C22.2714 13.2283 22.2214 10.6883 21.2714 9.17834Z"
      fill="currentColor"
    />
    <path
      d="M14.0206 9.98062L9.98062 14.0206C9.47062 13.5006 9.14062 12.7806 9.14062 12.0006C9.14062 10.4306 10.4206 9.14062 12.0006 9.14062C12.7806 9.14062 13.5006 9.47062 14.0206 9.98062Z"
      fill="currentColor"
    />
  </svg>
);

export const EyeFilledIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="1em"
    role="presentation"
    viewBox="0 0 24 24"
    width="1em"
    {...props}
  >
    <path
      d="M21.25 9.14969C18.94 5.51969 15.56 3.42969 12 3.42969C10.22 3.42969 8.49 3.94969 6.91 4.91969C5.33 5.89969 3.91 7.32969 2.75 9.14969C1.75 10.7197 1.75 13.2697 2.75 14.8397C5.06 18.4797 8.44 20.5597 12 20.5597C13.78 20.5597 15.51 20.0397 17.09 19.0697C18.67 18.0897 20.09 16.6597 21.25 14.8397C22.25 13.2797 22.25 10.7197 21.25 9.14969ZM12 16.0397C9.76 16.0397 7.96 14.2297 7.96 11.9997C7.96 9.76969 9.76 7.95969 12 7.95969C14.24 7.95969 16.04 9.76969 16.04 11.9997C16.04 14.2297 14.24 16.0397 12 16.0397Z"
      fill="currentColor"
    />
    <circle cx="12" cy="11.9997" r="3.99999" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();

  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fullNameError, setFullNameError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');

  const toggleVisibility = () => setIsVisible((prev) => !prev);

  const validateCredentials = () => {
    let hasError = false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    } else {
      setEmailError('');
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (isSigningUp) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(password)) {
        setPasswordError(
          'Password must be at least 8 characters with one uppercase letter and one number'
        );
        hasError = true;
      } else {
        setPasswordError('');
      }
    } else {
      setPasswordError('');
    }

    if (isSigningUp) {
      if (!fullName.trim()) {
        setFullNameError('Full name is required');
        hasError = true;
      } else {
        setFullNameError('');
      }
    } else {
      setFullNameError('');
    }

    return hasError;
  };

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (validateCredentials()) return;

    const success = await handleEmailLogin({
      email,
      password,
      fullName,
      isSigningUp,
      navigate,
      setAuthErrorMessage,
    });

    if (success && isSigningUp) {
      setIsSigningUp(false);
      setPassword('');
      setFullName('');
    }
  };

  const handleToggleAuth = (newIsSigningUp: boolean) => {
    setIsSigningUp(newIsSigningUp);
    setAuthErrorMessage('');
    setEmailError('');
    setPasswordError('');
    setFullNameError('');
  };

  return (
    <div className="flex min-h-screen font-sans bg-[#f5f7f8] dark:bg-[#0f1b23] text-slate-900 dark:text-slate-100">
      {/* Left Side: Visual Representation */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0f1b23]">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f9bff]/30 to-[#0f1b23]/90 mix-blend-multiply"></div>
          <div 
            className="w-full h-full bg-[url('https://images.unsplash.com/photo-1620712943543-bcc4628c9757?q=80&w=1964&auto=format&fit=crop')] bg-cover bg-center"
          ></div>
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-[#0f9bff] rounded-lg flex items-center justify-center text-white">
              <svg className="size-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z" fill="currentColor"></path>
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">ScratchMyAi</span>
          </div>
          <div className="max-w-md">
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">The future of machine learning is here.</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Join thousands of developers building the next generation of AI-powered applications with our seamless scratch-to-production workflow.
            </p>
          </div>
          <div className="text-sm text-slate-400">
            © 2024 ScratchMyAi Inc. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side: Identity Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#f5f7f8] dark:bg-[#0f1b23]">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-8">
              <div className="size-12 bg-[#0f9bff] rounded-lg flex items-center justify-center text-white">
                <svg className="size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z" fill="currentColor"></path>
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {isSigningUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {isSigningUp ? 'Join us and start building' : 'Enter your credentials to access your account'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="bordered"
                className="w-full bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-semibold"
                startContent={
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.9 3.47-1.92 4.64-1.2 1.2-3.08 2.47-5.92 2.47-4.72 0-8.61-3.8-8.61-8.52s3.89-8.52 8.61-8.52c2.53 0 4.38.99 5.74 2.3l2.31-2.31C18.43 2.21 15.82 1 12.48 1 6.48 1 1.63 5.84 1.63 11.85s4.85 10.85 10.85 10.85c3.21 0 5.63-1.06 7.49-2.99 1.92-1.92 2.53-4.6 2.53-6.85 0-.53-.05-1.03-.13-1.52H12.48z" fill="currentColor"></path>
                  </svg>
                }
              >
                Google
              </Button>
              <Button
                variant="bordered"
                className="w-full bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-semibold"
                startContent={
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="currentColor"></path>
                  </svg>
                }
              >
                GitHub
              </Button>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-300 dark:border-slate-700"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#f5f7f8] dark:bg-[#0f1b23] px-2 text-slate-500 dark:text-slate-400 font-medium">Or continue with</span>
              </div>
            </div>

            <Form className="space-y-5" onSubmit={handleEmailSubmit}>
              <AnimatePresence>
                {authErrorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    <Alert color="danger" variant="flat" title={authErrorMessage} />
                  </motion.div>
                )}
              </AnimatePresence>

              {isSigningUp && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-200" htmlFor="fullname">Full name</label>
                  <Input
                    id="fullname"
                    placeholder="John Doe"
                    variant="bordered"
                    errorMessage={fullNameError}
                    isInvalid={!!fullNameError}
                    value={fullName}
                    classNames={{
                      inputWrapper: "dark:bg-slate-800 border-slate-300 dark:border-slate-700",
                    }}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 dark:text-slate-200" htmlFor="email">Email address</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  variant="bordered"
                  errorMessage={emailError}
                  isInvalid={!!emailError}
                  value={email}
                  classNames={{
                    inputWrapper: "dark:bg-slate-800 border-slate-300 dark:border-slate-700",
                  }}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-900 dark:text-slate-200" htmlFor="password">Password</label>
                  <button type="button" className="text-xs font-semibold text-[#0f9bff] hover:underline bg-transparent border-none p-0 cursor-pointer">Forgot password?</button>
                </div>
                <Input
                  id="password"
                  type={isVisible ? "text" : "password"}
                  placeholder="••••••••"
                  variant="bordered"
                  errorMessage={passwordError}
                  isInvalid={!!passwordError}
                  value={password}
                  classNames={{
                    inputWrapper: "dark:bg-slate-800 border-slate-300 dark:border-slate-700",
                  }}
                  onChange={(e) => setPassword(e.target.value)}
                  endContent={
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-none p-0 cursor-pointer" type="button" onClick={toggleVisibility}>
                      {isVisible ? (
                        <EyeSlashFilledIcon className="text-xl" />
                      ) : (
                        <EyeFilledIcon className="text-xl" />
                      )}
                    </button>
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#0f9bff] text-white font-bold h-12 shadow-lg shadow-[#0f9bff]/20"
              >
                {isSigningUp ? 'Sign Up' : 'Sign In'}
              </Button>
            </Form>

            <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
              {isSigningUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                className="ml-1 font-bold text-[#0f9bff] hover:underline bg-transparent border-none p-0 cursor-pointer"
                onClick={() => handleToggleAuth(!isSigningUp)}
              >
                {isSigningUp ? 'Sign In' : 'Create an account'}
              </button>
            </p>
          </div>

          <div className="pt-8 text-center text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
            By clicking continue, you agree to our <br className="sm:hidden"/>
            <a className="underline underline-offset-4 hover:text-[#0f9bff]" href="#">Terms of Service</a> and 
            <a className="underline underline-offset-4 hover:text-[#0f9bff]" href="#">Privacy Policy</a>.
          </div>
        </div>
      </div>
      <ToastProvider />
    </div>
  );
}
