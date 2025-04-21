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
  const [universalAccess, setUniversalAccess] = useState(() => {
    // Check localStorage first
    const savedMode = localStorage.getItem('universalAccessMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    // Default to false in all environments, including development
    return false;
  });
  
  // Track different voter statuses per election
  const [voterStatuses, setVoterStatuses] = useState({});
  
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

      // In development mode with universal access enabled, treat all elections as registered
      if (universalAccess && process.env.NODE_ENV === 'development') {
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
      const statuses = {};
      
      // Add all elections with approved status
      for (const ref of userRefs) {
        try {
          // Store status for this election
          statuses[ref.electionId] = ref.status || 'pending';
          
          // Only add to registered elections if status is approved
          if (ref.status === 'approved') {
            electionIds.push(ref.electionId);
          } else {
            // Get the full registration data from the hash if available
            try {
              if (ref.ipfsHash) {
                const registration = await ipfsService.getRegistration(ref.ipfsHash);
                
                // Update status if available
                if (registration && registration.status) {
                  statuses[ref.electionId] = registration.status;
                }
                
                // Only add to list if approved
                if (registration && registration.status === 'approved') {
                  electionIds.push(ref.electionId);
                }
              }
            } catch (fetchError) {
              console.warn(`Error fetching registration: ${fetchError.message}`);
            }
          }
        } catch (err) {
          console.warn(`Error processing registration ref:`, err);
        }
      }
      
      // Also check allowed_voters entries in localStorage as a fallback
      try {
        // For each election with localStorage voter registration
        const mockData = JSON.parse(localStorage.getItem('mock_blockchain_data') || '{}');
        const allElectionIds = mockData.elections ? Object.keys(mockData.elections) : [];
        
        for (const electionId of allElectionIds) {
          const key = `allowed_voters_${electionId}`;
          const allowedVoters = JSON.parse(localStorage.getItem(key) || '[]');
          
          if (allowedVoters.includes(account)) {
            // This voter is approved for this election
            const numericId = parseInt(electionId);
            if (!electionIds.includes(numericId)) {
              electionIds.push(numericId);
              statuses[numericId] = 'approved';
            }
          }
        }
      } catch (fallbackError) {
        console.warn("Error checking allowed_voters:", fallbackError);
      }
      
      setRegisteredElections(electionIds);
      setVoterStatuses(statuses);
      
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
    // FIX: Only allow universal access in development mode when explicitly enabled
    if (universalAccess && process.env.NODE_ENV === 'development') {
      return true;
    }
    
    if (!electionId) return false;
    
    // Convert both to strings for comparison
    const targetId = String(electionId);
    return registeredElections.some(id => String(id) === targetId);
  }, [registeredElections, universalAccess]);

  // Toggle universal access (for development)
  const toggleUniversalAccess = useCallback(() => {
    setUniversalAccess(prev => {
      const newValue = !prev;
      // Save to localStorage
      localStorage.setItem('universalAccessMode', newValue.toString());
      console.log(`Universal access ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
    
    // Reset initialLoad state to force a refresh
    initialLoadRef.current = {};
    
    // Force reload of registrations
    loadRegistrations(true);
  }, [loadRegistrations]);
  
  // Get status for a specific election
  const getVoterStatusForElection = useCallback((electionId) => {
    // FIX: Only allow universal access in development mode when explicitly enabled
    if (universalAccess && process.env.NODE_ENV === 'development') {
      return 'approved';
    }
    return voterStatuses[electionId] || 'none';
  }, [voterStatuses, universalAccess]);

  // Get all registration statuses
  const getAllVoterStatuses = useCallback(() => {
    // FIX: Only allow universal access in development mode when explicitly enabled
    if (universalAccess && process.env.NODE_ENV === 'development') {
      // Return approved for all registrations if in universal access mode
      const allApproved = {...voterStatuses};
      Object.keys(allApproved).forEach(key => {
        allApproved[key] = 'approved';
      });
      return allApproved;
    }
    return voterStatuses;
  }, [voterStatuses, universalAccess]);

  // Check registration status
  const getRegistrationStatus = useCallback(async (electionId) => {
    // FIX: Only allow universal access in development mode when explicitly enabled
    if (universalAccess && process.env.NODE_ENV === 'development') {
      return 'approved';
    }
    
    if (!account || !electionId) return null;
    
    try {
      const status = await ipfsService.getUserRegistrationStatus(account, electionId);
      
      // Update the status in state if we get a result
      if (status) {
        setVoterStatuses(prev => ({
          ...prev,
          [electionId]: status
        }));
      }
      
      return status;
    } catch (err) {
      console.error('Error getting registration status:', err);
      return null;
    }
  }, [account, ipfsService, universalAccess]);

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
          if (typeof contractWithSigner.addAllowedVoter === 'function') {
            const tx = await contractWithSigner.addAllowedVoter(electionId, account);
            await tx.wait();
            console.log(`Successfully added voter ${account} to blockchain for election ${electionId}`);
          } else {
            // Fallback to localStorage
            const key = `allowed_voters_${electionId}`;
            const allowedVoters = JSON.parse(localStorage.getItem(key) || '[]');
            
            if (!allowedVoters.includes(account)) {
              allowedVoters.push(account);
              localStorage.setItem(key, JSON.stringify(allowedVoters));
            }
          }
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
      
      // Update local state
      setVoterStatuses(prev => ({
        ...prev,
        [electionId]: status
      }));
      
      // If approved, add to registered elections
      if (status === 'approved') {
        setRegisteredElections(prev => {
          if (prev.includes(electionId)) return prev;
          return [...prev, electionId];
        });
      }
      
      // Reload registrations with force refresh
      await loadRegistrations(true);
      
      return true;
    } catch (err) {
      console.error('Error registering for election:', err);
      return false;
    }
  }, [account, ipfsService, loadRegistrations, contract, signer]);

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
        } else {
          console.warn("Contract doesn't have addAllowedVoter function");
          
          // Fallback if function doesn't exist - store in localStorage
          const key = `allowed_voters_${electionId}`;
          const allowedVoters = JSON.parse(localStorage.getItem(key) || '[]');
          
          if (!allowedVoters.includes(voterAddress)) {
            allowedVoters.push(voterAddress);
            localStorage.setItem(key, JSON.stringify(allowedVoters));
          }
        }
        
        // Also update user_registrations for the voter
        const userRefsKey = `user_registrations_${voterAddress}`;
        const userRefs = JSON.parse(localStorage.getItem(userRefsKey) || '[]');
        
        // Find if we already have a reference for this election
        const index = userRefs.findIndex(ref => ref.electionId == electionId);
        const updatedRef = {
          electionId: electionId,
          status: 'approved',
          updatedAt: new Date().toISOString()
        };
        
        if (index >= 0) {
          userRefs[index] = {...userRefs[index], ...updatedRef};
        } else {
          userRefs.push(updatedRef);
        }
        
        localStorage.setItem(userRefsKey, JSON.stringify(userRefs));
        
        // If this affects the current user, update state
        if (voterAddress.toLowerCase() === account?.toLowerCase()) {
          setVoterStatuses(prev => ({
            ...prev,
            [electionId]: 'approved'
          }));
          
          setRegisteredElections(prev => {
            if (prev.some(id => id == electionId)) return prev;
            return [...prev, parseInt(electionId)];
          });
        }
        
        return true;
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
  }, [contract, signer, ipfsService, account]);

  // Reject a voter registration
  const rejectVoterRegistration = useCallback(async (electionId, voterAddress) => {
    try {
      // Update registration status in IPFS
      const updatedRegistration = {
        electionId,
        walletAddress: voterAddress,
        status: 'rejected',
        updatedAt: new Date().toISOString()
      };
      
      await ipfsService.updateRegistrationStatus(updatedRegistration, 'rejected');
      
      // Update local storage reference
      const userRefsKey = `user_registrations_${voterAddress}`;
      const userRefs = JSON.parse(localStorage.getItem(userRefsKey) || '[]');
      
      // Find if we already have a reference for this election
      const index = userRefs.findIndex(ref => ref.electionId == electionId);
      const updatedRef = {
        electionId: electionId,
        status: 'rejected',
        updatedAt: new Date().toISOString()
      };
      
      if (index >= 0) {
        userRefs[index] = {...userRefs[index], ...updatedRef};
      } else {
        userRefs.push(updatedRef);
      }
      
      localStorage.setItem(userRefsKey, JSON.stringify(userRefs));
      
      // Update local state if this is for the current user
      if (voterAddress.toLowerCase() === account?.toLowerCase()) {
        setVoterStatuses(prev => ({
          ...prev,
          [electionId]: 'rejected'
        }));
        
        // Remove from registered elections if present
        setRegisteredElections(prev => 
          prev.filter(id => id != electionId)
        );
      }
      
      return true;
    } catch (err) {
      console.error('Error rejecting voter registration:', err);
      return false;
    }
  }, [account, ipfsService]);

  // Load registrations when account changes, but only once per account
  useEffect(() => {
    if (account && (!initialLoadRef.current[account] || universalAccess)) {
      loadRegistrations();
    }
    
    // Clear registrations when account changes
    if (!account) {
      setRegisteredElections([]);
      setVoterStatuses({});
      initialLoadRef.current = {};
    }
  }, [account, loadRegistrations, universalAccess]);

  const value = {
    registeredElections,
    voterStatuses,
    isRegisteredForElection,
    registerForElection,
    getRegistrationStatus,
    getVoterStatusForElection,
    getAllVoterStatuses,
    refreshRegistrations: (force) => loadRegistrations(force),
    addAllowedVoter,
    rejectVoterRegistration,
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