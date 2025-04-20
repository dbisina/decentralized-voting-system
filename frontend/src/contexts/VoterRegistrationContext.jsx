import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3 } from './Web3Context';
import IPFSRegistrationService from '../services/ipfsRegistrationService';

// Create context
const VoterRegistrationContext = createContext();

// Create custom hook for using the context
export const useVoterRegistration = () => {
  return useContext(VoterRegistrationContext);
};

export const VoterRegistrationProvider = ({ children }) => {
  const { account, contract, signer } = useWeb3();
  const [registeredElections, setRegisteredElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [universalAccess, setUniversalAccess] = useState(process.env.NODE_ENV === 'development');
  
  // Initialize IPFS service
  const ipfsService = useRef(new IPFSRegistrationService()).current;
  
  // Track if we already ran initial load for this account to prevent infinite loop
  const initialLoadRef = useRef({});

  // Load voter registrations from IPFS
  const loadRegistrations = useCallback(async (forceRefresh = false) => {
    try {
      // Skip if already loading or if we've already loaded for this account
      // and it's not a forced refresh
      if (!account || (initialLoadRef.current[account] && !forceRefresh)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      // In development mode, treat all elections as registered
      if (universalAccess) {
        console.log("DEV MODE: Universal election access enabled");
        
        // If we're in universal access mode, get all election IDs and set them as registered
        // We'll do this by getting data from localStorage just to have something
        try {
          // Get all election IDs from localStorage (mock blockchain data)
          const mockData = JSON.parse(localStorage.getItem('mock_blockchain_data') || '{}');
          const allElectionIds = mockData.elections ? Object.keys(mockData.elections) : [];
          
          // Convert to numbers before setting
          const numericIds = allElectionIds.map(id => parseInt(id));
          setRegisteredElections(numericIds);
          console.log(`DEV MODE: Auto-registered for ${numericIds.length} elections`);
        } catch (err) {
          console.warn("Error getting mock election data", err);
        }
        
        initialLoadRef.current[account] = true;
        setIsLoading(false);
        return;
      }

      // Get user registrations from local references (normal flow)
      const userRefsKey = `user_registrations_${account}`;
      const userRefs = JSON.parse(localStorage.getItem(userRefsKey) || '[]');
      
      // Initialize with empty array
      const electionIds = [];
      
      // Add all elections with approved status or any status in dev mode
      for (const ref of userRefs) {
        try {
          if (ref.status === 'approved' || universalAccess) {
            electionIds.push(ref.electionId);
          } else {
            // Get the full registration data from the hash
            const registration = await ipfsService.getRegistration(ref.ipfsHash);
            
            // Only add to list if approved or in dev mode
            if (registration && (registration.status === 'approved' || universalAccess)) {
              electionIds.push(ref.electionId);
            }
          }
        } catch (err) {
          console.warn(`Error loading registration ${ref.ipfsHash}:`, err);
        }
      }
      
      setRegisteredElections(electionIds);
      
      // Mark this account as loaded
      initialLoadRef.current[account] = true;
    } catch (err) {
      console.error('Error loading voter registrations:', err);
      setError('Failed to load registration data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [account, ipfsService, universalAccess]);

  // Check if user is registered for a specific election
  const isRegisteredForElection = useCallback((electionId) => {
    // In development mode with universal access, always return true
    if (universalAccess) {
      return true;
    }
    
    if (!electionId) return false;
    
    // Convert both to strings for comparison
    const targetId = String(electionId);
    return registeredElections.some(id => String(id) === targetId);
  }, [registeredElections, universalAccess]);

  // Toggle universal access (for development)
  const toggleUniversalAccess = useCallback(() => {
    setUniversalAccess(prev => !prev);
    // Re-run registration loading with the new setting
    initialLoadRef.current = {};
    loadRegistrations(true);
  }, [loadRegistrations]);

  // Register a user for an election (with optional bypass)
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
      
      // If status is approved, also add to blockchain (if available)
      if (status === 'approved' && contract && signer) {
        try {
          // Add to blockchain allowedVoters
          const contractWithSigner = contract.connect(signer);
          const tx = await contractWithSigner.addAllowedVoter(electionId, account);
          await tx.wait();
          console.log(`Successfully added voter ${account} to blockchain for election ${electionId}`);
        } catch (blockchainError) {
          console.error('Error adding voter to blockchain:', blockchainError);
          
          // Fallback to localStorage
          const key = `allowed_voters_${electionId}`;
          const allowedVoters = JSON.parse(localStorage.getItem(key) || '[]');
          
          if (!allowedVoters.includes(account)) {
            allowedVoters.push(account);
            localStorage.setItem(key, JSON.stringify(allowedVoters));
          }
        }
      }
      
      // Reload registrations with force refresh
      await loadRegistrations(true);
      
      return true;
    } catch (err) {
      console.error('Error registering for election:', err);
      return false;
    }
  }, [account, ipfsService, loadRegistrations, contract, signer]);

  // Check registration status
  const getRegistrationStatus = useCallback(async (electionId) => {
    // In development mode with universal access, always return 'approved'
    if (universalAccess) {
      return 'approved';
    }
    
    if (!account || !electionId) return null;
    
    try {
      return await ipfsService.getUserRegistrationStatus(account, electionId);
    } catch (err) {
      console.error('Error getting registration status:', err);
      return null;
    }
  }, [account, ipfsService, universalAccess]);

  // Load registrations when account changes, but only once per account
  useEffect(() => {
    if (account && (!initialLoadRef.current[account] || universalAccess)) {
      loadRegistrations();
    }
    
    // Clear registrations when account changes
    if (!account) {
      setRegisteredElections([]);
      initialLoadRef.current = {};
    }
  }, [account, loadRegistrations, universalAccess]);

  // Function to add an allowed voter directly to the blockchain
  const addAllowedVoter = useCallback(async (electionId, voterAddress) => {
    if (!contract || !signer) {
      // In development mode or without contract, use localStorage
      const key = `allowed_voters_${electionId}`;
      const allowedVoters = JSON.parse(localStorage.getItem(key) || '[]');
      
      if (!allowedVoters.includes(voterAddress)) {
        allowedVoters.push(voterAddress);
        localStorage.setItem(key, JSON.stringify(allowedVoters));
      }
      
      // Also update user registration status
      const updatedRegistration = {
        electionId,
        walletAddress: voterAddress,
        status: 'approved',
        updatedAt: new Date().toISOString()
      };
      
      await ipfsService.updateRegistrationStatus(updatedRegistration, 'approved');
      
      console.log(`DEV MODE: Added voter ${voterAddress} to allowed voters for election ${electionId}`);
      return true;
    }
    
    try {
      setIsLoading(true);
      
      console.log(`Adding voter ${voterAddress} to election ${electionId} blockchain`);
      
      // Call the contract method
      try {
        const contractWithSigner = contract.connect(signer);
        
        // First check if the contract has this function
        if (typeof contractWithSigner.addAllowedVoter === 'function') {
          const tx = await contractWithSigner.addAllowedVoter(electionId, voterAddress);
          await tx.wait();
          console.log(`Successfully added voter ${voterAddress} to blockchain`, tx.hash);
          
          // Also update local storage as a backup
          const key = `allowed_voters_${electionId}`;
          const allowedVoters = JSON.parse(localStorage.getItem(key) || '[]');
          
          if (!allowedVoters.includes(voterAddress)) {
            allowedVoters.push(voterAddress);
            localStorage.setItem(key, JSON.stringify(allowedVoters));
          }
          
          return true;
        } else {
          console.warn("Contract doesn't have addAllowedVoter function");
          
          // Fallback if function doesn't exist - store in localStorage
          const key = `allowed_voters_${electionId}`;
          const allowedVoters = JSON.parse(localStorage.getItem(key) || '[]');
          
          if (!allowedVoters.includes(voterAddress)) {
            allowedVoters.push(voterAddress);
            localStorage.setItem(key, JSON.stringify(allowedVoters));
          }
          
          return true;
        }
      } catch (contractError) {
        console.error("Error calling contract method:", contractError);
        
        // Fallback to localStorage if contract call fails
        const key = `allowed_voters_${electionId}`;
        const allowedVoters = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (!allowedVoters.includes(voterAddress)) {
          allowedVoters.push(voterAddress);
          localStorage.setItem(key, JSON.stringify(allowedVoters));
        }
        
        return true;
      }
    } catch (err) {
      console.error('Error adding allowed voter:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer, ipfsService]);

  const value = {
    registeredElections,
    isRegisteredForElection,
    registerForElection,
    getRegistrationStatus,
    refreshRegistrations: (force) => loadRegistrations(force),
    addAllowedVoter,
    isLoading,
    error,
    universalAccess,
    toggleUniversalAccess
  };

  return (
    <VoterRegistrationContext.Provider value={value}>
      {children}
    </VoterRegistrationContext.Provider>
  );
};

export default VoterRegistrationContext;