// Create this file: src/hooks/useDirectContract.jsx

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

/**
 * Hook for direct interaction with contract, bypassing services
 */
const useDirectContract = (contractAddress) => {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // Minimal ABI for our functions
  const minimalABI = [
    "function electionCount() view returns (uint256)",
    "function getElectionDetails(uint256 _electionId) view returns (uint256 id, string title, string description, uint256 startTime, uint256 endTime, bool finalized, address admin, uint256 candidateCount, uint256 totalVotes)",
    "function getCandidate(uint256 _electionId, uint256 _candidateId) view returns (uint256 id, string name, string details, uint256 voteCount)"
  ];
  
  // Connect to contract
  const connectToContract = useCallback(async (address) => {
    try {
      setError(null);
      
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }
      
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      
      setProvider(ethersProvider);
      
      const contractInstance = new ethers.Contract(
        address || contractAddress,
        minimalABI,
        ethersProvider
      );
      
      setContract(contractInstance);
      setIsConnected(true);
      
      return contractInstance;
    } catch (err) {
      console.error("Error connecting to contract:", err);
      setError(err.message);
      setIsConnected(false);
      return null;
    }
  }, [contractAddress]);
  
  // Connect on mount if address is provided
  useEffect(() => {
    if (contractAddress) {
      connectToContract(contractAddress);
    }
  }, [contractAddress, connectToContract]);
  
  // Get election details directly
  const getElectionDetails = useCallback(async (electionId) => {
    try {
      if (!contract) {
        const contractInstance = await connectToContract();
        if (!contractInstance) {
          throw new Error("Failed to connect to contract");
        }
      }
      
      const result = await contract.getElectionDetails(electionId);
      
      return {
        id: result.id.toNumber(),
        title: result.title,
        description: result.description,
        startTime: new Date(result.startTime.toNumber() * 1000),
        endTime: new Date(result.endTime.toNumber() * 1000),
        finalized: result.finalized,
        admin: result.admin,
        candidateCount: result.candidateCount.toNumber(),
        totalVotes: result.totalVotes.toNumber()
      };
    } catch (err) {
      console.error(`Error getting election ${electionId}:`, err);
      setError(err.message);
      return null;
    }
  }, [contract, connectToContract]);
  
  // Get candidate details directly
  const getCandidate = useCallback(async (electionId, candidateId) => {
    try {
      if (!contract) {
        const contractInstance = await connectToContract();
        if (!contractInstance) {
          throw new Error("Failed to connect to contract");
        }
      }
      
      const result = await contract.getCandidate(electionId, candidateId);
      
      return {
        id: result.id.toNumber(),
        name: result.name,
        details: result.details,
        voteCount: result.voteCount.toNumber()
      };
    } catch (err) {
      console.error(`Error getting candidate ${candidateId} for election ${electionId}:`, err);
      setError(err.message);
      return null;
    }
  }, [contract, connectToContract]);
  
  // Get all candidates for an election
  const getAllCandidates = useCallback(async (electionId) => {
    try {
      if (!contract) {
        const contractInstance = await connectToContract();
        if (!contractInstance) {
          throw new Error("Failed to connect to contract");
        }
      }
      
      // Get election to know how many candidates
      const election = await getElectionDetails(electionId);
      if (!election) {
        throw new Error(`Election ${electionId} not found`);
      }
      
      const candidates = [];
      
      // Fetch each candidate
      for (let i = 1; i <= election.candidateCount; i++) {
        try {
          const candidate = await getCandidate(electionId, i);
          if (candidate) {
            candidates.push(candidate);
          }
        } catch (candidateError) {
          console.warn(`Error fetching candidate ${i}:`, candidateError);
        }
      }
      
      return candidates;
    } catch (err) {
      console.error(`Error getting candidates for election ${electionId}:`, err);
      setError(err.message);
      return [];
    }
  }, [contract, connectToContract, getElectionDetails, getCandidate]);
  
  return {
    provider,
    contract,
    isConnected,
    error,
    connectToContract,
    getElectionDetails,
    getCandidate,
    getAllCandidates
  };
};

export default useDirectContract;