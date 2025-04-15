import React, { useState } from 'react';
import { ethers } from 'ethers';

const CandidateDebugger = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [electionId, setElectionId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateDetails, setCandidateDetails] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Display a log message with timestamp
  const log = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => [
      { message, timestamp, type },
      ...prev
    ]);
  };

  // Connect to the contract using ethers
  const getContract = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found! Please install MetaMask.");
      }
      
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Very simple ABI with just the functions we need
      const abi = [
        "function addCandidate(uint256 _electionId, string _name, string _details) returns (uint256)",
        "function getCandidate(uint256 _electionId, uint256 _candidateId) view returns (uint256 id, string name, string details, uint256 voteCount)",
        "function getElectionDetails(uint256 _electionId) view returns (uint256 id, string title, string description, uint256 startTime, uint256 endTime, bool finalized, address admin, uint256 candidateCount, uint256 totalVotes)"
      ];
      
      return new ethers.Contract(contractAddress, abi, signer);
    } catch (error) {
      log(`Error connecting: ${error.message}`, 'error');
      throw error;
    }
  };

  // Check election details to see if candidate addition is allowed
  const checkElection = async () => {
    setLoading(true);
    try {
      const contract = await getContract();
      log(`Connected to contract at ${contractAddress}`);
      
      const election = await contract.getElectionDetails(electionId);
      
      log(`Found election #${election.id}: ${election.title}`);
      log(`Start time: ${new Date(election.startTime.toNumber() * 1000).toLocaleString()}`);
      log(`End time: ${new Date(election.endTime.toNumber() * 1000).toLocaleString()}`);
      log(`Admin: ${election.admin}`);
      log(`Candidate count: ${election.candidateCount.toNumber()}`);

      // Get the current user address
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      
      log(`Your address: ${userAddress}`);

      // Check if user is admin
      if (election.admin.toLowerCase() !== userAddress.toLowerCase()) {
        log(`You are NOT the election admin. Only the admin can add candidates.`, 'warning');
      } else {
        log(`You are the election admin. You can add candidates.`, 'success');
      }

      // Check if election has started
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime >= election.startTime.toNumber()) {
        log(`⚠️ Election has already started! You cannot add candidates.`, 'error');
        log(`Contract requires: block.timestamp < election.startTime`, 'error');
      } else {
        const timeUntilStart = (election.startTime.toNumber() - currentTime) / 60;
        log(`Election starts in ${timeUntilStart.toFixed(1)} minutes.`, 'success');
      }

    } catch (error) {
      log(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add a candidate to the election
  const addCandidate = async () => {
    setLoading(true);
    try {
      const contract = await getContract();
      log(`Connected to contract at ${contractAddress}`);
      
      log(`Adding candidate "${candidateName}" to election #${electionId}...`);
      
      // First check if election exists and can accept candidates
      await checkElection();
      
      // Send the transaction to add the candidate
      const tx = await contract.addCandidate(electionId, candidateName, candidateDetails);
      log(`Transaction sent: ${tx.hash}`);
      
      // Wait for transaction to be mined
      log(`Waiting for transaction to be mined...`);
      const receipt = await tx.wait();
      
      // Check if transaction was successful
      if (receipt.status === 1) {
        log(`✅ Candidate added successfully!`, 'success');
        
        // Try to find event in multiple ways
        let newCandidateId = null;
        
        // Standard event format
        const event = receipt.events?.find(e => e.event === 'CandidateAdded');
        if (event && event.args) {
          newCandidateId = event.args.candidateId.toNumber();
        } 
        // Alternative: check logs and try to determine candidate ID
        else if (receipt.logs && receipt.logs.length > 0) {
          try {
            // Get updated election details
            const updatedElection = await contract.getElectionDetails(electionId);
            newCandidateId = updatedElection.candidateCount.toNumber();
            log(`Likely Candidate ID: ${newCandidateId} (based on updated candidate count)`, 'success');
          } catch (detailsError) {
            log(`Could not determine candidate ID: ${detailsError.message}`, 'warning');
          }
        } else {
          log(`Could not find CandidateAdded event in transaction logs`, 'warning');
        }
        
        if (newCandidateId !== null) {
          log(`Candidate ID: ${newCandidateId}`, 'success');
          
          // Let's try to immediately verify the candidate exists
          try {
            const candidate = await contract.getCandidate(electionId, newCandidateId);
            log(`✓ Verified: Candidate "${candidate.name}" exists at ID ${newCandidateId}`, 'success');
          } catch (verifyError) {
            log(`Could not verify candidate: ${verifyError.message}`, 'warning');
          }
        }
      } else {
        log(`❌ Transaction failed`, 'error');
      }
    } catch (error) {
      log(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get candidate details
  const getCandidate = async () => {
    setLoading(true);
    try {
      const contract = await getContract();
      log(`Connected to contract at ${contractAddress}`);
      
      log(`Getting candidate #${candidateId} from election #${electionId}...`);
      
      // Call the getCandidate function
      const candidate = await contract.getCandidate(electionId, candidateId);
      
      log(`✅ Found candidate:`, 'success');
      log(`ID: ${candidate.id.toNumber()}`);
      log(`Name: ${candidate.name}`);
      log(`Details: ${candidate.details}`);
      log(`Vote Count: ${candidate.voteCount.toNumber()}`);
    } catch (error) {
      log(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Candidate Debugger</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-3">Contract Connection</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Contract Address"
            className="flex-1 border p-2 rounded"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-3">Check Election Eligibility</h2>
          <div className="mb-4">
            <input
              type="number"
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              placeholder="Election ID"
              className="w-full border p-2 rounded mb-2"
            />
            <button
              onClick={checkElection}
              disabled={loading || !contractAddress || !electionId}
              className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking...' : 'Check Election'}
            </button>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-3">Add Candidate</h2>
          <div className="mb-4">
            <input
              type="number"
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              placeholder="Election ID"
              className="w-full border p-2 rounded mb-2"
            />
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Candidate Name"
              className="w-full border p-2 rounded mb-2"
            />
            <input
              type="text"
              value={candidateDetails}
              onChange={(e) => setCandidateDetails(e.target.value)}
              placeholder="Candidate Details (optional)"
              className="w-full border p-2 rounded mb-2"
            />
            <button
              onClick={addCandidate}
              disabled={loading || !contractAddress || !electionId || !candidateName}
              className="w-full bg-green-500 text-white p-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Candidate'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-3">Get Candidate</h2>
        <div className="flex gap-2">
          <input
            type="number"
            value={electionId}
            onChange={(e) => setElectionId(e.target.value)}
            placeholder="Election ID"
            className="flex-1 border p-2 rounded"
          />
          <input
            type="number"
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            placeholder="Candidate ID"
            className="flex-1 border p-2 rounded"
          />
          <button
            onClick={getCandidate}
            disabled={loading || !contractAddress || !electionId || !candidateId}
            className="bg-indigo-500 text-white px-4 py-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Get Candidate'}
          </button>
        </div>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-3">Results Log</h2>
        <div className="h-64 overflow-y-auto border border-gray-300 rounded bg-white p-4">
          {results.map((item, index) => (
            <div 
              key={index} 
              className={`mb-2 pb-2 border-b border-gray-100 ${
                item.type === 'error' ? 'text-red-600' : 
                item.type === 'warning' ? 'text-orange-600' : 
                item.type === 'success' ? 'text-green-600' : 'text-gray-800'
              }`}
            >
              <div className="text-xs text-gray-500">{item.timestamp}</div>
              <div>{item.message}</div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-gray-500 italic">No results yet. Try one of the actions above.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateDebugger;