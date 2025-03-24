import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import BlockchainService from '../services/blockchainService';

/**
 * Custom hook for general blockchain interactions
 */
const useBlockchain = () => {
  const { provider, contract, signer, account, networkId } = useWeb3();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [gasPrice, setGasPrice] = useState(null);
  
  // Initialize the blockchain service
  const blockchainService = contract && new BlockchainService(contract, signer);
  
  // Get current gas price
  const fetchGasPrice = useCallback(async () => {
    try {
      if (!provider) return;
      
      const price = await provider.getGasPrice();
      setGasPrice(price.toString());
    } catch (err) {
      console.error('Error fetching gas price:', err);
    }
  }, [provider]);
  
  // Fetch user's transaction history
  const fetchTransactionHistory = useCallback(async () => {
    try {
      if (!provider || !account) return;
      
      setIsLoading(true);
      setError(null);
      
      // Get the transaction count for the account
      const count = await provider.getTransactionCount(account);
      
      // For simplicity, we'll just get the last 10 transactions
      // In a real app, you might want to use an indexer or API for this
      const history = [];
      
      for (let i = Math.max(0, count - 10); i < count; i++) {
        try {
          // This is a simplistic approach - in a real app, you'd use an indexer
          const tx = await provider.getTransaction(account, i);
          if (tx) {
            history.push(tx);
          }
        } catch (txError) {
          console.warn(`Couldn't fetch transaction at index ${i}:`, txError);
        }
      }
      
      setTransactionHistory(history);
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      setError('Failed to fetch transaction history');
    } finally {
      setIsLoading(false);
    }
  }, [provider, account]);
  
  // Get transaction receipt
  const getTransactionReceipt = useCallback(async (txHash) => {
    try {
      if (!provider) {
        throw new Error('Provider not available');
      }
      
      setIsLoading(true);
      setError(null);
      
      const receipt = await provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (err) {
      console.error('Error getting transaction receipt:', err);
      setError('Failed to get transaction receipt');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [provider]);
  
  // Check if a transaction is confirmed
  const isTransactionConfirmed = useCallback(async (txHash, confirmations = 1) => {
    try {
      if (!provider) {
        throw new Error('Provider not available');
      }
      
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return false; // Transaction not mined yet
      }
      
      const currentBlock = await provider.getBlockNumber();
      const txBlock = receipt.blockNumber;
      
      return currentBlock - txBlock >= confirmations;
    } catch (err) {
      console.error('Error checking transaction confirmation:', err);
      return false;
    }
  }, [provider]);
  
  // Format wallet address for display
  const formatAddress = useCallback((address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }, []);
  
  // Format wei to ETH/MATIC
  const formatEther = useCallback((wei) => {
    if (!wei) return '0';
    const ethers = parseFloat(wei) / 1e18;
    return ethers.toFixed(6);
  }, []);
  
  // Get network currency symbol
  const getNetworkCurrency = useCallback(() => {
    if (!networkId) return 'ETH';
    
    switch (networkId) {
      case 1: // Ethereum Mainnet
      case 5: // Goerli Testnet
        return 'ETH';
      case 137: // Polygon Mainnet
      case 80001: // Mumbai Testnet
        return 'MATIC';
      default:
        return 'ETH';
    }
  }, [networkId]);
  
  // Get explorer URL for the current network
  const getExplorerUrl = useCallback((type, hash) => {
    if (!networkId || !hash) return '';
    
    let baseUrl;
    switch (networkId) {
      case 1: // Ethereum Mainnet
        baseUrl = 'https://etherscan.io';
        break;
      case 5: // Goerli Testnet
        baseUrl = 'https://goerli.etherscan.io';
        break;
      case 137: // Polygon Mainnet
        baseUrl = 'https://polygonscan.com';
        break;
      case 80001: // Mumbai Testnet
        baseUrl = 'https://mumbai.polygonscan.com';
        break;
      default:
        return ''; // Local networks don't have explorers
    }
    
    switch (type) {
      case 'tx':
        return `${baseUrl}/tx/${hash}`;
      case 'address':
        return `${baseUrl}/address/${hash}`;
      case 'block':
        return `${baseUrl}/block/${hash}`;
      case 'token':
        return `${baseUrl}/token/${hash}`;
      default:
        return '';
    }
  }, [networkId]);
  
  // Fetch initial data
  useEffect(() => {
    if (provider) {
      fetchGasPrice();
      
      // Refresh gas price every minute
      const interval = setInterval(fetchGasPrice, 60000);
      return () => clearInterval(interval);
    }
  }, [provider, fetchGasPrice]);
  
  // Fetch transaction history when account changes
  useEffect(() => {
    if (provider && account) {
      fetchTransactionHistory();
    }
  }, [provider, account, fetchTransactionHistory]);
  
  return {
    isLoading,
    error,
    transactionHistory,
    gasPrice,
    blockchainService,
    fetchTransactionHistory,
    getTransactionReceipt,
    isTransactionConfirmed,
    formatAddress,
    formatEther,
    getNetworkCurrency,
    getExplorerUrl
  };
};

export default useBlockchain;