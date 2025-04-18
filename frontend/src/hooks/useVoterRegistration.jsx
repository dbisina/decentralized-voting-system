import { useVoterRegistration as useVoterRegistrationContext } from '../contexts/VoterRegistrationContext';
import IPFSRegistrationService from '../services/ipfsRegistrationService';
import { useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

/**
 * Custom hook to manage voter registration status
 * This hook wraps the context and provides additional functionality
 */
const useVoterRegistration = () => {
  const { account } = useWeb3();
  const contextValue = useVoterRegistrationContext();
  const ipfsService = new IPFSRegistrationService();
  
  // Add a function to submit a new registration
  const submitRegistration = useCallback(async (electionId, registrationData) => {
    try {
      if (!account || !electionId) {
        throw new Error('Wallet not connected or election ID missing');
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
      
      // Refresh registrations
      await contextValue.refreshRegistrations();
      
      return { success: true, ipfsHash };
    } catch (error) {
      console.error('Error submitting registration:', error);
      return { success: false, error: error.message };
    }
  }, [account, ipfsService, contextValue]);
  
  // Get all user's registrations (including pending ones)
  const getUserRegistrations = useCallback(async () => {
    try {
      if (!account) return [];
      
      // Get user references from localStorage
      const key = `user_registrations_${account}`;
      const references = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Fetch the full registration data for each reference
      const registrations = [];
      
      for (const ref of references) {
        try {
          const registration = await ipfsService.getRegistration(ref.ipfsHash);
          if (registration) {
            registrations.push(registration);
          }
        } catch (err) {
          console.warn(`Error fetching registration ${ref.ipfsHash}:`, err);
        }
      }
      
      return registrations;
    } catch (error) {
      console.error('Error getting user registrations:', error);
      return [];
    }
  }, [account, ipfsService]);
  
  // Return the enhanced hook value
  return {
    ...contextValue,
    submitRegistration,
    getUserRegistrations
  };
};

export default useVoterRegistration;