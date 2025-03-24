import { useState, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import useBlockchain from './useBlockchain';
import useElections from './useElections';

/**
 * Custom hook for voting functionality
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
      
      const hasVoted = await blockchainService.hasVoted(electionId, account);
      return { hasVoted };
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
      const { hasVoted } = await checkVotingStatus();
      
      if (hasVoted) {
        setError('You have already voted in this election');
        return false;
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
      
      // Refresh elections data
      await refreshElections();
      
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