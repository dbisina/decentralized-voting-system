import { useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import IPFSRegistrationService from '../services/ipfsRegistrationService';

/**
 * Custom hook to manage voter registration status
 * This hook provides functionality to check and manage voter registrations
 */
const useVoterRegistration = () => {
  const { account } = useWeb3();
  const [registeredElections, setRegisteredElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cachedStatuses, setCachedStatuses] = useState({});
  
  // Use ref to prevent recreation of service on each render
  const ipfsService = useRef(new IPFSRegistrationService()).current;
  
  // Track if initial load has been performed
  const initialLoadDone = useRef(false);
  
  // Keep track of request IDs to prevent duplicate requests
  const pendingRequests = useRef(new Set());

  /**
   * Load all registrations for the current user
   * @param {boolean} forceRefresh - Whether to force refresh even if data exists
   */
  const loadRegistrations = useCallback(async (forceRefresh = false) => {
    // Skip if already loading or if we've already loaded and not forcing refresh
    if (!account || (initialLoadDone.current && !forceRefresh)) {
      return;
    }
    
    // Generate a unique request ID
    const requestId = `load-${account}-${Date.now()}`;
    
    // Skip if this exact request is already pending
    if (pendingRequests.current.has(requestId)) {
      return;
    }
    
    try {
      setIsLoading(true);
      pendingRequests.current.add(requestId);
      
      console.log(`Loading voter registrations for ${account}`);
      
      // Get user registrations from local references
      const userRefsKey = `user_registrations_${account}`;
      const userRefs = JSON.parse(localStorage.getItem(userRefsKey) || '[]');
      
      // Initialize with empty array
      const electionIds = [];
      const newCachedStatuses = {...cachedStatuses};
      
      // Check each reference to see if it's approved
      for (const ref of userRefs) {
        try {
          // First check cached status
          if (ref.status === 'approved') {
            electionIds.push(ref.electionId);
            newCachedStatuses[ref.electionId] = 'approved';
            continue;
          }
          
          // Get the full registration to check status
          const registration = await ipfsService.getRegistration(ref.ipfsHash);
          
          // Only add to list if approved
          if (registration && registration.status === 'approved') {
            electionIds.push(ref.electionId);
            newCachedStatuses[ref.electionId] = 'approved';
          } else if (registration) {
            // Store the status even if not approved
            newCachedStatuses[ref.electionId] = registration.status;
          }
        } catch (err) {
          console.warn(`Error loading registration ${ref.ipfsHash}:`, err);
        }
      }
      
      setRegisteredElections(electionIds);
      setCachedStatuses(newCachedStatuses);
      initialLoadDone.current = true;
      
    } catch (err) {
      console.error('Error loading voter registrations:', err);
      setError('Failed to load registration data. Please try again.');
    } finally {
      setIsLoading(false);
      pendingRequests.current.delete(requestId);
    }
  }, [account, ipfsService, cachedStatuses]);

  /**
   * Check if user is registered for a specific election
   * @param {string|number} electionId - Election ID to check
   * @returns {boolean} - Whether user is registered
   */
  const isRegisteredForElection = useCallback((electionId) => {
    if (!electionId) return false;
    
    // Check if the user is the election admin (admins always have access)
    // This would require the election data, so usually checked elsewhere
    
    // Convert both to strings for comparison (handles both number and string IDs)
    const targetId = String(electionId);
    return registeredElections.some(id => String(id) === targetId);
  }, [registeredElections]);

  /**
   * Get registration status for an election
   * @param {string|number} electionId - Election ID
   * @returns {Promise<string|null>} - Registration status or null
   */
  const getRegistrationStatus = useCallback(async (electionId) => {
    if (!account || !electionId) return null;
    
    // Check cached status first
    if (cachedStatuses[electionId]) {
      return cachedStatuses[electionId];
    }
    
    try {
      // Generate request ID to prevent duplicates
      const requestId = `status-${account}-${electionId}-${Date.now()}`;
      if (pendingRequests.current.has(requestId)) {
        return null;
      }
      
      pendingRequests.current.add(requestId);
      
      const status = await ipfsService.getUserRegistrationStatus(account, electionId);
      
      // Update cached statuses
      if (status) {
        setCachedStatuses(prev => ({
          ...prev,
          [electionId]: status
        }));
      }
      
      pendingRequests.current.delete(requestId);
      return status;
    } catch (err) {
      console.error('Error getting registration status:', err);
      return null;
    }
  }, [account, ipfsService, cachedStatuses]);

  /**
   * Submit a registration for an election
   * @param {string|number} electionId - Election ID
   * @param {Object} registrationData - Registration data
   * @returns {Promise<Object>} - Result with success flag
   */
  const submitRegistration = useCallback(async (electionId, registrationData) => {
    try {
      if (!account || !electionId) {
        throw new Error('Wallet not connected or election ID missing');
      }
      
      // Check if we already have a pending registration
      const status = await getRegistrationStatus(electionId);
      if (status) {
        return { 
          success: false, 
          error: `You have already submitted a registration (status: ${status})`
        };
      }
      
      // Prepare full registration data
      const fullRegistrationData = {
        ...registrationData,
        electionId,
        walletAddress: account,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      // Store on IPFS
      const ipfsHash = await ipfsService.storeRegistration(fullRegistrationData);
      
      // Update cached status
      setCachedStatuses(prev => ({
        ...prev,
        [electionId]: 'pending'
      }));
      
      return { success: true, ipfsHash };
    } catch (error) {
      console.error('Error submitting registration:', error);
      return { success: false, error: error.message };
    }
  }, [account, ipfsService, getRegistrationStatus]);

  /**
   * Mock function to register a user directly (for testing)
   * @param {string|number} electionId - Election ID
   * @param {string} status - Status to set
   * @returns {Promise<boolean>} - Success flag
   */
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
      
      // Update cached status
      setCachedStatuses(prev => ({
        ...prev,
        [electionId]: status
      }));
      
      // If approved, add to registered elections
      if (status === 'approved') {
        setRegisteredElections(prev => {
          const stringId = String(electionId);
          if (prev.some(id => String(id) === stringId)) {
            return prev; // Already registered
          }
          return [...prev, electionId];
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error registering for election:', err);
      return false;
    }
  }, [account, ipfsService]);

  // Load registrations when account changes
  useEffect(() => {
    if (account && !initialLoadDone.current) {
      loadRegistrations();
    }
    
    // Clear registrations when account changes
    if (!account) {
      setRegisteredElections([]);
      setCachedStatuses({});
      initialLoadDone.current = false;
    }
    
    // Cleanup function to clear pending requests on unmount
    return () => {
      pendingRequests.current.clear();
    };
  }, [account, loadRegistrations]);

  return {
    registeredElections,
    isRegisteredForElection,
    registerForElection,
    getRegistrationStatus,
    submitRegistration,
    refreshRegistrations: loadRegistrations,
    isLoading,
    error,
    cachedStatuses
  };
};

export default useVoterRegistration;