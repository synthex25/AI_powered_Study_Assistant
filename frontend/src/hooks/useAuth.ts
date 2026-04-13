import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './useTypedRedux';
import { setUser, clearUser } from '../store/reducers/userReducer';
import { authService } from '../services/authService';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}

type UseAuthReturn = AuthState & AuthActions;

/**
 * Custom hook for authentication state and actions
 */
export const useAuth = (): UseAuthReturn => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const { user, token } = useAppSelector((state) => state.persisted.user);
  const isAuthenticated = !!token && !!user;

  const login = useCallback(async (credential: string) => {
    try {
      const response = await authService.googleLogin(credential);
      dispatch(setUser({ 
        user: response.data.user, 
        token: response.data.accessToken, 
        role: 'user' 
      }));
      // Store both tokens
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [dispatch, navigate]);

  const logout = useCallback(async () => {
    // Revoke refresh token on server
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    
    dispatch(clearUser());
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  }, [dispatch, navigate]);

  const validateSession = useCallback(async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('accessToken');
    if (!storedToken) return false;

    try {
      const response = await authService.validateToken(storedToken);
      if (response.data.valid && response.data.user) {
        dispatch(setUser({ 
          user: response.data.user, 
          token: storedToken, 
          role: 'user' 
        }));
        return true;
      }
      return false;
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch(clearUser());
      return false;
    }
  }, [dispatch]);

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    validateSession,
  };
};
