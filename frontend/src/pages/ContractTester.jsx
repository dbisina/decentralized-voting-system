import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// This component directly tests your contract based on the code you shared
const ContractTester = () => {
  const [address, setAddress] = useState('');
  const [contract, setContract] = useState(null);
  const [electionCount, setElectionCount] = useState(0);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Form states for creating elections
  const [newElection, setNewElection] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: ''
  });
  
  // Form states for adding candidates
  const [newCandidate, setNewCandidate] = useState({
    electionId: '',
    name: '',
    details: ''
  });

  // ABI for your contract (simplified for the most important functions)
  const contractABI = [
    "function electionCount() view returns (uint256)",
    "function getElectionDetails(uint256 _electionId) view returns (uint256 id, string title, string description, uint256 startTime, uint256 endTime, bool finalized, address admin, uint256 candidateCount, uint256 totalVotes)",
    "function getCandidate(uint256 _electionId, uint256 _candidateId) view returns (uint256 id, string name, string details, uint256 voteCount)",
    "function createElection(string _title, string _description, uint256 _startTime, uint256 _endTime) returns (uint256)",
    "function addCandidate(uint256 _electionId, string _name, string _details) returns (uint256)",
    "function getCandidateIds(uint256 _electionId) view returns (uint256[])"
  ];

  // Connect to contract
  const connectToContract = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      if (!address) {
        throw new Error("Please enter a contract address");
      }
      
      // Check if we have access to the ethereum object (MetaMask)
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create a provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Create contract instance
      const contractInstance = new ethers.Contract(address, contractABI, signer);
      setContract(contractInstance);
      
      // Get election count
      const count = await contractInstance.electionCount();
      setElectionCount(count.toNumber());
      
      setSuccessMsg(`Connected successfully! Election count: ${count.toNumber()}`);
    } catch (error) {
      console.error("Error connecting to contract:", error);
      setErrorMsg(error.message || "Failed to connect to contract");
    } finally {
      setLoading(false);
    }
  };
  
  // Load all elections
  const loadElections = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      if (!contract) {
        throw new Error("Please connect to contract first");
      }
      
      const electionList = [];
      
      for (let i = 1; i <= electionCount; i++) {
        try {
          const details = await contract.getElectionDetails(i);
          
          electionList.push({
            id: details.id.toNumber(),
            title: details.title,
            description: details.description,
            startTime: new Date(details.startTime.toNumber() * 1000).toLocaleString(),
            endTime: new Date(details.endTime.toNumber() * 1000).toLocaleString(),
            finalized: details.finalized,
            admin: details.admin,
            candidateCount: details.candidateCount.toNumber(),
            totalVotes: details.totalVotes.toNumber()
          });
        } catch (error) {
          console.error(`Error loading election ${i}:`, error);
        }
      }
      
      setElections(electionList);
      setSuccessMsg(`Loaded ${electionList.length} elections`);
    } catch (error) {
      console.error("Error loading elections:", error);
      setErrorMsg(error.message || "Failed to load elections");
    } finally {
      setLoading(false);
    }
  };
  
  // Load candidates for a specific election
  const loadCandidates = async (electionId) => {
    try {
      setLoading(true);
      setErrorMsg('');
      setCandidates([]);
      
      if (!contract) {
        throw new Error("Please connect to contract first");
      }
      
      // Find the selected election
      const election = elections.find(e => e.id === electionId);
      if (!election) {
        throw new Error(`Election with ID ${electionId} not found`);
      }
      
      setSelectedElection(election);
      
      const candidateList = [];
      
      // Load each candidate
      for (let i = 1; i <= election.candidateCount; i++) {
        try {
          const candidateData = await contract.getCandidate(electionId, i);
          
          candidateList.push({
            id: candidateData.id.toNumber(),
            name: candidateData.name,
            details: candidateData.details,
            voteCount: candidateData.voteCount.toNumber()
          });
        } catch (error) {
          console.error(`Error loading candidate ${i} for election ${electionId}:`, error);
        }
      }
      
      setCandidates(candidateList);
      setSuccessMsg(`Loaded ${candidateList.length} candidates for election "${election.title}"`);
    } catch (error) {
      console.error("Error loading candidates:", error);
      setErrorMsg(error.message || "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new election
  const createElection = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg('');
      
      if (!contract) {
        throw new Error("Please connect to contract first");
      }
      
      // Validate input
      if (!newElection.title || !newElection.startTime || !newElection.endTime) {
        throw new Error("Please fill in all required fields");
      }
      
      // Convert dates to timestamps
      const startTimestamp = Math.floor(new Date(newElection.startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(newElection.endTime).getTime() / 1000);
      
      // Call contract function
      const tx = await contract.createElection(
        newElection.title,
        newElection.description || "",
        startTimestamp,
        endTimestamp
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // There are different ways events might be structured in the receipt
      // Let's handle multiple possible formats
      let electionId = null;
      
      // First try to find the event the standard way
      const event = receipt.events?.find(e => e.event === 'ElectionCreated');
      if (event && event.args) {
        electionId = event.args.electionId.toNumber();
      }
      // If that didn't work, try looking at logs
      else if (receipt.logs && receipt.logs.length > 0) {
        // The electionCount is likely incremented in the contract, so the ID is probably the current count
        // We'll need to query the contract to get the current election count
        try {
          const count = await contract.electionCount();
          electionId = count.toNumber();
          setSuccessMsg(`Election created successfully! Estimated ID: ${electionId} (based on election count)`);
        } catch (countError) {
          console.error("Error getting election count:", countError);
          setSuccessMsg('Election created successfully! Transaction confirmed but could not determine election ID.');
        }
      } else {
        setSuccessMsg('Election created successfully! Transaction confirmed but could not find event details.');
      }
      
      if (electionId !== null) {
        setSuccessMsg(`Election created successfully! ID: ${electionId}`);
      }
      
      // Reset form and refresh data
      setNewElection({
        title: '',
        description: '',
        startTime: '',
        endTime: ''
      });
      
      // Reload elections
      await loadElections();
    } catch (error) {
      console.error("Error creating election:", error);
      setErrorMsg(error.message || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };
  
  // Add a candidate to an election
  const addCandidate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg('');
      
      if (!contract) {
        throw new Error("Please connect to contract first");
      }
      
      // Validate input
      if (!newCandidate.electionId || !newCandidate.name) {
        throw new Error("Please fill in all required fields");
      }
      
      // Call contract function
      const tx = await contract.addCandidate(
        newCandidate.electionId,
        newCandidate.name,
        newCandidate.details || ""
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Handle events similar to the election creation
      let candidateId = null;
      
      // Try to find the event the standard way
      const event = receipt.events?.find(e => e.event === 'CandidateAdded');
      if (event && event.args) {
        candidateId = event.args.candidateId.toNumber();
      }
      // If that didn't work, look for other ways to identify the candidate ID
      else if (receipt.logs && receipt.logs.length > 0) {
        // Try to get the current candidate count for this election
        try {
          const election = await contract.getElectionDetails(newCandidate.electionId);
          candidateId = election.candidateCount.toNumber();
          setSuccessMsg(`Candidate added successfully! Estimated ID: ${candidateId} (based on candidate count)`);
        } catch (countError) {
          console.error("Error getting candidate count:", countError);
          setSuccessMsg('Candidate added successfully! Transaction confirmed but could not determine candidate ID.');
        }
      } else {
        setSuccessMsg('Candidate added successfully! Transaction confirmed but could not find event details.');
      }
      
      if (candidateId !== null) {
        setSuccessMsg(`Candidate added successfully! ID: ${candidateId}`);
      }
      
      // Reset form
      setNewCandidate({
        ...newCandidate,
        name: '',
        details: ''
      });
      
      // Reload candidates if we're viewing the same election
      if (selectedElection && selectedElection.id === parseInt(newCandidate.electionId)) {
        await loadCandidates(parseInt(newCandidate.electionId));
      }
      
      // Reload elections to update candidate count
      await loadElections();
    } catch (error) {
      console.error("Error adding candidate:", error);
      setErrorMsg(error.message || "Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Direct Contract Testing</h1>
      
      {/* Connect to Contract */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <h2 className="text-lg font-bold mb-4">Connect to Contract</h2>
        <div className="flex items-end gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Contract Address</label>
            <input 
              type="text" 
              value={address} 
              onChange={e => setAddress(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="0x..."
            />
          </div>
          <button 
            onClick={connectToContract}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
        {errorMsg && (
          <div className="p-4 mb-4 bg-red-50 text-red-600 rounded">{errorMsg}</div>
        )}
        {successMsg && (
          <div className="p-4 mb-4 bg-green-50 text-green-600 rounded">{successMsg}</div>
        )}
        
        {contract && (
          <div className="flex gap-4 mt-4">
            <button 
              onClick={loadElections}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {loading ? 'Loading...' : 'Load Elections'}
            </button>
          </div>
        )}
      </div>
      
      {/* Create Election Form */}
      {contract && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-lg font-bold mb-4">Create New Election</h2>
          <form onSubmit={createElection} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title*</label>
              <input 
                type="text" 
                value={newElection.title} 
                onChange={e => setNewElection({...newElection, title: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="Election Title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea 
                value={newElection.description} 
                onChange={e => setNewElection({...newElection, description: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="Election Description"
                rows="2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time*</label>
                <input 
                  type="datetime-local" 
                  value={newElection.startTime} 
                  onChange={e => setNewElection({...newElection, startTime: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time*</label>
                <input 
                  type="datetime-local" 
                  value={newElection.endTime} 
                  onChange={e => setNewElection({...newElection, endTime: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {loading ? 'Creating...' : 'Create Election'}
            </button>
          </form>
        </div>
      )}
      
      {/* Add Candidate Form */}
      {contract && elections.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-lg font-bold mb-4">Add Candidate</h2>
          <form onSubmit={addCandidate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Election*</label>
              <select 
                value={newCandidate.electionId} 
                onChange={e => setNewCandidate({...newCandidate, electionId: e.target.value})}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select an election</option>
                {elections.map(election => (
                  <option key={election.id} value={election.id}>
                    {election.title} (ID: {election.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name*</label>
              <input 
                type="text" 
                value={newCandidate.name} 
                onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="Candidate Name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Details</label>
              <textarea 
                value={newCandidate.details} 
                onChange={e => setNewCandidate({...newCandidate, details: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="Additional details (can be IPFS hash)"
                rows="2"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {loading ? 'Adding...' : 'Add Candidate'}
            </button>
          </form>
        </div>
      )}
      
      {/* Elections List */}
      {elections.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-lg font-bold mb-4">Elections ({elections.length})</h2>
          <div className="space-y-4">
            {elections.map(election => (
              <div key={election.id} className="border p-4 rounded">
                <h3 className="text-lg font-medium">{election.title} (ID: {election.id})</h3>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div><strong>Description:</strong> {election.description || 'None'}</div>
                  <div><strong>Admin:</strong> {election.admin}</div>
                  <div><strong>Start:</strong> {election.startTime}</div>
                  <div><strong>End:</strong> {election.endTime}</div>
                  <div><strong>Status:</strong> {election.finalized ? 'Finalized' : 'Active'}</div>
                  <div><strong>Candidates:</strong> {election.candidateCount}</div>
                </div>
                <div className="mt-3">
                  <button 
                    onClick={() => loadCandidates(election.id)}
                    disabled={loading}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                  >
                    {loading && selectedElection?.id === election.id ? 'Loading...' : 'View Candidates'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Candidates List */}
      {selectedElection && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold mb-4">
            Candidates for "{selectedElection.title}" ({candidates.length})
          </h2>
          
          {candidates.length > 0 ? (
            <div className="space-y-4">
              {candidates.map(candidate => (
                <div key={candidate.id} className="border p-4 rounded bg-gray-50">
                  <h3 className="font-medium">#{candidate.id}: {candidate.name}</h3>
                  <div className="text-sm text-gray-600 mt-1"><strong>Details:</strong> {candidate.details || 'None'}</div>
                  <div className="text-sm text-gray-600"><strong>Votes:</strong> {candidate.voteCount}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-red-600">
              No candidates found for this election. Please add some candidates.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractTester;