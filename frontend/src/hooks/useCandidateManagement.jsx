// frontend/src/hooks/useCandidateManagement.jsx

import { useState, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import useBlockchain from './useBlockchain';
import IPFSService from '../services/ipfsService';

/**
 * Custom hook for managing candidates in elections
 */
const useCandidateManagement = (electionId) => {
  const { account } = useWeb3();
  const { blockchainService } = useBlockchain();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const ipfsService = new IPFSService();
  
  // Add a candidate with better error handling and retries
  const addCandidate = useCallback(async (candidateData) => {
    if (!account || !blockchainService || !electionId) {
      setError('Missing required connection data');
      return { success: false, error: 'Missing connection data' };
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Adding candidate "${candidateData.name}" to election ${electionId}`);
      
      // First store candidate details on IPFS
      const ipfsCid = await ipfsService.storeCandidateDetails({
        name: candidateData.name,
        bio: candidateData.bio || '',
        platform: candidateData.platform || '',
        photoUrl: candidateData.photoUrl || ''
      });
      
      console.log(`Stored candidate details on IPFS with CID: ${ipfsCid}`);
      
      // Then add to blockchain with retry logic
      let success = false;
      let attemptCount = 0;
      let lastError = null;
      
      while (!success && attemptCount < 2) {
        try {
          const result = await blockchainService.addCandidate(electionId, candidateData.name, ipfsCid);
          console.log(`Successfully added candidate to blockchain. Transaction: ${result.transactionHash}`);
          
          success = true;
          return { 
            success: true, 
            transactionHash: result.transactionHash,
            ipfsCid,
            candidateId: result.candidateId
          };
        } catch (err) {
          console.error(`Attempt ${attemptCount + 1} failed:`, err);
          lastError = err;
          attemptCount++;
          
          // Wait before retrying
          if (attemptCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // If we got here, all attempts failed
      throw lastError || new Error('Failed to add candidate after multiple attempts');
    } catch (err) {
      console.error('Error adding candidate:', err);
      setError(err.message || 'Failed to add candidate');
      return { 
        success: false, 
        error: err.message || 'Unknown error occurred'
      };
    } finally {
      setIsLoading(false);
    }
  }, [account, blockchainService, electionId, ipfsService]);
  
  // Get a specific candidate
  const getCandidate = useCallback(async (candidateId) => {
    if (!blockchainService || !electionId || !candidateId) {
      return null;
    }
    
    try {
      setIsLoading(true);
      
      // Get candidate from blockchain
      const candidate = await blockchainService.getCandidate(electionId, candidateId);
      
      if (!candidate) {
        throw new Error(`Candidate ${candidateId} not found`);
      }
      
      // Try to get additional details from IPFS if available
      let candidateDetails = {};
      if (candidate.details && candidate.details.startsWith('Qm')) {
        try {
          candidateDetails = await ipfsService.getFromIPFS(candidate.details);
        } catch (ipfsError) {
          console.warn(`Could not get IPFS details for candidate ${candidateId}:`, ipfsError);
        }
      }
      
      // Combine blockchain data with IPFS details
      return {
        ...candidate,
        ...candidateDetails
      };
    } catch (error) {
      console.error(`Error getting candidate ${candidateId}:`, error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [blockchainService, electionId, ipfsService]);
  
  // Get all candidates for the election with better error handling
  const getAllCandidates = useCallback(async () => {
    if (!blockchainService || !electionId) {
      return [];
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get election details to know how many candidates
      const election = await blockchainService.getElectionDetails(electionId);
      
      if (!election) {
        throw new Error(`Election ${electionId} not found`);
      }
      
      const candidateCount = election.candidateCount || 0;
      console.log(`Getting ${candidateCount} candidates for election ${electionId}`);
      
      if (candidateCount === 0) {
        return [];
      }
      
      // Get all candidates
      const candidates = [];
      const errors = [];
      
      for (let i = 1; i <= candidateCount; i++) {
        try {
          const candidate = await getCandidate(i);
          if (candidate) {
            candidates.push(candidate);
          }
        } catch (err) {
          console.error(`Error fetching candidate ${i}:`, err);
          errors.push(err);
        }
      }
      
      if (candidates.length === 0 && errors.length > 0) {
        throw new Error('Failed to fetch any candidates');
      }
      
      return candidates;
    } catch (error) {
      console.error('Error getting all candidates:', error);
      setError(error.message || 'Failed to get candidates');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [blockchainService, electionId, getCandidate]);
  
  return {
    addCandidate,
    getCandidate,
    getAllCandidates,
    isLoading,
    error
  };
};

export default useCandidateManagement;