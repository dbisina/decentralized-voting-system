import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import BlockchainService from '../services/blockchainService';
import IPFSService from '../services/ipfsService';

/**
 * Custom hook for managing election data and operations
 */
const useElections = () => {
  const { contract, signer, account, isLoading: web3Loading } = useWeb3();
  
  const [allElections, setAllElections] = useState([]);
  const [activeElections, setActiveElections] = useState([]);
  const [completedElections, setCompletedElections] = useState([]);
  const [upcomingElections, setUpcomingElections] = useState([]);
  const [draftElections, setDraftElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const ipfsService = new IPFSService();
  
  /**
   * Fetch all elections from the blockchain
   */
  const fetchElections = useCallback(async () => {
    if (!contract) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const blockchainService = new BlockchainService(contract, signer);
      const elections = await blockchainService.getAllElections();
      
      // Process and enhance election data
      const processedElections = await enhanceElectionsWithIPFSData(elections);
      
      setAllElections(processedElections);
      
      // Categorize elections
      const active = processedElections.filter(e => e.status === 'active');
      const completed = processedElections.filter(e => e.status === 'completed');
      const upcoming = processedElections.filter(e => e.status === 'upcoming');
      const drafts = processedElections.filter(e => e.status === 'draft');
      
      setActiveElections(active);
      setCompletedElections(completed);
      setUpcomingElections(upcoming);
      setDraftElections(drafts);
    } catch (err) {
      console.error('Error fetching elections:', err);
      setError('Failed to load elections. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);
  
  /**
   * Enhance election data with IPFS content
   * @param {Array} elections - Raw election data from blockchain
   * @returns {Promise<Array>} Enhanced election data
   */
  const enhanceElectionsWithIPFSData = async (elections) => {
    // Process each election to fetch additional data from IPFS
    return Promise.all(elections.map(async (election) => {
      try {
        // Fetch election details from IPFS if hash exists
        let additionalDetails = {};
        if (election.description && election.description.startsWith('Qm')) {
          try {
            additionalDetails = await ipfsService.getFromIPFS(election.description);
          } catch (ipfsError) {
            console.warn(`Could not fetch IPFS data for election ${election.id}:`, ipfsError);
          }
        }
        
        // Process candidates to fetch their details from IPFS
        const candidatesWithDetails = await Promise.all(election.candidates.map(async (candidate) => {
          try {
            let candidateDetails = {};
            if (candidate.details && candidate.details.startsWith('Qm')) {
              try {
                candidateDetails = await ipfsService.getFromIPFS(candidate.details);
              } catch (ipfsError) {
                console.warn(`Could not fetch IPFS data for candidate ${candidate.id}:`, ipfsError);
              }
            }
            
            return {
              ...candidate,
              ...candidateDetails
            };
          } catch (error) {
            console.error(`Error processing candidate ${candidate.id}:`, error);
            return candidate;
          }
        }));
        
        // Calculate voter participation percentage
        const participationPercentage = election.totalVotes > 0 
          ? (election.totalVotes / Math.max(1, election.voterCount || 0) * 100).toFixed(1)
          : 0;
        
        // Format dates for display
        const formattedStartDate = new Date(election.startTime).toLocaleDateString();
        const formattedEndDate = new Date(election.endTime).toLocaleDateString();
        
        // Prepare combined election object with all data
        return {
          ...election,
          ...additionalDetails,
          candidates: candidatesWithDetails,
          participationPercentage,
          formattedStartDate,
          formattedEndDate,
          timeRemaining: calculateTimeRemaining(election)
        };
      } catch (error) {
        console.error(`Error processing election ${election.id}:`, error);
        return election;
      }
    }));
  };
  
  /**
   * Calculate time remaining for an election
   * @param {Object} election - Election data
   * @returns {string} Formatted time remaining
   */
  const calculateTimeRemaining = (election) => {
    const now = new Date();
    const endTime = new Date(election.endTime);
    const startTime = new Date(election.startTime);
    
    if (election.status === 'completed') {
      return 'Completed';
    }
    
    if (now < startTime) {
      const diffMs = startTime - now;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (diffDays > 0) {
        return `Starts in ${diffDays}d ${diffHours}h`;
      } else {
        return `Starts in ${diffHours}h`;
      }
    }
    
    if (now > endTime) {
      return 'Ended';
    }
    
    const diffMs = endTime - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h remaining`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m remaining`;
    } else {
      return `${diffMinutes}m remaining`;
    }
  };
  
  /**
   * Create a new election
   * @param {Object} electionData - Election data
   * @returns {Promise<Object>} Transaction result
   */
  const createElection = async (electionData) => {
    if (!contract || !signer || !account) {
      throw new Error('Wallet not connected. Please connect your wallet to create an election.');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Store detailed information on IPFS
      const ipfsCid = await ipfsService.storeElectionDetails({
        title: electionData.title,
        description: electionData.description,
        rules: electionData.rules,
        additionalInfo: electionData.additionalInfo
      });
      
      // Create election on blockchain with IPFS reference
      const blockchainService = new BlockchainService(contract, signer);
      const result = await blockchainService.createElection(
        electionData.title,
        ipfsCid,
        new Date(electionData.startDate).getTime(),
        new Date(electionData.endDate).getTime()
      );
      
      // Refresh elections list
      await fetchElections();
      
      return result;
    } catch (err) {
      console.error('Error creating election:', err);
      setError('Failed to create election. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Add a candidate to an election
   * @param {number} electionId - ID of the election
   * @param {Object} candidateData - Candidate data
   * @returns {Promise<Object>} Transaction result
   */
  const addCandidate = async (electionId, candidateData) => {
    if (!contract || !signer || !account) {
      throw new Error('Wallet not connected. Please connect your wallet to add a candidate.');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Store candidate details on IPFS
      const ipfsCid = await ipfsService.storeCandidateDetails({
        name: candidateData.name,
        bio: candidateData.bio,
        platform: candidateData.platform,
        photoUrl: candidateData.photoUrl,
        additionalInfo: candidateData.additionalInfo
      });
      
      // Add candidate to blockchain with IPFS reference
      const blockchainService = new BlockchainService(contract, signer);
      const result = await blockchainService.addCandidate(
        electionId,
        candidateData.name,
        ipfsCid
      );
      
      // Refresh elections list
      await fetchElections();
      
      return result;
    } catch (err) {
      console.error('Error adding candidate:', err);
      setError('Failed to add candidate. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Cast a vote in an election
   * @param {number} electionId - ID of the election
   * @param {number} candidateId - ID of the candidate
   * @returns {Promise<Object>} Transaction result
   */
  const castVote = async (electionId, candidateId) => {
    if (!contract || !signer || !account) {
      throw new Error('Wallet not connected. Please connect your wallet to vote.');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const blockchainService = new BlockchainService(contract, signer);
      
      // Check if user has already voted
      const hasVoted = await blockchainService.hasVoted(electionId, account);
      if (hasVoted) {
        throw new Error('You have already voted in this election.');
      }
      
      // Cast vote on blockchain
      const result = await blockchainService.vote(electionId, candidateId);
      
      // Refresh elections list
      await fetchElections();
      
      return result;
    } catch (err) {
      console.error('Error casting vote:', err);
      setError(err.message || 'Failed to cast vote. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Finalize an election
   * @param {number} electionId - ID of the election
   * @returns {Promise<Object>} Transaction result
   */
  const finalizeElection = async (electionId) => {
    if (!contract || !signer || !account) {
      throw new Error('Wallet not connected. Please connect your wallet to finalize the election.');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const blockchainService = new BlockchainService(contract, signer);
      const result = await blockchainService.finalizeElection(electionId);
      
      // Refresh elections list
      await fetchElections();
      
      return result;
    } catch (err) {
      console.error('Error finalizing election:', err);
      setError('Failed to finalize election. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch elections when contract or signer changes
  useEffect(() => {
    if (contract && !web3Loading) {
      fetchElections();
    }
  }, [contract, signer, web3Loading, fetchElections]);
  
  // Schedule regular updates of time remaining
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (allElections.length > 0) {
        const updatedElections = allElections.map(election => ({
          ...election,
          timeRemaining: calculateTimeRemaining(election)
        }));
        
        setAllElections(updatedElections);
        setActiveElections(updatedElections.filter(e => e.status === 'active'));
        setUpcomingElections(updatedElections.filter(e => e.status === 'upcoming'));
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, [allElections]);
  
  return {
    allElections,
    activeElections,
    completedElections,
    upcomingElections,
    draftElections,
    isLoading: isLoading || web3Loading,
    error,
    createElection,
    addCandidate,
    castVote,
    finalizeElection,
    refreshElections: fetchElections
  };
};

export default useElections;