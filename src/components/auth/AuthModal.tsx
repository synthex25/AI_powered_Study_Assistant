import { useState, type FC, type FormEvent } from 'react';
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
  FaEyeSlash,
  FaTimes
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';

import Logo from '../common/Logo';
import { useAppDispatch } from '../../hooks';
import { setUser } from '../../store/reducers/userReducer';
import { authService } from '../../services';
import { validatePassword, getPasswordRequirements } from '../../utils/passwordValidation';

// ============================================================================
// Constants
// ============================================================================

const CLIENT_ID = import.meta.env.VITE_SSO_CLIENT_ID;

type AuthMode = 'login' | 'signup' | 'otp';

// ============================================================================
// Props
// ============================================================================

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}


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
    
    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-modal-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prevInput = document.getElementById(`otp-modal-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center mb-4">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          id={`otp-modal-${index}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
        />
      ))}
    </div>
  );
};

// ============================================================================
// Auth Modal Component
// ============================================================================

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
  const [fbError, setFbError] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setOtp('');
    setFbError('');
    setMode('login');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    console.log('Google Sign-In Success Callback:', credentialResponse);
    const { credential } = credentialResponse;
    if (!credential) {
      console.warn('Google Success: No credential received');
      message.error('No credential received from Google.');
      return;
    }

    setLoading(true);
    setFbError('');
    try {
      console.log('Attempting Google Login with Backend...');
      const response = await authService.googleLogin(credential);
      console.log('Backend Login Response:', response);
      dispatch(setUser({ user: response.data.user, token: response.data.accessToken, role: 'user' }));
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      message.success(`Welcome ${response.data.user.name}!`);
      navigate('/dashboard');
      handleClose();
    } catch (error: any) {
      console.error('Google Backend Login Error:', error);
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
      handleClose();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Login failed';
      setFbError(errorMsg);
      if (errorMsg.includes('Google')) {
        message.error('This account uses Google Sign-in. Please use the Google button.');
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
    setFbError('');
    try {
      const response = await authService.verifyOtp({ email: pendingEmail, otp });
      dispatch(setUser({ user: response.data.user, token: response.data.accessToken, role: 'user' }));
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      message.success('Email verified! Welcome to Notewise!');
      navigate('/dashboard');
      handleClose();
    } catch (error: any) {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
          {/* Backdrop with sophisticated blur - no onClick to prevent accidental close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[500px] overflow-hidden bg-white border border-gray-200 rounded-[32px] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]"
            >
              {/* Internal Glow Effects */}
              <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[64px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-[64px] rounded-full translate-y-1/2 -translate-x-1/2"></div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all z-10"
              >
                <FaTimes className="text-xl" />
              </button>

              {/* Header Content */}
              <div className="flex flex-col items-center mb-10">
                <Logo size="lg" />
                <p className="text-gray-400 text-sm mt-3">Transform content into wisdom</p>
              </div>

              {/* Mode Tabs */}
              {mode !== 'otp' && (
                <div className="flex bg-gray-100/50 backdrop-blur-sm rounded-2xl p-1.5 mb-10 border border-gray-200">
                  <button
                    onClick={() => { setMode('login'); setFbError(''); }}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                      mode === 'login'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setMode('signup'); setFbError(''); }}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                      mode === 'signup'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
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
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
                      <div className="relative group">
                        <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); if (fbError) setFbError(''); }}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-sm font-medium text-gray-300">Password</label>
                        <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300">Forgot password?</button>
                      </div>
                      <div className="relative group">
                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); if (fbError) setFbError(''); }}
                          className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? 'Processing...' : 'Sign In'}
                      {!loading && <FaArrowRight className="text-sm" />}
                    </motion.button>

                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-xs font-semibold uppercase tracking-widest">
                        <span className="px-4 bg-gray-200 text-gray-600">or link with</span>
                      </div>
                    </div>

                    <div className="flex justify-center px-4">
                      <div className="scale-110">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => {
                            console.error('Google Sign-In Error Callback Triggered');
                            message.error('Google Sign-In failed');
                          }}
                          theme="filled_black"
                          size="large"
                          text="continue_with"
                          shape="pill"
                          width="380"
                        />
                      </div>
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
                    className="space-y-6"
                  >
                    <div className="group space-y-2">
                      <label className="text-sm font-medium text-gray-300 ml-1">Full Name</label>
                      <div className="relative">
                        <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => { setName(e.target.value); if (fbError) setFbError(''); }}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="group space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); if (fbError) setFbError(''); }}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="group space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Secure Password</label>
                      <div className="relative">
                        <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Strong password required"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); if (fbError) setFbError(''); }}
                          className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      
                      {/* Password Requirements */}
                      {password.length > 0 && (
                        <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5">
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
                      className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? 'Creating...' : 'Create Account'}
                      {!loading && <FaArrowRight className="text-sm" />}
                    </motion.button>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-xs font-semibold uppercase tracking-widest">
                        <span className="px-4 bg-gray-200 text-gray-600">or sign up with</span>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="scale-110">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => message.error('Google Sign-In failed')}
                          theme="filled_black"
                          size="large"
                          text="signup_with"
                          shape="pill"
                          width="380"
                        />
                      </div>
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
                    className="space-y-8 py-4"
                  >
                    <div className="text-center px-4">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full mb-6 border border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <HiSparkles className="text-4xl text-indigo-400 relative z-10" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        We've sent a 6-digit code to <br/>
                        <span className="text-indigo-400 font-semibold">{pendingEmail}</span>
                      </p>
                    </div>

                    <div className="px-2">
                       <OtpInput value={otp} onChange={setOtp} />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-bold rounded-2xl shadow-xl transition-all disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? 'Verifying...' : 'Verify & Continue'}
                    </motion.button>

                    <div className="text-center space-y-4">
                      <p className="text-sm text-gray-500">
                        Didn't receive the code?{' '}
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors disabled:opacity-50"
                        >
                          Resend Code
                        </button>
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        ← Back to registration
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="mt-10 pt-8 border-t border-white/5 text-center">
                <p className="text-gray-500 text-xs">
                  By joining, you agree to our <br className="sm:hidden" />
                  <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors underline underline-offset-4">Terms of Service</a> & <a href="#" className="text-gray-400 hover:text-indigo-400 transition-colors underline underline-offset-4">Privacy Policy</a>
                </p>
              </div>
            </motion.div>
          </motion.div>
        </GoogleOAuthProvider>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
