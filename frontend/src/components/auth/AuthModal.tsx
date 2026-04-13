import { useState, type FC, type FormEvent, type KeyboardEvent } from 'react';
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';
import { FiArrowRight, FiLock, FiMail, FiUser } from 'react-icons/fi';

import Logo from '../common/Logo';
import { useAppDispatch } from '../../hooks';
import { setUser } from '../../store/reducers/userReducer';
import { authService } from '../../services';
import { getPasswordRequirements, validatePassword } from '../../utils/passwordValidation';

const CLIENT_ID = import.meta.env.VITE_SSO_CLIENT_ID ?? '';

type AuthMode = 'login' | 'signup' | 'otp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
}

const OtpInput: FC<OtpInputProps> = ({ value, onChange }) => {
  const handleChange = (index: number, nextValue: string) => {
    if (nextValue.length > 1) return;
    const chars = value.split('');
    chars[index] = nextValue;
    onChange(chars.join(''));

    if (nextValue && index < 5) {
      document.getElementById(`otp-modal-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      document.getElementById(`otp-modal-${index - 1}`)?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <input
          key={index}
          id={`otp-modal-${index}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] ?? ''}
          onChange={(event) => handleChange(index, event.target.value.replace(/\D/g, ''))}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className="w-11 h-12 text-center text-lg font-semibold"
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
};

const AuthModal: FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  const closeAndReset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setOtp('');
    setFeedbackError('');
    setMode('login');
    onClose();
  };

  const onAuthSuccess = (data: { user: any; accessToken: string; refreshToken: string }) => {
    dispatch(setUser({ user: data.user, token: data.accessToken, role: 'user' }));
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    navigate('/dashboard');
    closeAndReset();
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential;
    if (!credential) {
      message.error('No Google credential received.');
      return;
    }

    setLoading(true);
    setFeedbackError('');
    try {
      const response = await authService.googleLogin(credential);
      message.success(`Welcome ${response.data.user.name}!`);
      onAuthSuccess(response.data);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message || 'Google login failed.';
      setFeedbackError(serverMessage);
      message.error(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      message.warning('Please complete email and password.');
      return;
    }

    setLoading(true);
    setFeedbackError('');
    try {
      const response = await authService.login({ email, password });
      message.success(`Welcome back ${response.data.user.name}!`);
      onAuthSuccess(response.data);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message || 'Unable to sign in.';
      setFeedbackError(serverMessage);
      message.error(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (!name || !email || !password) {
      message.warning('Please complete all fields.');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      message.warning(validation.errors[0]);
      return;
    }

    setLoading(true);
    setFeedbackError('');
    try {
      await authService.register({ name, email, password });
      setPendingEmail(email);
      setMode('otp');
      message.success('Verification code sent to your email.');
    } catch (error: any) {
      const serverMessage = error.response?.data?.message || 'Unable to create account.';
      setFeedbackError(serverMessage);
      message.error(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6) {
      message.warning('Enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setFeedbackError('');
    try {
      const response = await authService.verifyOtp({ email: pendingEmail, otp });
      message.success('Email verified successfully.');
      onAuthSuccess(response.data);
    } catch (error: any) {
      const serverMessage = error.response?.data?.message || 'Invalid verification code.';
      setFeedbackError(serverMessage);
      message.error(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) return;
    setLoading(true);
    try {
      await authService.resendOtp(pendingEmail);
      message.success('A new verification code has been sent.');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Unable to resend code.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={closeAndReset}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 20,
              padding: '2rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Close button */}
            <button type="button" onClick={closeAndReset} aria-label="Close auth modal"
              style={{
                position: 'absolute', top: 16, right: 16,
                background: '#f3f4f6', border: '1px solid #e5e7eb',
                borderRadius: 8, padding: '6px 8px',
                color: '#6b7280', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FaTimes size={14} />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <Logo className="justify-center mb-3" size="lg" />
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Secure sign in to your study workspace.
              </p>
            </div>

            {/* Mode tabs */}
            {mode !== 'otp' && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                background: '#f3f4f6', border: '1px solid #e5e7eb',
                borderRadius: 12, padding: 4, marginBottom: '1.5rem',
              }}>
                {(['login', 'signup'] as const).map((m) => (
                  <button key={m} type="button"
                    onClick={() => { setMode(m); setFeedbackError(''); }}
                    style={{
                      borderRadius: 8, padding: '0.5rem',
                      fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                      border: 'none',
                      background: mode === m ? '#ffffff' : 'transparent',
                      color: mode === m ? '#111827' : '#6b7280',
                      boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {m === 'login' ? 'Log In' : 'Sign Up'}
                  </button>
                ))}
              </div>
            )}

            {/* Error banner */}
            {feedbackError && (
              <div style={{
                borderRadius: 8, border: '1px solid #fecaca',
                background: '#fef2f2',
                padding: '0.6rem 0.9rem', marginBottom: '1rem',
                fontSize: '0.85rem', color: '#dc2626',
              }}>
                {feedbackError}
              </div>
            )}

            <AnimatePresence mode="wait">
              {mode === 'login' && (
                <motion.form key="login"
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                  onSubmit={handleEmailLogin}
                >
                  <label className="form-group">
                    <span className="form-label">Email</span>
                    <div style={{ position: 'relative' }}>
                      <FiMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFeedbackError(''); }}
                        placeholder="name@example.com" style={{ paddingLeft: 36 }} autoComplete="email" />
                    </div>
                  </label>
                  <label className="form-group">
                    <span className="form-label">Password</span>
                    <div style={{ position: 'relative' }}>
                      <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => { setPassword(e.target.value); setFeedbackError(''); }}
                        placeholder="Your password" style={{ paddingLeft: 36, paddingRight: 40 }} autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPassword(p => !p)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </label>
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Signing in...' : 'Sign In'}{!loading && <FiArrowRight />}
                  </button>
                  <div style={{ position: 'relative', padding: '0.5rem 0', textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #e5e7eb', position: 'absolute', inset: '50% 0 auto' }} />
                    <span style={{ position: 'relative', background: '#ffffff', padding: '0 0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                      or continue with
                    </span>
                  </div>
                  {CLIENT_ID ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => message.error('Google Sign-In failed')}
                        theme="outline" size="large" text="continue_with" shape="pill" />
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                      Google login unavailable — VITE_SSO_CLIENT_ID is missing.
                    </p>
                  )}
                </motion.form>
              )}

              {mode === 'signup' && (
                <motion.form key="signup" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleSignup}>
                  <label className="form-group">
                    <span className="form-label">Full name</span>
                    <div style={{ position: 'relative' }}>
                      <FiUser style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input type="text" value={name} onChange={(e) => { setName(e.target.value); setFeedbackError(''); }}
                        placeholder="Jane Doe" style={{ paddingLeft: 36 }} autoComplete="name" />
                    </div>
                  </label>
                  <label className="form-group">
                    <span className="form-label">Email</span>
                    <div style={{ position: 'relative' }}>
                      <FiMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFeedbackError(''); }}
                        placeholder="name@example.com" style={{ paddingLeft: 36 }} autoComplete="email" />
                    </div>
                  </label>
                  <label className="form-group">
                    <span className="form-label">Password</span>
                    <div style={{ position: 'relative' }}>
                      <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => { setPassword(e.target.value); setFeedbackError(''); }}
                        placeholder="Use a strong password" style={{ paddingLeft: 36, paddingRight: 40 }} autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword(p => !p)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </label>
                  {password.length > 0 && (
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Password requirements</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                        {getPasswordRequirements(password).map((req) => (
                          <p key={req.label} style={{ fontSize: '0.72rem', color: req.met ? '#16a34a' : '#9ca3af' }}>
                            {req.met ? '✓' : '·'} {req.label}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Creating account...' : 'Create Account'}{!loading && <FiArrowRight />}
                  </button>
                </motion.form>
              )}

              {mode === 'otp' && (
                <motion.form key="otp" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleVerifyOtp}>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Verify your email</h3>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Enter the code sent to {pendingEmail}</p>
                  </div>
                  <OtpInput value={otp} onChange={setOtp} />
                  <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button type="button" onClick={() => setMode('signup')} className="btn-ghost">Back to sign up</button>
                    <button type="button" onClick={handleResendOtp} disabled={loading} className="btn-ghost" style={{ color: '#2563eb' }}>Resend code</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </GoogleOAuthProvider>
    </AnimatePresence>
  );
};

export default AuthModal;
