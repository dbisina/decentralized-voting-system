import { useState, useCallback, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import useBlockchain from './useBlockchain';
import useElections from './useElections';

/**
 * Custom hook for voting functionality with personal vote tracking
 */
const useVote = (electionId) => {
  const { account } = useWeb3();
  const { blockchainService, getTransactionReceipt, getExplorerUrl } = useBlockchain();
  const { refreshElections } = useElections();
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [votingStep, setVotingStep] = useState('select'); // 'select', 'confirm', 'processing', 'success'
  const [processing, setProcessing] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  
  // Check if the user has already voted on component mount
  useEffect(() => {
    const checkInitialVoteStatus = async () => {
      if (account && electionId && blockchainService) {
        try {
          const voted = await blockchainService.hasVoted(electionId, account);
          setHasVoted(voted);
        } catch (err) {
          console.warn('Error checking initial vote status:', err);
        }
      }
    };
    
    checkInitialVoteStatus();
  }, [account, electionId, blockchainService]);
  
  /**
   * Select a candidate for voting
   * @param {number} candidateId The ID of the selected candidate
   */
  const selectCandidate = useCallback((candidateId) => {
    setSelectedCandidate(candidateId);
  }, []);
  
  /**
   * Move to next step in the voting process
   */
  const nextStep = useCallback(() => {
    switch (votingStep) {
      case 'select':
        if (selectedCandidate) {
          setVotingStep('confirm');
        }
        break;
      case 'confirm':
        setVotingStep('processing');
        break;
      case 'processing':
        setVotingStep('success');
        break;
      case 'success':
        // Reset
        setVotingStep('select');
        setSelectedCandidate(null);
        setTransaction(null);
        setReceipt(null);
        break;
      default:
        break;
    }
  }, [votingStep, selectedCandidate]);
  
  /**
   * Move to previous step in the voting process
   */
  const prevStep = useCallback(() => {
    switch (votingStep) {
      case 'confirm':
        setVotingStep('select');
        break;
      default:
        break;
    }
  }, [votingStep]);
  
  /**
   * Check if the user has already voted in this election
   */
  const checkVotingStatus = useCallback(async () => {
    try {
      if (!blockchainService || !account || !electionId) {
        return { hasVoted: false };
      }
      
      const hasVotedNow = await blockchainService.hasVoted(electionId, account);
      setHasVoted(hasVotedNow); // Update state with result
      return { hasVoted: hasVotedNow };
    } catch (err) {
      console.error('Error checking voting status:', err);
      return { hasVoted: false, error: err.message };
    }
  }, [blockchainService, account, electionId]);
  
  /**
   * Submit a vote for the selected candidate
   */
  const submitVote = useCallback(async () => {
    if (!blockchainService || !account || !electionId || !selectedCandidate) {
      setError('Missing required data to vote');
      return false;
    }
    
    try {
      setProcessing(true);
      setError(null);
      
      // Check if user has already voted
      const { hasVoted: alreadyVoted } = await checkVotingStatus();
      
      if (alreadyVoted) {
        throw new Error('You have already voted in this election.');
      }
      
      // Cast vote
      const tx = await blockchainService.vote(electionId, selectedCandidate);
      setTransaction(tx);
      
      // Move to processing step if not already there
      if (votingStep !== 'processing') {
        setVotingStep('processing');
      }
      
      // Get receipt after transaction is mined
      const txReceipt = await getTransactionReceipt(tx.transactionHash);
      setReceipt(txReceipt);
      
      // Track this vote in local storage for personal stats
      trackUserVote(electionId, selectedCandidate);
      
      // Refresh elections data
      await refreshElections();
      
      // Update voted state
      setHasVoted(true);
      
      // Move to success step
      setVotingStep('success');
      return true;
    } catch (err) {
      console.error('Error submitting vote:', err);
      setError(err.message || 'Failed to submit vote');
      return false;
    } finally {
      setProcessing(false);
    }
  }, [
    blockchainService, 
    account, 
    electionId, 
    selectedCandidate, 
    checkVotingStatus, 
    getTransactionReceipt,
    refreshElections,
    votingStep
  ]);
  
  /**
   * Track user's vote in local storage for statistics
   */
  const trackUserVote = useCallback((electionId, candidateId) => {
    try {
      if (!account || !electionId) return;
      
      // Get existing vote records
      const userVotes = JSON.parse(localStorage.getItem('user_votes') || '{}');
      
      // Update with this vote
      if (!userVotes[account]) {
        userVotes[account] = {};
      }
      
      userVotes[account][electionId] = {
        candidateId,
        timestamp: new Date().toISOString()
      };
      
      // Save back to localStorage
      localStorage.setItem('user_votes', JSON.stringify(userVotes));
    } catch (err) {
      console.warn('Error tracking user vote:', err);
      // Non-critical function, so don't throw
    }
  }, [account]);
  
  /**
   * Get the explorer link for the transaction
   */
  const getTransactionLink = useCallback(() => {
    if (!transaction?.transactionHash) return '';
    return getExplorerUrl('tx', transaction.transactionHash);
  }, [transaction, getExplorerUrl]);
  
  /**
   * Reset voting state
   */
  const resetVoting = useCallback(() => {
    setSelectedCandidate(null);
    setVotingStep('select');
    setTransaction(null);
    setReceipt(null);
    setError(null);
  }, []);
  
  return {
    selectedCandidate,
    votingStep,
    processing,
    transaction,
    receipt,
    error,
    hasVoted,
    selectCandidate,
    nextStep,
    prevStep,
    checkVotingStatus,
    submitVote,
    getTransactionLink,
    resetVoting
  };
};

export default useVote;