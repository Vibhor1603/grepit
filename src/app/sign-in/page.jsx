"use client";
import { useSignIn, useSignUp, useUser, useClerk } from '@clerk/nextjs';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowLeft, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { ViboMark } from '../../components/ViboLogo';
import ThemeToggle from '../../components/ThemeToggle';

function SignInContent() {
  const signInState = useSignIn();
  const signUpState = useSignUp();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const clerk = useClerk();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect_url') || '/profile';
  const redirectUrl = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/profile';
  const connectGithub = searchParams.get('connect_github') === '1';
  const router = useRouter();

  const [finalRedirect, setFinalRedirect] = useState(redirectUrl);
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("grepit-pending-repo");
      const pendingUpload = sessionStorage.getItem("grepit-pending-upload");
      if (pending || pendingUpload) {
        setFinalRedirect('/');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (userLoaded && isSignedIn && !connectGithub) {
      router.replace(finalRedirect);
    }
  }, [userLoaded, isSignedIn, finalRedirect, router, connectGithub]);

  useEffect(() => {
    if (connectGithub && signInState?.signIn && signInState?.isLoaded) {
      handleOAuthAuto();
    }
  }, [connectGithub, signInState?.isLoaded]); // eslint-disable-line

  const handleOAuthAuto = async () => {
    const signIn = signInState?.signIn;
    if (!signIn) return;
    try {
      await signIn.sso({
        strategy: 'oauth_github',
        redirectCallbackUrl: '/sso-callback',
        redirectUrl: finalRedirect,
      });
    } catch {}
  };

  const [mode, setMode] = useState('signin');

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') setMode('signup');
  }, [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const emailRef = useRef(null);

  const signIn = signInState?.signIn;
  const signUp = signUpState?.signUp;
  const setActive = clerk?.setActive || signInState?.setActive || signUpState?.setActive;

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const clearFieldErrors = () => setFieldErrors({});

  const handleOAuth = async (strategy) => {
    setOauthLoading(strategy);
    try {
      if (!signIn) { toast.error('Auth not ready, try again'); setOauthLoading(''); return; }
      const { error } = await signIn.sso({
        strategy,
        redirectCallbackUrl: '/sso-callback',
        redirectUrl: finalRedirect,
      });
      if (error) {
        toast.error(error?.longMessage || error?.message || 'OAuth failed');
        setOauthLoading('');
      }
    } catch (err) {
      toast.error(err?.errors?.[0]?.longMessage || 'OAuth failed');
      setOauthLoading('');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setFieldErrors({ email: 'Enter your email first' }); return; }
    if (!signIn) return;
    setLoading(true);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email });
      toast.success('Password reset code sent to your email');
    } catch (err) {
      const clerkErr = err?.errors?.[0];
      if (clerkErr?.code === 'form_identifier_not_found') {
        setFieldErrors({ email: 'No account with this email' });
      } else {
        toast.error(clerkErr?.longMessage || 'Could not send reset email');
      }
    }
    setLoading(false);
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!signIn) { toast.error('Auth not ready. Try refreshing.'); return; }
    clearFieldErrors();
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      const status = result?.status || signIn?.status;
      if (status === 'complete') {
        setSuccess(true);
        const sessionId = result?.createdSessionId || signIn?.createdSessionId;
        await setActive({ session: sessionId });
        setTimeout(() => router.replace(finalRedirect), 400);
      } else if (status === 'needs_second_factor') {
        try {
          const activeSignIn = clerk.client.signIn;
          await activeSignIn.prepareSecondFactor({ strategy: 'email_code' });
          setVerificationEmail(email);
          setPendingVerification(true);
          setResendCooldown(30);
          setMode('signin_verify');
        } catch {
          setVerificationEmail(email);
          setPendingVerification(true);
          setMode('signin_verify');
        }
      } else if (status === 'needs_identifier' || status === 'needs_first_factor') {
        setFieldErrors({ email: 'No account with this email. Try signing up.' });
      } else {
        if (signIn?.status === 'needs_second_factor') {
          try {
            await signIn.prepareSecondFactor({ strategy: 'email_code' });
            setVerificationEmail(email);
            setPendingVerification(true);
            setResendCooldown(30);
            setMode('signin_verify');
          } catch {
            setVerificationEmail(email);
            setPendingVerification(true);
            setMode('signin_verify');
          }
        } else {
          setFieldErrors({ email: 'Could not sign in with these credentials. Try signing in with GitHub or create a new account.' });
        }
      }
    } catch (err) {
      const clerkErr = err?.errors?.[0];
      const code = clerkErr?.code;
      if (code === 'form_identifier_not_found') {
        setFieldErrors({ email: 'No account with this email. Try signing up.' });
      } else if (code === 'form_password_incorrect') {
        setFieldErrors({ password: 'Incorrect password' });
      } else {
        const msg = clerkErr?.longMessage || clerkErr?.message || 'Sign in failed';
        setFieldErrors({ password: msg });
      }
    }
    setLoading(false);
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!signUp || !email || !password) return;
    clearFieldErrors();
    setLoading(true);
    try {
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.disposable) {
          setFieldErrors({ email: 'Disposable emails are not allowed. Please use a real email.' });
          setLoading(false);
          return;
        }
      }

      const signUpResource = clerk.client.signUp;
      await signUpResource.create({ emailAddress: email, password });

      if (signUpResource.status === 'complete') {
        setSuccess(true);
        await setActive({ session: signUpResource.createdSessionId });
        setTimeout(() => router.replace(finalRedirect), 400);
      } else {
        await signUpResource.prepareEmailAddressVerification({ strategy: 'email_code' });
        setVerificationEmail(email);
        setPendingVerification(true);
        setResendCooldown(30);
      }
    } catch (err) {
      const clerkErr = err?.errors?.[0];
      const code = clerkErr?.code;
      if (code === 'form_identifier_exists') {
        setMode('signin');
        toast('Account already exists. Sign in instead.', { icon: '👋' });
      } else if (code?.startsWith('form_password')) {
        setFieldErrors({ password: clerkErr?.longMessage || clerkErr?.message || 'Password does not meet requirements.' });
      } else if (code === 'session_exists') {
        router.replace(finalRedirect);
      } else {
        const msg = clerkErr?.longMessage || clerkErr?.message || '';
        toast.error(msg || 'Could not create account. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    clearFieldErrors();
    setLoading(true);
    try {
      let result;
      if (mode === 'signin_verify') {
        const activeSignIn = clerk.client.signIn;
        result = await activeSignIn.attemptSecondFactor({ strategy: 'email_code', code: verificationCode });
      } else {
        result = await clerk.client.signUp.attemptEmailAddressVerification({ code: verificationCode });
      }
      if (result?.status === 'complete') {
        clearFieldErrors();
        setSuccess(true);
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        setTimeout(() => router.replace(finalRedirect), 600);
      } else {
        setFieldErrors({ code: 'Verification incomplete. Try again.' });
      }
    } catch (err) {
      const currentStatus = clerk.client?.signUp?.status;
      if (currentStatus === 'complete' || clerk.client?.signUp?.createdSessionId) {
        clearFieldErrors();
        setSuccess(true);
        const sessionId = clerk.client.signUp.createdSessionId;
        if (sessionId) await setActive({ session: sessionId });
        setTimeout(() => router.replace(finalRedirect), 600);
      } else {
        const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Invalid code. Check your email and try again.';
        setFieldErrors({ code: msg });
      }
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !signUp) return;
    try {
      await clerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResendCooldown(30);
      toast.success('New code sent');
    } catch {
      toast.error('Could not resend code');
    }
  };

  // ─── v5 styling helpers ───
  const inputBase =
    'w-full h-10 px-3 rounded-[8px] bg-c-bg border text-[13px] text-c-text placeholder:text-c-text-3 outline-none';
  const inputOk    = 'border-c-line-2 focus:border-c-accent-line focus:shadow-[0_0_0_3px_var(--c-accent-soft)]';
  const inputErr   = 'border-[#FCA5A5]/50';

  return (
    <div
      className="min-h-screen bg-c-bg flex items-center justify-center px-4 relative"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--c-dot) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div id="clerk-captcha" className="fixed bottom-0 left-0" />
      <div className="fixed top-5 right-5 z-10">
        <ThemeToggle />
      </div>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 9000,
          style: {
            background: 'var(--c-surface)',
            color: 'var(--c-text)',
            border: '1px solid var(--c-line-2)',
            borderRadius: '10px',
            fontSize: '13px',
            padding: '12px 18px',
            maxWidth: '440px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          },
          success: { iconTheme: { primary: 'var(--c-accent)', secondary: 'var(--c-bg)' } },
          error: { iconTheme: { primary: '#FCA5A5', secondary: '#fff' } },
        }}
      />

      <div className="w-full max-w-[400px] relative">
        <button
          onClick={() => router.push('/')}
          style={{ transition: 'color 160ms var(--ease-out-strong)' }}
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-c-text-3 hover:text-c-text-2 mb-10"
        >
          <ArrowLeft size={11} /> Home
        </button>

        <div className="flex items-center gap-2.5 mb-8">
          <ViboMark size={20} />
          <span className="text-[16px] font-semibold text-c-text tracking-tight select-none">
            grep<span className="text-c-accent">it</span>
          </span>
        </div>

        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-c-text-3 mb-3 flex items-center gap-2">
          <span className="inline-block w-3 h-px bg-c-accent/60" />
          {pendingVerification ? 'verify' : mode === 'signin' ? 'sign in' : 'sign up'}
        </p>
        <h1 className="text-[26px] font-semibold text-c-text tracking-[-0.02em] mb-2">
          {pendingVerification ? 'Check your inbox' : mode === 'signin' ? 'Welcome back' : 'Get started'}
        </h1>
        <p className="text-[13.5px] text-c-text-2 mb-8 leading-[1.55]">
          {pendingVerification
            ? <>We sent a code to <span className="text-c-text font-mono">{verificationEmail}</span></>
            : mode === 'signin' ? 'Sign in to analyze any codebase.' : 'Create your account to get started.'}
        </p>

        {!pendingVerification && (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[
                { strategy: 'oauth_github', label: 'GitHub', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg> },
                { strategy: 'oauth_google', label: 'Google', icon: <svg width="13" height="13" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> },
              ].map(({ strategy, label, icon }) => (
                <button
                  key={strategy}
                  onClick={() => handleOAuth(strategy)}
                  disabled={!!oauthLoading}
                  style={{ transition: 'background-color 160ms var(--ease-out-strong), border-color 160ms var(--ease-out-strong)' }}
                  className={`flex items-center justify-center gap-2 h-10 rounded-[8px] border text-[12.5px] ${
                    oauthLoading === strategy
                      ? 'border-c-line-2 bg-c-overlay-3 text-c-text-2'
                      : 'border-c-line-2 bg-c-surface text-c-text-2 hover:bg-c-surface-2 hover:border-c-line-3 hover:text-c-text'
                  } disabled:opacity-40`}
                >
                  {oauthLoading === strategy ? <Loader2 size={13} className="animate-spin" /> : icon}
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-c-line" />
              <span className="font-mono text-[9.5px] text-c-text-3 uppercase tracking-[0.16em]">or continue with email</span>
              <div className="flex-1 h-px bg-c-line" />
            </div>
          </>
        )}

        {pendingVerification ? (
          <form onSubmit={handleVerification} className="space-y-3">
            <div>
              <input
                type="text"
                value={verificationCode}
                onChange={e => { setVerificationCode(e.target.value); clearFieldErrors(); }}
                placeholder="6-digit code"
                autoFocus
                maxLength={6}
                style={{ transition: 'border-color 160ms var(--ease-out-strong), box-shadow 160ms var(--ease-out-strong)' }}
                className={`${inputBase} font-mono tracking-widest text-center ${fieldErrors.code ? inputErr : inputOk}`}
              />
              {fieldErrors.code && <p className="text-[11px] text-[#FCA5A5] mt-1">{fieldErrors.code}</p>}
            </div>
            <button
              type="submit"
              disabled={loading || verificationCode.length < 4}
              style={{ transition: 'background-color 160ms var(--ease-out-strong), transform 160ms var(--ease-out-strong)' }}
              className={`w-full h-10 rounded-[8px] font-semibold text-[13px] flex items-center justify-center gap-2 ${
                success ? 'bg-[#7DD3A8] text-[var(--c-bg)]' : 'bg-c-accent text-[var(--c-bg)] hover:bg-c-accent-bright disabled:opacity-40'
              }`}
            >
              {success ? <Check size={15} /> : loading ? <Loader2 size={13} className="animate-spin" /> : null}
              {success ? 'Verified' : loading ? 'Verifying…' : 'Verify'}
            </button>
            <p className="text-[12px] text-c-text-3 text-center">
              Didn&apos;t get it?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                style={{ transition: 'color 160ms var(--ease-out-strong)' }}
                className="text-c-accent hover:text-[var(--c-accent-bright)] disabled:text-c-text-3"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={mode === 'signin' ? handleEmailSignIn : handleEmailSignUp} className="space-y-3">
            <div>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearFieldErrors(); }}
                placeholder="Email"
                autoComplete="email"
                style={{ transition: 'border-color 160ms var(--ease-out-strong), box-shadow 160ms var(--ease-out-strong)' }}
                className={`${inputBase} ${fieldErrors.email ? inputErr : inputOk}`}
              />
              {fieldErrors.email && <p className="text-[11px] text-[#FCA5A5] mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearFieldErrors(); }}
                  placeholder="Password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  style={{ transition: 'border-color 160ms var(--ease-out-strong), box-shadow 160ms var(--ease-out-strong)' }}
                  className={`${inputBase} pr-9 ${fieldErrors.password ? inputErr : inputOk}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ transition: 'color 160ms var(--ease-out-strong)' }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-c-text-3 hover:text-c-text-2"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-[11px] text-[#FCA5A5] mt-1">{fieldErrors.password}</p>}
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{ transition: 'color 160ms var(--ease-out-strong)' }}
                  className="text-[11px] text-c-text-3 hover:text-c-accent mt-1.5"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{ transition: 'background-color 160ms var(--ease-out-strong), transform 160ms var(--ease-out-strong)' }}
              className={`w-full h-10 rounded-[8px] font-semibold text-[13px] flex items-center justify-center gap-2 ${
                success ? 'bg-[#7DD3A8] text-[var(--c-bg)]' : 'bg-c-accent text-[var(--c-bg)] hover:bg-c-accent-bright disabled:opacity-40'
              }`}
            >
              {success ? <Check size={15} /> : loading ? <Loader2 size={13} className="animate-spin" /> : null}
              {success ? 'Done' : loading ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign in' : 'Create account')}
            </button>
          </form>
        )}

        {!pendingVerification && (
          <p className="text-[12.5px] text-c-text-3 text-center mt-6">
            {mode === 'signin' ? "No account? " : "Have an account? "}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); clearFieldErrors(); }}
              style={{ transition: 'color 160ms var(--ease-out-strong)' }}
              className="text-c-accent hover:text-[var(--c-accent-bright)]"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        )}

        <p className="font-mono text-[10px] text-c-text-3 text-center mt-9 leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-c-text-2 hover:text-c-accent underline underline-offset-2">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="text-c-text-2 hover:text-c-accent underline underline-offset-2">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-c-bg flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-c-accent" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
