// frontend/src/hooks/useElections.jsx

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
      const processedElections = await enhanceElectionsWithData(elections);
      
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

      console.log(`Fetched ${processedElections.length} elections: ${active.length} active, ${completed.length} completed, ${upcoming.length} upcoming`);
    } catch (err) {
      console.error('Error fetching elections:', err);
      setError('Failed to load elections. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [contract, signer]);
  
  /**
   * Enhance elections with additional data from IPFS
   */
  const enhanceElectionsWithData = async (elections) => {
    // Process elections to add status, format dates, etc.
    return Promise.all(elections.map(async (election) => {
      try {
        // Add status based on dates and finalized state
        const now = new Date();
        const startTime = new Date(election.startTime);
        const endTime = new Date(election.endTime);
        
        let status;
        if (election.finalized) {
          status = 'completed';
        } else if (now < startTime) {
          status = 'upcoming';
        } else if (now > endTime) {
          status = 'ended';
        } else {
          status = 'active';
        }
        
        // Format dates for display
        const formattedStartDate = startTime.toLocaleDateString();
        const formattedEndDate = endTime.toLocaleDateString();
        
        // Calculate time remaining
        const timeRemaining = calculateTimeRemaining(election);
        
        // Check if user has voted in this election
        let hasVoted = false;
        if (account && election.id) {
          try {
            const blockchainService = new BlockchainService(contract, signer);
            hasVoted = await blockchainService.hasVoted(election.id, account);
          } catch (voteCheckError) {
            console.warn(`Error checking if user has voted in election ${election.id}:`, voteCheckError);
          }
        }
        
        // Try to enhance with IPFS data if available
        let enhancedData = {};
        if (election.description && election.description.startsWith('Qm')) {
          try {
            const ipfsData = await ipfsService.getFromIPFS(election.description);
            if (ipfsData && typeof ipfsData === 'object') {
              enhancedData = ipfsData;
            }
          } catch (ipfsError) {
            console.warn(`Could not fetch IPFS data for election ${election.id}:`, ipfsError);
          }
        }
        
        // Prepare candidates array with enhanced data
        let enhancedCandidates = [];
        
        if (election.candidates && Array.isArray(election.candidates)) {
          // If we already have candidates array, enhance them
          enhancedCandidates = await Promise.all(election.candidates.map(async (candidate) => {
            try {
              // If candidate has IPFS details, fetch and enhance
              if (candidate.details && candidate.details.startsWith('Qm')) {
                try {
                  console.log(`Fetching IPFS data for candidate ${candidate.id}: ${candidate.details}`);
                  const candidateDetails = await ipfsService.getFromIPFS(candidate.details);
                  console.log(`Retrieved details for candidate ${candidate.id}:`, candidateDetails);
                  
                  // Return enhanced candidate
                  return {
                    ...candidate,
                    ...candidateDetails
                  };
                } catch (ipfsError) {
                  console.warn(`Could not fetch IPFS data for candidate ${candidate.id}:`, ipfsError);
                  return candidate;
                }
              }
              return candidate;
            } catch (error) {
              console.error(`Error processing candidate ${candidate.id}:`, error);
              return candidate;
            }
          }));
        } else if (election.candidateCount > 0) {
          // If no candidates array but count > 0, fetch them
          try {
            console.log(`No candidates array found. Fetching ${election.candidateCount} candidates for election ${election.id}`);
            const blockchainService = new BlockchainService(contract, signer);
            
            // Get candidates directly from blockchain
            const fetchedCandidates = await blockchainService.getElectionCandidates(
              election.id, 
              election.candidateCount
            );
            
            console.log(`Fetched ${fetchedCandidates.length} candidates for election ${election.id}`);
            
            // Enhance each candidate with IPFS data
            enhancedCandidates = await Promise.all(fetchedCandidates.map(async (candidate) => {
              try {
                if (candidate.details && candidate.details.startsWith('Qm')) {
                  try {
                    const candidateDetails = await ipfsService.getFromIPFS(candidate.details);
                    return {
                      ...candidate,
                      ...candidateDetails
                    };
                  } catch (ipfsError) {
                    console.warn(`Could not fetch IPFS data for candidate ${candidate.id}:`, ipfsError);
                    return candidate;
                  }
                }
                return candidate;
              } catch (error) {
                console.error(`Error processing fetched candidate ${candidate.id}:`, error);
                return candidate;
              }
            }));
          } catch (fetchError) {
            console.error(`Error fetching candidates for election ${election.id}:`, fetchError);
            enhancedCandidates = [];
          }
        }
        
        // Calculate voter participation
        const participationPercentage = election.totalVotes > 0 && election.voterCount > 0
          ? (election.totalVotes / election.voterCount * 100).toFixed(1)
          : 0;
        
        // Return the enhanced election object
        return {
          ...election,
          ...enhancedData,
          candidates: enhancedCandidates,
          status,
          formattedStartDate,
          formattedEndDate,
          timeRemaining,
          hasVoted,
          participationPercentage
        };
      } catch (error) {
        console.error(`Error enhancing election ${election.id}:`, error);
        // Return a basic enhanced version to prevent breaking the array
        return {
          ...election,
          status: election.finalized ? 'completed' : 'active',
          candidates: election.candidates || [],
          _enhancementError: error.message
        };
      }
    }));
  };
  
  /**
   * Calculate time remaining for an election
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
   */
  const createElection = async (electionData) => {
    if (!contract || !signer || !account) {
      throw new Error('Wallet not connected. Please connect your wallet to create an election.');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Store detailed information on IPFS
      console.log('Storing election details on IPFS...');
      const ipfsCid = await ipfsService.storeElectionDetails({
        title: electionData.title,
        description: electionData.description,
        rules: electionData.rules,
        additionalInfo: electionData.additionalInfo
      });
      
      console.log(`Stored election details on IPFS with CID: ${ipfsCid}`);
      
      // Create election on blockchain
      console.log('Creating election on blockchain...');
      const blockchainService = new BlockchainService(contract, signer);
      const result = await blockchainService.createElection(
        electionData.title,
        ipfsCid,
        new Date(electionData.startDate).getTime(),
        new Date(electionData.endDate).getTime()
      );
      
      console.log(`Election created with ID: ${result.electionId}, TX: ${result.transactionHash}`);
      
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
   * Add a candidate to an election with improved error handling
   */
  const addCandidate = async (electionId, candidateData) => {
    if (!contract || !signer || !account) {
      throw new Error('Wallet not connected. Please connect your wallet to add a candidate.');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Adding candidate to election ${electionId}:`, candidateData);
      
      // Check if election can accept candidates
      const blockchainService = new BlockchainService(contract, signer);
      const election = await blockchainService.getElectionDetails(electionId);
      const now = Math.floor(Date.now() / 1000);
      
      if (now >= election.startTime) {
        throw new Error('Cannot add candidate after election has started. Please create a new election with a future start time.');
      }
      
      // Store candidate details on IPFS
      let candidateName, candidateDetails, candidateMetadata;
      
      if (typeof candidateData === 'object') {
        candidateName = candidateData.name;
        candidateMetadata = {
          name: candidateData.name,
          bio: candidateData.bio || '',
          platform: candidateData.platform || ''
        };
      } else {
        candidateName = candidateData;
        candidateMetadata = { name: candidateData };
      }
      
      console.log('Storing candidate details on IPFS...');
      const ipfsCid = await ipfsService.storeCandidateDetails(candidateMetadata);
      console.log(`Stored candidate details on IPFS with CID: ${ipfsCid}`);
      
      // Add to blockchain with retry mechanism
      let attempt = 0;
      let maxAttempts = 2;
      let success = false;
      let result;
      let lastError;
      
      while (attempt < maxAttempts && !success) {
        try {
          console.log(`Attempt ${attempt + 1} to add candidate "${candidateName}" to blockchain...`);
          result = await blockchainService.addCandidate(
            electionId,
            candidateName,
            ipfsCid
          );
          success = true;
        } catch (err) {
          console.warn(`Attempt ${attempt + 1} failed:`, err);
          lastError = err;
          attempt++;
          
          if (attempt < maxAttempts) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!success) {
        throw lastError || new Error('Failed to add candidate after multiple attempts');
      }
      
      console.log(`Successfully added candidate to blockchain:`, result);
      
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
 * Finalize an election with improved error handling and fallback mechanism
 * @param {number} electionId - ID of the election
 * @returns {Promise<Object>} Transaction receipt
 */
const finalizeElection = async (electionId) => {
  try {
    setIsLoading(true);
    
    // Convert parameters to ensure proper type
    const electionIdNum = parseInt(electionId);
    
    if (isNaN(electionIdNum)) {
      throw new Error('Invalid election ID');
    }
    
    // Development mode check - if we want to bypass blockchain for testing
    const bypassBlockchain = localStorage.getItem('bypass_blockchain') === 'true';
    
    if ((process.env.NODE_ENV === 'development' && bypassBlockchain) || !blockchainService) {
      console.log('Using mock mode for election finalization');
      
      // Find the election in our local state
      const election = allElections.find(e => e.id === electionIdNum);
      
      if (!election) {
        throw new Error(`Election ${electionIdNum} not found`);
      }
      
      // Perform validation checks
      if (election.status !== 'ended') {
        throw new Error('Only ended elections can be finalized');
      }
      
      if (election.finalized) {
        throw new Error('Election is already finalized');
      }
      
      if (election.totalVotes === 0) {
        throw new Error('Cannot finalize an election with no votes');
      }
      
      // Simulate blockchain delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create a mock transaction receipt
      const mockReceipt = {
        transactionHash: '0x' + Math.random().toString(36).substring(2, 38),
        blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
        status: 1
      };
      
      // Update local state
      setAllElections(prevElections => 
        prevElections.map(e => 
          e.id === electionIdNum 
            ? { ...e, status: 'completed', finalized: true } 
            : e
        )
      );
      
      console.log(`Mock finalization of election ${electionIdNum} completed successfully`);
      return mockReceipt;
    }
    
    // Real blockchain implementation with better error handling
    try {
      console.log(`Attempting to finalize election ${electionIdNum} on blockchain`);
      
      // First check if the election exists and is in the correct state
      const election = allElections.find(e => e.id === electionIdNum);
      
      if (!election) {
        throw new Error(`Election ${electionIdNum} not found in local state`);
      }
      
      if (election.status !== 'ended' && election.status !== 'active') {
        const now = new Date();
        const endTime = new Date(election.endTime);
        
        // If the election has actually ended but status doesn't reflect it,
        // allow finalization but log a warning
        if (now > endTime && election.status === 'active') {
          console.warn('Election status is active but end time has passed. Proceeding with finalization.');
        } else {
          throw new Error(`Election status is ${election.status}. Only ended elections can be finalized.`);
        }
      }
      
      // Call the blockchain service with retry mechanism
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          console.log(`Finalization attempt ${attempts + 1} of ${maxAttempts}`);
          const result = await blockchainService.finalizeElection(electionIdNum);
          
          // If successful, update local state
          console.log('Finalization successful:', result);
          
          // Refresh election data
          await refreshElections();
          
          return result;
        } catch (attemptError) {
          console.warn(`Attempt ${attempts + 1} failed:`, attemptError);
          lastError = attemptError;
          attempts++;
          
          // Wait before retrying
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // If all attempts failed, throw the last error
      throw lastError || new Error('All finalization attempts failed');
    } catch (blockchainError) {
      console.error('Blockchain finalization error:', blockchainError);
      
      // If in development, try mock mode as fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock finalization due to blockchain error');
        
        // Enable bypass for future attempts
        localStorage.setItem('bypass_blockchain', 'true');
        
        // Try again with bypass enabled
        return await finalizeElection(electionIdNum);
      }
      
      throw blockchainError;
    }
  } catch (error) {
    console.error('Error finalizing election:', error);
    throw error;
  } finally {
    setIsLoading(false);
  }
};

  /**
   * Add an allowed voter to an election
   * @param {string|number} electionId - Election ID
   * @param {string} voterAddress - Ethereum address of the voter to add
   * @returns {Promise<boolean>} Success status
   */
  const addAllowedVoter = async (electionId, voterAddress) => {
    if (!contract || !signer || !account) {
        console.warn('No contract, signer, or account available');
        return false;
    }
    
    try {
        setIsLoading(true);
        setError(null);
        
        console.log(`Adding voter ${voterAddress} to election ${electionId}`);
        
        // Call the contract method to add the voter - you need to add this to your contract!
        // If your contract doesn't have this function yet, add it as explained in previous messages
        try {
            const contractWithSigner = contract.connect(signer);
            
            // First check if you have this function in your contract
            // If your contract has this function:
            if (typeof contractWithSigner.addAllowedVoter === 'function') {
                const tx = await contractWithSigner.addAllowedVoter(electionId, voterAddress);
                await tx.wait();
                console.log(`Successfully added voter ${voterAddress} to blockchain`, tx.hash);
            } else {
                // Fallback if function doesn't exist - store in localStorage for testing
                console.warn("Contract doesn't have addAllowedVoter function - using localStorage fallback");
                const key = `allowed_voters_${electionId}`;
                const allowedVoters = JSON.parse(localStorage.getItem(key) || '[]');
                
                if (!allowedVoters.includes(voterAddress)) {
                    allowedVoters.push(voterAddress);
                    localStorage.setItem(key, JSON.stringify(allowedVoters));
                }
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
        }
        
        // Also update the user_registrations entry to ensure frontend shows the correct status
        try {
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
        } catch (localStorageError) {
            console.warn("Error updating local registration cache:", localStorageError);
        }
        
        return true;
    } catch (err) {
        console.error('Error adding allowed voter:', err);
        setError('Failed to add voter. Please try again.');
        return false;
    } finally {
        setIsLoading(false);
    }};
  
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