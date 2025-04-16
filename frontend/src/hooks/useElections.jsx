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
      // Log election data for debugging
      console.log(`Enhancing election ${election.id}: ${election.title}`);
      console.log(`Candidate count: ${election.candidateCount}`);
      
      // Fetch election details from IPFS if hash exists
      let additionalDetails = {};
      if (election.description && election.description.startsWith('Qm')) {
        try {
          console.log(`Fetching IPFS data for election description: ${election.description}`);
          additionalDetails = await ipfsService.getFromIPFS(election.description);
          console.log('Additional details retrieved:', additionalDetails);
        } catch (ipfsError) {
          console.warn(`Could not fetch IPFS data for election ${election.id}:`, ipfsError);
          // Continue without additional details
        }
      }
      
      // Process candidates - this is the critical part for your issue
      let candidatesWithDetails = [];
      if (election.candidates && Array.isArray(election.candidates)) {
        console.log(`Found ${election.candidates.length} candidates to enhance`);
        
        candidatesWithDetails = await Promise.all(election.candidates.map(async (candidate) => {
          try {
            let candidateDetails = {};
            if (candidate.details && candidate.details.startsWith('Qm')) {
              try {
                console.log(`Fetching IPFS data for candidate ${candidate.id}: ${candidate.details}`);
                candidateDetails = await ipfsService.getFromIPFS(candidate.details);
                console.log(`Retrieved details for candidate ${candidate.id}:`, candidateDetails);
              } catch (ipfsError) {
                console.warn(`Could not fetch IPFS data for candidate ${candidate.id}:`, ipfsError);
                // Use fallback data
                candidateDetails = {
                  name: candidate.name || "Candidate",
                  bio: "Candidate information unavailable",
                  platform: ""
                };
              }
            }
            
            // Return the combined candidate data
            return {
              ...candidate,
              ...candidateDetails
            };
          } catch (error) {
            console.error(`Error processing candidate ${candidate.id}:`, error);
            // Return the original candidate to prevent breaking the array
            return candidate;
          }
        }));
      } else {
        console.warn(`No candidates array found for election ${election.id}`);
        
        // If candidates is not an array, try to fetch them directly
        if (election.candidateCount > 0) {
          console.log(`Attempting to fetch ${election.candidateCount} candidates directly for election ${election.id}`);
          
          try {
            // Create a new blockchain service instance
            const blockchainService = new BlockchainService(contract, signer);
            // Fetch candidates directly
            const fetchedCandidates = await blockchainService.getElectionCandidates(
              election.id, 
              election.candidateCount
            );
            
            console.log(`Fetched ${fetchedCandidates.length} candidates directly:`, fetchedCandidates);
            
            // Process the fetched candidates
            candidatesWithDetails = await Promise.all(fetchedCandidates.map(async (candidate) => {
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
                console.error(`Error processing fetched candidate ${candidate.id}:`, error);
                return candidate;
              }
            }));
          } catch (fetchError) {
            console.error(`Error fetching candidates directly for election ${election.id}:`, fetchError);
            candidatesWithDetails = [];
          }
        } else {
          candidatesWithDetails = [];
        }
      }
      
      // Calculate voter participation percentage
      const participationPercentage = election.totalVotes > 0 
        ? (election.totalVotes / Math.max(1, election.voterCount || 0) * 100).toFixed(1)
        : 0;
      
      // Format dates for display
      const formattedStartDate = new Date(election.startTime).toLocaleDateString();
      const formattedEndDate = new Date(election.endTime).toLocaleDateString();
      
      // Determine election status
      const now = new Date();
      let status = '';
      
      if (election.finalized) {
        status = 'completed';
      } else if (now < new Date(election.startTime)) {
        status = 'upcoming';
      } else if (now > new Date(election.endTime)) {
        status = 'ended';
      } else {
        status = 'active';
      }
      
      // Prepare combined election object with all data
      return {
        ...election,
        ...additionalDetails,
        candidates: candidatesWithDetails,
        participationPercentage,
        formattedStartDate,
        formattedEndDate,
        timeRemaining: calculateTimeRemaining(election),
        status
      };
    } catch (error) {
      console.error(`Error processing election ${election.id}:`, error);
      
      // Return the original election object to prevent breaking the array
      return {
        ...election,
        status: 'error',
        errorMessage: error.message,
        candidates: election.candidates || []
      };
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
  
  // Update the addCandidate function in useElections.jsx to handle timing requirements:

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
      
      // Check if election can accept candidates
      const blockchainService = new BlockchainService(contract, signer);
      const election = await blockchainService.getElectionDetails(electionId);
      const now = Math.floor(Date.now() / 1000);
      
      if (now >= election.startTime) {
        throw new Error('Cannot add candidate after election has started. Please create a new election with a future start time.');
      }
      
      // Handle different formats of candidateData for better flexibility
      let candidateName, candidateDetails;
      
      if (typeof candidateData === 'object') {
        // If candidateData is an object, extract name and details
        candidateName = candidateData.name;
        candidateDetails = candidateData.details || '';
      } else {
        // For backward compatibility, assume candidateData is the name
        candidateName = candidateData;
        candidateDetails = '';
      }
      
      // Add candidate to blockchain with IPFS reference
      console.log(`Adding candidate "${candidateName}" to election ${electionId}...`);
      const result = await blockchainService.addCandidate(
        electionId,
        candidateName,
        candidateDetails
      );
      
      // Refresh elections list
      await fetchElections();
      
      return result;
    } catch (err) {
      console.error('Error adding candidate:', err);
      setError(err.message || 'Failed to add candidate. Please try again.');
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
  
  const addAllowedVoter = async (electionId, voterAddress) => {
    // For now, just log the action since we don't have the actual blockchain implementation
    console.log(`Adding voter ${voterAddress} to election ${electionId}`);
    return true; // Mock success
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
    addAllowedVoter,
    castVote,
    finalizeElection,
    refreshElections: fetchElections
  };
};

export default useElections;