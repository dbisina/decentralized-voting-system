import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useWeb3 } from './Web3Context';
import AuthService from '../services/authService';

// Create context
const AuthContext = createContext();

// Create hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const { account, connectWallet, disconnectWallet } = useWeb3();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Memoize the authService to prevent recreation on each render
  const authService = useMemo(() => new AuthService(), []);
  
  // Check user status when account changes
  useEffect(() => {
    let isMounted = true;
    
    const checkUserStatus = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        if (account) {
          // If we have a connected wallet, set user data
          const userData = await authService.getUserProfile(account);
          if (isMounted) {
            setUser(userData || { address: account }); // Use basic info if no profile found
            localStorage.setItem('isConnected', 'true');
          }
        } else {
          // If no wallet connected, check if there's a session
          const isConnected = localStorage.getItem('isConnected') === 'true';
          
          if (isConnected) {
            // Try to reconnect wallet
            const reconnectedAccount = await connectWallet();
            
            if (!reconnectedAccount && isMounted) {
              // If reconnection failed, clear session
              setUser(null);
              localStorage.removeItem('isConnected');
            }
          } else if (isMounted) {
            setUser(null);
          }
        }
        if (isMounted) setError(null);
      } catch (err) {
        console.error('Authentication error:', err);
        if (isMounted) {
          setError('Failed to authenticate user');
          setUser(null);
          localStorage.removeItem('isConnected');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    checkUserStatus();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [account, connectWallet, authService]);
  
  // Connect user account - memoize to prevent recreation on each render
  const login = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Connect wallet
      const connectedAccount = await connectWallet();
      
      if (connectedAccount) {
        // Get or create user profile
        const userData = await authService.getUserProfile(connectedAccount);
        setUser(userData || { address: connectedAccount });
        localStorage.setItem('isConnected', 'true');
        return true;
      } else {
        throw new Error('Failed to connect wallet');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
      return false;
    } finally {
      setLoading(false);
    }
  }, [connectWallet, authService]);
  
  // Disconnect user account - memoize to prevent recreation on each render
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Disconnect wallet
      await disconnectWallet();
      
      // Clear user data
      setUser(null);
      localStorage.removeItem('isConnected');
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message || 'Failed to logout');
    } finally {
      setLoading(false);
    }
  }, [disconnectWallet]);
  
  // Update user profile - memoize to prevent recreation on each render
  const updateProfile = useCallback(async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!account) {
        throw new Error('No wallet connected');
      }
      
      // Update user profile
      const updatedProfile = await authService.updateUserProfile(account, profileData);
      
      // Update local state
      setUser(prevUser => ({
        ...prevUser,
        ...updatedProfile
      }));
      
      return updatedProfile;
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, authService]);
  
  // Check if a user is an admin - memoize to prevent recreation on each render
  const isAdmin = useCallback(() => {
    return user && user.isAdmin === true;
  }, [user]);
  
  // Memoize the auth context value to prevent unnecessary rerenders
  const value = useMemo(() => ({
    user,
    loading,
    error,
    login,
    logout,
    updateProfile,
    isAdmin,
    isAuthenticated: !!user
  }), [user, loading, error, login, logout, updateProfile, isAdmin]);
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}