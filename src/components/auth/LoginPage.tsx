import { useState, useEffect, useCallback, type FC, type FormEvent } from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaEnvelope, 
  FaLock, 
  FaUser, 
  FaArrowRight,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';

import Logo from '../common/Logo';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { setUser, clearUser } from '../../store/reducers/userReducer';
import { authService } from '../../services';
import { validatePassword, getPasswordRequirements } from '../../utils/passwordValidation';

// ============================================================================
// Constants
// ============================================================================

const CLIENT_ID = import.meta.env.VITE_SSO_CLIENT_ID;

type AuthMode = 'login' | 'signup' | 'otp';


// ============================================================================
// OTP Input Component
// ============================================================================

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
}

const OtpInput: FC<OtpInputProps> = ({ value, onChange }) => {
  const handleChange = (index: number, digit: string) => {
    if (digit.length > 1) return;
    const newValue = value.split('');
    newValue[index] = digit;
    onChange(newValue.join(''));
    
    // Auto-focus next input
    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          id={`otp-${index}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/20 rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
        />
      ))}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const LoginPage: FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { token: existingToken } = useAppSelector((state) => state.persisted.user);

  // State
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [fbError, setFbError] = useState('');

  // ============================================================================
  // Token Validation
  // ============================================================================

  const validateExistingToken = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await authService.validateToken(token);
      if (response.data.valid && response.data.user) {
        dispatch(setUser({ 
          user: response.data.user, 
          token, 
          role: 'user' 
        }));
        navigate('/dashboard');
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        dispatch(clearUser());
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch(clearUser());
    }
  }, [dispatch, navigate]);

  useEffect(() => {
    validateExistingToken();
  }, [validateExistingToken]);

  // ============================================================================
  // Auth Handlers
  // ============================================================================

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    console.log('LoginPage Google Success:', credentialResponse);
    const { credential } = credentialResponse;
    if (!credential) {
      console.error('LoginPage Google Success: No credential');
      message.error('No credential received from Google.');
      return;
    }

    setLoading(true);
    setFbError('');
    try {
      console.log('LoginPage: Sending Google Credential to Backend...');
      const response = await authService.googleLogin(credential);
      console.log('LoginPage: Backend Response:', response);
      dispatch(setUser({ user: response.data.user, token: response.data.accessToken, role: 'user' }));
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      message.success(`Welcome ${response.data.user.name}!`);
      // navigate('/dashboard');
    } catch (error: any) {
      console.error('LoginPage: Google Login Failed:', error);
      const msg = error.response?.data?.message || 'Failed to log in with Google.';
      setFbError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      message.warning('Please fill in all fields');
      return;
    }

    setLoading(true);
    setFbError('');
    try {
      const response = await authService.login({ email, password });
      dispatch(setUser({ user: response.data.user, token: response.data.accessToken, role: 'user' }));
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      message.success(`Welcome back ${response.data.user.name}!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMsg = error.response?.data?.message || 'Login failed';
      setFbError(errorMsg);
      if (errorMsg.includes('Google')) {
        message.error('This account uses Google Sign-in. Please use the Google button below.');
      } else {
        message.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      message.warning('Please fill in all fields');
      return;
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      message.warning(passwordValidation.errors[0]);
      return;
    }

    setLoading(true);
    setFbError('');
    try {
      await authService.register({ name, email, password });
      setPendingEmail(email);
      setMode('otp');
      message.success('Verification code sent to your email!');
    } catch (error: any) {
      console.error('Signup failed:', error);
      const errorMsg = error.response?.data?.message || 'Registration failed';
      setFbError(errorMsg);
      if (errorMsg.includes('Google')) {
        message.error('This email is registered with Google. Please use Google Sign-in.');
      } else {
        message.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      message.warning('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOtp({ email: pendingEmail, otp });
      dispatch(setUser({ user: response.data.user, token: response.data.accessToken, role: 'user' }));
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      message.success('Email verified! Welcome to Notewise!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      const msg = error.response?.data?.message || 'Invalid verification code';
      setFbError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await authService.resendOtp(pendingEmail);
      message.success('New verification code sent!');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (existingToken) {
      navigate('/dashboard', { replace: true });
    }
  }, [existingToken, navigate]);

  if (existingToken) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[100px] animate-smooth-pulse" />
          <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[100px] animate-smooth-pulse" style={{ animationDelay: '1.3s' }} />
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Logo size="lg" />
            </div>

            {/* Mode Tabs */}
            {mode !== 'otp' && (
              <div className="flex bg-white/5 rounded-xl p-1 mb-8">
                <button
                  onClick={() => { setMode('login'); setFbError(''); }}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => { setMode('signup'); setFbError(''); }}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Error Alert */}
            <AnimatePresence>
              {fbError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
                >
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <p className="text-sm text-red-400 font-medium leading-tight">{fbError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {/* Login Form */}
              {mode === 'login' && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleEmailLogin}
                  className="space-y-4"
                >
                  <div className="relative">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (fbError) setFbError(''); }}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (fbError) setFbError(''); }}
                      className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                    {!loading && <FaArrowRight />}
                  </motion.button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-gray-200 text-gray-600">or continue with</span>
                    </div>
                  </div>

                    <div className="flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => {
                          console.error('LoginPage Google Sign-In Error');
                          message.error('Google Sign-In failed');
                        }}
                        theme="filled_black"
                        size="large"
                        text="continue_with"
                        shape="pill"
                      />
                    </div>
                </motion.form>
              )}

              {/* Signup Form */}
              {mode === 'signup' && (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSignup}
                  className="space-y-4"
                >
                  <div className="relative">
                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); if (fbError) setFbError(''); }}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="relative">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (fbError) setFbError(''); }}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Strong password required"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); if (fbError) setFbError(''); }}
                        className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    
                    {/* Password Requirements */}
                    {password.length > 0 && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-xs font-medium text-gray-400 mb-2">Password requirements:</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {getPasswordRequirements(password).map((req, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${req.met ? 'bg-green-500' : 'bg-gray-600'}`} />
                              <span className={`text-xs ${req.met ? 'text-green-400' : 'text-gray-500'}`}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                    {!loading && <FaArrowRight />}
                  </motion.button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-gray-200 text-gray-600">or continue with</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => message.error('Google Sign-In failed')}
                      theme="filled_black"
                      size="large"
                      text="signup_with"
                      shape="pill"
                    />
                  </div>
                </motion.form>
              )}

              {/* OTP Verification */}
              {mode === 'otp' && (
                <motion.form
                  key="otp"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-4">
                      <HiSparkles className="text-3xl text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
                    <p className="text-gray-400">
                      We sent a code to <span className="text-purple-400">{pendingEmail}</span>
                    </p>
                  </div>

                  <OtpInput value={otp} onChange={setOtp} />

                  <motion.button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </motion.button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      Didn't receive the code? <span className="text-purple-400">Resend</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="w-full text-center text-gray-400 hover:text-white transition-colors"
                  >
                    ← Back to Sign Up
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Footer */}
            <p className="text-center text-gray-500 text-sm mt-8">
              By continuing, you agree to our{' '}
              <a href="#" className="text-purple-400 hover:underline">Terms</a>
              {' '}and{' '}
              <a href="#" className="text-purple-400 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </motion.div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;
