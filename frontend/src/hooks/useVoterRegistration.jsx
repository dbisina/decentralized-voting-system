// src/hooks/useVoterRegistration.jsx
import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

/**
 * Custom hook to manage voter registration status
 * Returns elections the current user is registered for
 */
const useVoterRegistration = () => {
  const { account } = useWeb3();
  const [registeredElections, setRegisteredElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load voter registrations from localStorage
  const loadRegistrations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!account) {
        setRegisteredElections([]);
        return;
      }

      // Get all registrations from localStorage
      const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      
      // Filter for the current user's approved registrations
      const userRegistrations = allRegistrations.filter(
        reg => reg.walletAddress.toLowerCase() === account.toLowerCase() && 
              reg.status === 'approved'
      );
      
      // Extract just the election IDs
      const electionIds = userRegistrations.map(reg => reg.electionId);
      
      setRegisteredElections(electionIds);
    } catch (err) {
      console.error('Error loading voter registrations:', err);
      setError('Failed to load registration data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  // Check if user is registered for a specific election
  const isRegisteredForElection = useCallback((electionId) => {
    if (!electionId) return false;
    
    // Convert both to strings for comparison
    const targetId = electionId.toString();
    return registeredElections.some(id => id.toString() === targetId);
  }, [registeredElections]);

  // Register a user for an election (for testing purposes)
  const registerForElection = useCallback(async (electionId, status = 'approved') => {
    try {
      if (!account || !electionId) return false;
      
      const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      
      // Check if already registered
      const existingReg = allRegistrations.findIndex(
        reg => reg.walletAddress.toLowerCase() === account.toLowerCase() && 
              reg.electionId === electionId
      );
      
      if (existingReg >= 0) {
        // Update existing registration
        allRegistrations[existingReg].status = status;
      } else {
        // Add new registration
        allRegistrations.push({
          electionId,
          walletAddress: account,
          status,
          timestamp: new Date().toISOString(),
          fullName: 'Test User', // This would come from the registration form in a real app
          identifier: 'TEST-ID-123'
        });
      }
      
      localStorage.setItem('voterRegistrations', JSON.stringify(allRegistrations));
      
      // Reload registrations
      await loadRegistrations();
      
      return true;
    } catch (err) {
      console.error('Error registering for election:', err);
      return false;
    }
  }, [account, loadRegistrations]);

  // Load registrations when component mounts or account changes
  useEffect(() => {
    loadRegistrations();
  }, [account, loadRegistrations]);

  return {
    registeredElections,
    isRegisteredForElection,
    registerForElection,
    refreshRegistrations: loadRegistrations,
    isLoading,
    error
  };
};

export default useVoterRegistration;