"use client";
import { useSignIn, useSignUp, useUser, useClerk } from '@clerk/nextjs';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowLeft, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { ViboMark } from '../../components/ViboLogo';

function SignInContent() {
  const signInState = useSignIn();
  const signUpState = useSignUp();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const clerk = useClerk();
  const searchParams = useSearchParams();
  // Validate redirect URL — only allow relative paths (prevent open redirect)
  const rawRedirect = searchParams.get('redirect_url') || '/';
  const redirectUrl = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';
  const connectGithub = searchParams.get('connect_github') === '1';
  const router = useRouter();

  // If already signed in AND not trying to connect GitHub, redirect immediately
  useEffect(() => {
    if (userLoaded && isSignedIn && !connectGithub) {
      router.replace(redirectUrl);
    }
  }, [userLoaded, isSignedIn, redirectUrl, router, connectGithub]);

  // Auto-trigger GitHub OAuth if connect_github=1
  useEffect(() => {
    if (connectGithub && signInState?.signIn && signInState?.isLoaded) {
      handleOAuthAuto();
    }
  }, [connectGithub, signInState?.isLoaded]); // eslint-disable-line

  const handleOAuthAuto = async () => {
    const signIn = signInState?.signIn;
    if (!signIn) return;
    try {
      const { error } = await signIn.sso({
        strategy: 'oauth_github',
        redirectCallbackUrl: '/sso-callback',
        redirectUrl: '/',
      });
      if (error) console.error('[auth] auto-github error:', error);
    } catch (err) {
      console.error('[auth] auto-github error:', err);
    }
  };

  const [mode, setMode] = useState('signin');

  // Default to signup mode if ?mode=signup
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
  const setActive = signInState?.setActive || signUpState?.setActive;

  // Autofocus email on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Resend cooldown timer
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
        redirectUrl: redirectUrl,
      });
      if (error) {
        console.error('[auth] SSO error:', JSON.stringify(error, null, 2));
        toast.error(error?.longMessage || error?.message || 'OAuth failed');
        setOauthLoading('');
      }
    } catch (err) {
      console.error('[auth] OAuth error:', err);
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
      // Clerk will handle the rest via their UI flow
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
    if (!signIn || !email || !password) return;
    clearFieldErrors();
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        setSuccess(true);
        await setActive({ session: result.createdSessionId });
        setTimeout(() => router.replace(redirectUrl), 400);
      }
    } catch (err) {
      const clerkErr = err?.errors?.[0];
      const code = clerkErr?.code;
      if (code === 'form_identifier_not_found') {
        setFieldErrors({ email: 'No account with this email' });
      } else if (code === 'form_password_incorrect') {
        setFieldErrors({ password: 'Incorrect password' });
      } else {
        toast.error(clerkErr?.longMessage || clerkErr?.message || 'Sign in failed');
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
      // Check for disposable email before creating account
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

      console.log('[signup] Creating account for:', email);
      // Use clerk.client.signUp which has the full SignUpResource with all methods
      const signUpResource = clerk.client.signUp;
      await signUpResource.create({ emailAddress: email, password });
      console.log('[signup] status after create:', signUpResource.status);
      
      if (signUpResource.status === 'complete') {
        setSuccess(true);
        await setActive({ session: signUpResource.createdSessionId });
        setTimeout(() => router.replace(redirectUrl), 400);
      } else {
        console.log('[signup] Preparing email verification...');
        await signUpResource.prepareEmailAddressVerification({ strategy: 'email_code' });
        console.log('[signup] Verification email sent');
        setVerificationEmail(email);
        setPendingVerification(true);
        setResendCooldown(30);
      }
    } catch (err) {
      console.error('[signup] Error:', err);
      console.error('[signup] Error details:', JSON.stringify(err?.errors || err?.message || err));
      const clerkErr = err?.errors?.[0];
      const code = clerkErr?.code;
      if (code === 'form_identifier_exists') {
        setFieldErrors({ email: 'An account with this email already exists. Try signing in instead.' });
      } else if (code?.startsWith('form_password')) {
        setFieldErrors({ password: clerkErr?.longMessage || clerkErr?.message || 'Password does not meet requirements.' });
      } else if (code === 'session_exists') {
        router.replace(redirectUrl);
      } else {
        const msg = clerkErr?.longMessage || clerkErr?.message || '';
        toast.error(msg || 'Could not create account. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    if (!signUp) return;
    clearFieldErrors();
    setLoading(true);
    try {
      const result = await clerk.client.signUp.attemptEmailAddressVerification({ code: verificationCode });
      console.log('[verify] result status:', result?.status, 'createdSessionId:', result?.createdSessionId);
      if (result?.status === 'complete') {
        clearFieldErrors();
        setSuccess(true);
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        setTimeout(() => router.replace(redirectUrl), 600);
      } else {
        setFieldErrors({ code: 'Verification incomplete. Try again.' });
      }
    } catch (err) {
      console.error('[verify] Error:', err?.errors?.[0] || err?.message || err);
      // Check if the sign-up actually completed despite the error
      const currentStatus = clerk.client?.signUp?.status;
      console.log('[verify] signUp status after error:', currentStatus);
      if (currentStatus === 'complete' || clerk.client?.signUp?.createdSessionId) {
        clearFieldErrors();
        setSuccess(true);
        const sessionId = clerk.client.signUp.createdSessionId;
        if (sessionId) await setActive({ session: sessionId });
        setTimeout(() => router.replace(redirectUrl), 600);
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

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Clerk CAPTCHA widget — must be in DOM before signUp.create() */}
      <div id="clerk-captcha" className="fixed bottom-0 left-0" />
      <Toaster position="top-center" toastOptions={{
        style: { background: '#19191c', color: '#eaeaec', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', fontSize: '13px', padding: '12px 16px' },
        success: { iconTheme: { primary: '#E0FC10', secondary: '#0a0a0c' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }} />

      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(224,252,16,0.04) 0%, transparent 70%)' }} />

      <div className="w-full max-w-[380px] relative">
        <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-[12px] text-[#4a4a54] hover:text-[#787884] mb-8 transition-colors">
          <ArrowLeft size={12} /> Home
        </button>

        <div className="flex items-center gap-2.5 mb-8">
          <ViboMark size={22} />
          <span className="text-[17px] font-semibold text-[#eaeaec] tracking-tight">vi<span className="text-[#E0FC10]">b</span>o</span>
        </div>

        <h1 className="text-[24px] font-semibold text-[#eaeaec] tracking-tight mb-1">
          {pendingVerification ? 'Check your inbox' : mode === 'signin' ? 'Welcome back' : 'Get started'}
        </h1>
        <p className="text-[13px] text-[#787884] mb-7">
          {pendingVerification
            ? `We sent a code to ${verificationEmail}`
            : 'Sign in to analyze any codebase.'}
        </p>

        {/* OAuth buttons — only when not verifying */}
        {!pendingVerification && (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[
                { strategy: 'oauth_github', label: 'GitHub', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg> },
                { strategy: 'oauth_google', label: 'Google', icon: <svg width="13" height="13" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> },
              ].map(({ strategy, label, icon }) => (
                <button key={strategy} onClick={() => handleOAuth(strategy)}
                  disabled={!!oauthLoading}
                  className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-[12px] transition-all ${
                    oauthLoading === strategy
                      ? 'border-white/[0.1] bg-white/[0.04] text-[#b0b0b8]'
                      : 'border-white/[0.06] bg-white/[0.02] text-[#b0b0b8] hover:bg-white/[0.04] hover:border-white/[0.1]'
                  } disabled:opacity-40`}>
                  {oauthLoading === strategy ? <Loader2 size={13} className="animate-spin" /> : icon}
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="text-[9px] text-[#4a4a54] uppercase tracking-[0.15em]">or continue with email</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>
          </>
        )}

        {/* Verification form */}
        {pendingVerification ? (
          <form onSubmit={handleVerification} className="space-y-3">
            <div>
              <input type="text" value={verificationCode} onChange={e => { setVerificationCode(e.target.value); clearFieldErrors(); }}
                placeholder="6-digit code" autoFocus maxLength={6}
                className={`w-full h-10 px-3 rounded-lg bg-[#141416] border text-[13px] text-[#eaeaec] placeholder:text-[#4a4a54] outline-none transition-colors font-mono tracking-widest text-center ${
                  fieldErrors.code ? 'border-[#ef4444]/40' : 'border-white/[0.06] focus:border-[#E0FC10]/20'
                }`} />
              {fieldErrors.code && <p className="text-[11px] text-[#ef4444] mt-1">{fieldErrors.code}</p>}
            </div>
            <button type="submit" disabled={loading || verificationCode.length < 4}
              className={`w-full h-10 rounded-lg font-semibold text-[13px] transition-all flex items-center justify-center gap-2 ${
                success ? 'bg-green-500 text-white' : 'bg-[#E0FC10] text-[#0a0a0c] hover:bg-[#eafd60] disabled:opacity-40'
              }`}>
              {success ? <Check size={15} /> : loading ? <Loader2 size={13} className="animate-spin" /> : null}
              {success ? 'Verified!' : loading ? 'Verifying...' : 'Verify'}
            </button>
            <p className="text-[12px] text-[#4a4a54] text-center">
              Didn't get it?{' '}
              <button type="button" onClick={handleResend} disabled={resendCooldown > 0}
                className="text-[#E0FC10] hover:text-[#eafd60] disabled:text-[#4a4a54] transition-colors">
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </p>
          </form>
        ) : (
          /* Email/password form */
          <form onSubmit={mode === 'signin' ? handleEmailSignIn : handleEmailSignUp} className="space-y-3">
            <div>
              <input ref={emailRef} type="email" value={email} onChange={e => { setEmail(e.target.value); clearFieldErrors(); }}
                placeholder="Email" autoComplete="email"
                className={`w-full h-10 px-3 rounded-lg bg-[#141416] border text-[13px] text-[#eaeaec] placeholder:text-[#4a4a54] outline-none transition-colors ${
                  fieldErrors.email ? 'border-[#ef4444]/40' : 'border-white/[0.06] focus:border-[#E0FC10]/20'
                }`} />
              {fieldErrors.email && <p className="text-[11px] text-[#ef4444] mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); clearFieldErrors(); }}
                  placeholder="Password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className={`w-full h-10 px-3 pr-9 rounded-lg bg-[#141416] border text-[13px] text-[#eaeaec] placeholder:text-[#4a4a54] outline-none transition-colors ${
                    fieldErrors.password ? 'border-[#ef4444]/40' : 'border-white/[0.06] focus:border-[#E0FC10]/20'
                  }`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4a54] hover:text-[#787884] transition-colors">
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-[11px] text-[#ef4444] mt-1">{fieldErrors.password}</p>}
              {mode === 'signin' && (
                <button type="button" onClick={handleForgotPassword} className="text-[11px] text-[#787884] hover:text-[#E0FC10] transition-colors mt-1 self-end">
                  Forgot password?
                </button>
              )}
            </div>
            <button type="submit" disabled={loading || !email || !password}
              className={`w-full h-10 rounded-lg font-semibold text-[13px] transition-all flex items-center justify-center gap-2 ${
                success ? 'bg-green-500 text-white' : 'bg-[#E0FC10] text-[#0a0a0c] hover:bg-[#eafd60] disabled:opacity-40'
              }`}>
              {success ? <Check size={15} /> : loading ? <Loader2 size={13} className="animate-spin" /> : null}
              {success ? 'Done!' : loading ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : (mode === 'signin' ? 'Sign in' : 'Create account')}
            </button>
          </form>
        )}

        {!pendingVerification && (
          <p className="text-[12px] text-[#4a4a54] text-center mt-5">
            {mode === 'signin' ? "No account? " : "Have an account? "}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); clearFieldErrors(); }}
              className="text-[#E0FC10] hover:text-[#eafd60] transition-colors">
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        )}

        {/* Terms & Privacy */}
        <p className="text-[10px] text-[#4a4a54] text-center mt-8 leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-[#787884] hover:text-[#E0FC10] underline underline-offset-2 transition-colors">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="text-[#787884] hover:text-[#E0FC10] underline underline-offset-2 transition-colors">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#E0FC10]" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
