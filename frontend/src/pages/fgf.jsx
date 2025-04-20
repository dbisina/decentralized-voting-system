import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

/**
 * Contract testing utility component
 * Allows direct interaction with the smart contract
 */
const ContractTester = ({ contractAddress }) => {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [electionId, setElectionId] = useState('');
  const [voterAddress, setVoterAddress] = useState('');
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Connect to contract on mount
  useEffect(() => {
    connectToContract();
  }, [contractAddress]);
  
  // Minimal ABI for testing voter registration functions
  const minimalABI = [
    "function getVoterStatus(uint256 _electionId, address _voter) view returns (uint8)",
    "function isVoterAllowed(uint256 _electionId, address _voter) view returns (bool)",
    "function approveVoter(uint256 _electionId, address _voter)",
    "function addAllowedVoter(uint256 _electionId, address _voter)",
    "function rejectVoter(uint256 _electionId, address _voter)"
  ];
  
  // Connect to the contract
  const connectToContract = async () => {
    try {
      if (!window.ethereum) {
        addLog('Error', 'MetaMask not found! Please install MetaMask.');
        return;
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      // Create provider
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(ethersProvider);
      
      // Connect to contract
      const addr = contractAddress || process.env.REACT_APP_CONTRACT_ADDRESS;
      const contractInstance = new ethers.Contract(addr, minimalABI, ethersProvider.getSigner());
      setContract(contractInstance);
      
      setIsConnected(true);
      addLog('Success', `Connected to contract at ${addr}`);
      
    } catch (error) {
      addLog('Error', `Failed to connect: ${error.message}`);
      setIsConnected(false);
    }
  };
  
  // Check voter status
  const checkVoterStatus = async () => {
    if (!contract || !electionId || !voterAddress) {
      addLog('Warning', 'Please enter valid election ID and voter address');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // First check if voter is allowed
      try {
        const isAllowed = await contract.isVoterAllowed(electionId, voterAddress);
        addLog('Info', `Is Voter Allowed: ${isAllowed ? 'YES' : 'NO'}`);
      } catch (error) {
        addLog('Warning', `Could not check isVoterAllowed: ${error.message}`);
      }
      
      // Then check numeric status
      try {
        const statusCode = await contract.getVoterStatus(electionId, voterAddress);
        const statusMap = ['None', 'Pending', 'Approved', 'Rejected'];
        const status = statusMap[statusCode] || `Unknown (${statusCode})`;
        addLog('Success', `Voter Status: ${status}`);
      } catch (error) {
        addLog('Warning', `Could not check getVoterStatus: ${error.message}`);
      }
      
    } catch (error) {
      addLog('Error', `Error checking voter status: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Approve voter
  const approveVoter = async () => {
    if (!contract || !electionId || !voterAddress) {
      addLog('Warning', 'Please enter valid election ID and voter address');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Try approveVoter, fall back to addAllowedVoter
      try {
        const tx = await contract.approveVoter(electionId, voterAddress, { gasLimit: 200000 });
        addLog('Info', `Transaction sent: ${tx.hash}`);
        
        const receipt = await tx.wait();
        addLog('Success', `Voter approved. Transaction: ${receipt.transactionHash}`);
      } catch (approveError) {
        addLog('Warning', `approveVoter failed: ${approveError.message}`);
        
        // Try addAllowedVoter instead
        try {
          addLog('Info', 'Trying addAllowedVoter instead...');
          const tx = await contract.addAllowedVoter(electionId, voterAddress, { gasLimit: 200000 });
          addLog('Info', `Transaction sent: ${tx.hash}`);
          
          const receipt = await tx.wait();
          addLog('Success', `Voter added to allowed list. Transaction: ${receipt.transactionHash}`);
        } catch (addError) {
          addLog('Error', `addAllowedVoter also failed: ${addError.message}`);
        }
      }
      
      // Verify status after approval
      setTimeout(checkVoterStatus, 2000);
      
    } catch (error) {
      addLog('Error', `Error approving voter: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Reject voter
  const rejectVoter = async () => {
    if (!contract || !electionId || !voterAddress) {
      addLog('Warning', 'Please enter valid election ID and voter address');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const tx = await contract.rejectVoter(electionId, voterAddress, { gasLimit: 200000 });
      addLog('Info', `Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      addLog('Success', `Voter rejected. Transaction: ${receipt.transactionHash}`);
      
      // Verify status after rejection
      setTimeout(checkVoterStatus, 2000);
      
    } catch (error) {
      addLog('Error', `Error rejecting voter: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Add a log message
  const addLog = (type, message) => {
    const log = {
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setLogs(prevLogs => [log, ...prevLogs]);
  };
  
  // Get log class based on type
  const getLogClass = (type) => {
    switch (type) {
      case 'Error':
        return 'text-red-600';
      case 'Warning':
        return 'text-orange-600';
      case 'Success':
        return 'text-green-600';
      case 'Info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Contract Testing Utility</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Connection</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Address</label>
            <input
              type="text"
              value={contractAddress || ''}
              readOnly
              className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Connected Account</label>
            <input
              type="text"
              value={account}
              readOnly
              className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
            />
          </div>
          
          <button
            onClick={connectToContract}
            disabled={isProcessing}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            {isConnected ? 'Reconnect' : 'Connect to Contract'}
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Voter Management</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Election ID</label>
            <input
              type="number"
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Enter election ID"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Voter Address</label>
            <input
              type="text"
              value={voterAddress}
              onChange={(e) => setVoterAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
              placeholder="0x..."
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={checkVoterStatus}
              disabled={isProcessing || !isConnected}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex-1"
            >
              Check Status
            </button>
            <button
              onClick={approveVoter}
              disabled={isProcessing || !isConnected}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex-1"
            >
              Approve Voter
            </button>
            <button
              onClick={rejectVoter}
              disabled={isProcessing || !isConnected}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition flex-1"
            >
              Reject Voter
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Logs</h2>
        
        <div className="h-64 overflow-y-auto border border-gray-200 rounded p-4">
          {logs.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No logs yet. Take some actions to see results here.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`mb-2 ${getLogClass(log.type)}`}>
                <span className="text-xs text-gray-500">[{log.timestamp}]</span>
                <span className="font-bold"> {log.type}: </span>
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractTester;