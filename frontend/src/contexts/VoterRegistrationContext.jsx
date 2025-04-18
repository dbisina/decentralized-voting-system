import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWeb3 } from './Web3Context';
import IPFSRegistrationService from '../services/ipfsRegistrationService';

// Create context
const VoterRegistrationContext = createContext();

// Create custom hook for using the context
export const useVoterRegistration = () => {
  return useContext(VoterRegistrationContext);
};

export const VoterRegistrationProvider = ({ children }) => {
  const { account } = useWeb3();
  const [registeredElections, setRegisteredElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize IPFS service
  const ipfsService = new IPFSRegistrationService();

  // Load voter registrations from IPFS
  const loadRegistrations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!account) {
        setRegisteredElections([]);
        return;
      }

      // Get user registrations from local references
      const userRefsKey = `user_registrations_${account}`;
      const userRefs = JSON.parse(localStorage.getItem(userRefsKey) || '[]');
      
      // Initialize with empty array
      const electionIds = [];
      
      // Check each reference to see if it's approved
      for (const ref of userRefs) {
        try {
          // Get the full registration to check status
          const registration = await ipfsService.getRegistration(ref.ipfsHash);
          
          // Only add to list if approved
          if (registration && registration.status === 'approved') {
            electionIds.push(ref.electionId);
          }
        } catch (err) {
          console.warn(`Error loading registration ${ref.ipfsHash}:`, err);
        }
      }
      
      setRegisteredElections(electionIds);
    } catch (err) {
      console.error('Error loading voter registrations:', err);
      setError('Failed to load registration data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [account, ipfsService]);

  // Check if user is registered for a specific election
  const isRegisteredForElection = useCallback((electionId) => {
    if (!electionId) return false;
    
    // Convert both to strings for comparison
    const targetId = electionId.toString();
    return registeredElections.some(id => id.toString() === targetId);
  }, [registeredElections]);

  // Register a user for an election (test function)
  const registerForElection = useCallback(async (electionId, status = 'approved') => {
    try {
      if (!account || !electionId) return false;
      
      // Create a test registration
      const registration = {
        electionId,
        walletAddress: account,
        fullName: 'Test User',
        identifier: 'TEST-ID-123',
        status,
        timestamp: new Date().toISOString()
      };
      
      // Store on IPFS
      await ipfsService.storeRegistration(registration);
      
      // Reload registrations
      await loadRegistrations();
      
      return true;
    } catch (err) {
      console.error('Error registering for election:', err);
      return false;
    }
  }, [account, ipfsService, loadRegistrations]);

  // Check registration status
  const getRegistrationStatus = useCallback(async (electionId) => {
    if (!account || !electionId) return null;
    
    try {
      return await ipfsService.getUserRegistrationStatus(account, electionId);
    } catch (err) {
      console.error('Error getting registration status:', err);
      return null;
    }
  }, [account, ipfsService]);

  // Load registrations when component mounts or account changes
  useEffect(() => {
    loadRegistrations();
  }, [account, loadRegistrations]);

  const value = {
    registeredElections,
    isRegisteredForElection,
    registerForElection,
    getRegistrationStatus,
    refreshRegistrations: loadRegistrations,
    isLoading,
    error
  };

  return (
    <VoterRegistrationContext.Provider value={value}>
      {children}
    </VoterRegistrationContext.Provider>
  );
};

export default VoterRegistrationContext;