import React, { createContext, useContext, useState, useEffect } from 'react';
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
  
  const authService = new AuthService();
  
  // Set user when account changes
  useEffect(() => {
    const checkUserStatus = async () => {
      setLoading(true);
      try {
        if (account) {
          // If we have a connected wallet, set user data
          const userData = await authService.getUserProfile(account);
          setUser(userData || { address: account }); // Use basic info if no profile found
          localStorage.setItem('isConnected', 'true');
        } else {
          // If no wallet connected, check if there's a session
          const isConnected = localStorage.getItem('isConnected') === 'true';
          
          if (isConnected) {
            // Try to reconnect wallet
            const reconnectedAccount = await connectWallet();
            
            if (!reconnectedAccount) {
              // If reconnection failed, clear session
              setUser(null);
              localStorage.removeItem('isConnected');
            }
          } else {
            setUser(null);
          }
        }
        setError(null);
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Failed to authenticate user');
        setUser(null);
        localStorage.removeItem('isConnected');
      } finally {
        setLoading(false);
      }
    };
    
    checkUserStatus();
  }, [account, connectWallet, authService]);
  
  // Connect user account
  const login = async () => {
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
  };
  
  // Disconnect user account
  const logout = async () => {
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
  };
  
  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!account) {
        throw new Error('No wallet connected');
      }
      
      // Update user profile
      const updatedProfile = await authService.updateUserProfile(account, profileData);
      
      // Update local state
      setUser({
        ...user,
        ...updatedProfile
      });
      
      return updatedProfile;
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Check if a user is an admin
  const isAdmin = () => {
    return user && user.isAdmin === true;
  };
  
  // Provide the auth context value
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateProfile,
    isAdmin,
    isAuthenticated: !!user
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}