import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import VotingSystemABI from '../contracts/DecentralizedVotingSystem.json';

// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
  1337: '0x5efdf210a1554a5d6b0c98c41513e951c7c4dbac' // Local development
};

// The default network ID for development
const DEFAULT_NETWORK_ID = 1337; 

// Create a context
const Web3Context = createContext();

export function useWeb3() {
  return useContext(Web3Context);
}

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [networkId, setNetworkId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize web3 connection
  const initializeWeb3 = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if MetaMask is installed
      if (window.ethereum) {
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(ethersProvider);

        // Get network information
        const network = await ethersProvider.getNetwork();
        setNetworkId(network.chainId);

        // Get contract instance
        const contractAddress = CONTRACT_ADDRESSES[network.chainId] || CONTRACT_ADDRESSES[DEFAULT_NETWORK_ID];
        if (!contractAddress) {
          throw new Error('This network is not supported');
        }

        const votingSystemContract = new ethers.Contract(
          contractAddress,
          VotingSystemABI.abi,
          ethersProvider
        );
        setContract(votingSystemContract);

        // Check if user has already connected accounts
        const accounts = await ethersProvider.listAccounts();
        if (accounts.length > 0) {
          const ethersSigner = ethersProvider.getSigner();
          setSigner(ethersSigner);
          setAccount(accounts[0]);
        }
      } else {
        throw new Error('MetaMask is not installed. Please install MetaMask to use this application.');
      }
    } catch (err) {
      console.error('Error initializing web3:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (window.ethereum) {
        // Request account access
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });

        if (accounts.length > 0) {
          const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
          const ethersSigner = ethersProvider.getSigner();
          
          setSigner(ethersSigner);
          setAccount(accounts[0]);
          
          return accounts[0];
        }
      } else {
        throw new Error('MetaMask is not installed');
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setSigner(null);
    setAccount(null);
  }, []);

  // Listen for account and network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
          const ethersSigner = ethersProvider.getSigner();
          
          setSigner(ethersSigner);
          setAccount(accounts[0]);
        } else {
          disconnectWallet();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Initialize connection
      initializeWeb3();

      // Cleanup
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [disconnectWallet, initializeWeb3]);

  // Switch network
  const switchNetwork = useCallback(async (chainId) => {
    try {
      if (!window.ethereum) throw new Error("No crypto wallet found");
      
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ethers.utils.hexlify(chainId) }]
      });
      
      // Reload the page to get the new network
      window.location.reload();
    } catch (err) {
      // This error code indicates that the chain has not been added to MetaMask
      if (err.code === 4902) {
        try {
          let networkData;
          
          if (chainId === 80001) {
            networkData = {
              chainId: ethers.utils.hexlify(80001),
              chainName: "Mumbai Testnet",
              nativeCurrency: {
                name: "MATIC",
                symbol: "MATIC",
                decimals: 18
              },
              rpcUrls: ["https://rpc-mumbai.maticvigil.com/"],
              blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
            };
          } else if (chainId === 5) {
            networkData = {
              chainId: ethers.utils.hexlify(5),
              chainName: "Goerli Testnet",
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18
              },
              rpcUrls: ["https://goerli.infura.io/v3/"],
              blockExplorerUrls: ["https://goerli.etherscan.io/"]
            };
          }
          
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [networkData]
          });
          
          // Reload the page to get the new network
          window.location.reload();
        } catch (addError) {
          console.error('Error adding network:', addError);
          setError(addError.message);
        }
      } else {
        console.error('Error switching network:', err);
        setError(err.message);
      }
    }
  }, []);

  // Memoize value to be provided to consumers
  const value = useMemo(() => ({
    provider,
    signer,
    contract,
    account,
    networkId,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    supportedNetworks: Object.keys(CONTRACT_ADDRESSES).map(Number)
  }), [
    provider, 
    signer, 
    contract, 
    account, 
    networkId, 
    isLoading, 
    error, 
    connectWallet, 
    disconnectWallet, 
    switchNetwork
  ]);

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}