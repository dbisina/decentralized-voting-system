import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const blockchainService = useMemo(() => {
    if (contract && signer) {
      return new BlockchainService(contract, signer);
    } else if (signer) {
      console.warn('No contract available, using mock mode');
      return new BlockchainService(null, signer);
    }
    return null;
  }, [contract, signer]);
  
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
      // But we'll use a different approach than directly accessing by index
      const history = [];
      
      // Instead of trying to get transactions by index, 
      // we'll query recent blocks to find transactions for this account
      const currentBlock = await provider.getBlockNumber();
      const blocksToCheck = 1000; // Look back this many blocks
      
      // Check the last few blocks for transactions from this account
      for (let i = 0; i < blocksToCheck && history.length < 10; i++) {
        try {
          const blockNumber = currentBlock - i;
          const block = await provider.getBlock(blockNumber, true);
          
          if (block && block.transactions) {
            // Filter transactions involving our account
            const accountTxs = block.transactions.filter(tx => 
              tx.from && tx.from.toLowerCase() === account.toLowerCase() ||
              tx.to && tx.to.toLowerCase() === account.toLowerCase()
            );
            
            // Add to history
            accountTxs.forEach(tx => {
              history.push({
                hash: tx.hash,
                blockNumber: tx.blockNumber,
                timestamp: block.timestamp * 1000, // Convert to milliseconds
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                type: tx.from.toLowerCase() === account.toLowerCase() ? 'Sent' : 'Received'
              });
            });
          }
          
          // Stop if we have enough transactions
          if (history.length >= 10) break;
        } catch (blockError) {
          console.warn(`Couldn't fetch block ${currentBlock - i}:`, blockError);
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
        // Use mock receipt if provider not available
        console.warn('No provider available for getTransactionReceipt, using mock receipt');
        return {
          transactionHash: txHash,
          blockNumber: 12345678,
          status: 1,
          confirmations: 10
        };
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
        // Assume confirmed if no provider
        return true;
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
  const formatAddress = useCallback((address, prefixLength = 6, suffixLength = 4) => {
    if (!address) return '';
    if (address.length <= prefixLength + suffixLength) return address;
    return `${address.substring(0, prefixLength)}...${address.substring(address.length - suffixLength)}`;
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
        // For local networks or if network is unknown, return a mock URL
        return `https://example.com/explorer/${type}/${hash}`;
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
    } else {
      // Set mock gas price if provider not available
      setGasPrice('10000000000'); // 10 Gwei
    }
  }, [provider, fetchGasPrice]);
  
  // Fetch transaction history when account changes
  useEffect(() => {
    if (account) {
      fetchTransactionHistory();
    }
  }, [account, fetchTransactionHistory]);
  
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