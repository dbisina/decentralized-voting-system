import { ethers } from 'ethers';

/**
 * Service for interacting with the blockchain voting smart contract
 * Includes mock functionality for testing and development
 */
class BlockchainService {
  constructor(contract, signer) {
    this.contract = contract;
    this.signer = signer;
    
    // Check if we should use mock mode
    this.useMockMode = !contract || process.env.REACT_APP_USE_MOCK_BLOCKCHAIN === 'true';
    
    // Initialize mock storage if needed
    if (this.useMockMode) {
      this._initMockStorage();
    }
  }
  
  /**
   * Initialize mock storage
   * @private
   */
  _initMockStorage() {
    try {
      let mockData = localStorage.getItem('mock_blockchain_data');
      if (mockData) {
        this.mockData = JSON.parse(mockData);
      } else {
        // Create sample data for first-time users
        this.mockData = {
          electionCount: 2,
          elections: {
            1: {
              id: 1,
              title: "Student Council Election",
              description: "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX",
              startTime: new Date(Date.now() - 86400000).getTime(), // yesterday
              endTime: new Date(Date.now() + 86400000 * 3).getTime(), // 3 days from now
              finalized: false,
              admin: this.signer ? this.signer.getAddress() : "0x123...",
              candidateCount: 2,
              totalVotes: 5,
              candidates: {
                1: {
                  id: 1,
                  name: "Alex Johnson",
                  details: "QmUbE6LyM4qs8Q8GC3JHKvLKUFP9yLKhcZ1KxGQRhKaTK6",
                  voteCount: 3
                },
                2: {
                  id: 2,
                  name: "Sam Wilson",
                  details: "QmNZw7yscUjMLYMKG1SHMzPvQdyBgDNUri1kTfUWvJeHTw",
                  voteCount: 2
                }
              },
              voters: {}
            },
            2: {
              id: 2,
              title: "Community Development Proposal",
              description: "QmVZ1Wj4oHqyFNYT6VmxhEUhSjzrsZdDqoHSLkeGihQQZA",
              startTime: new Date(Date.now() + 86400000 * 2).getTime(), // 2 days from now
              endTime: new Date(Date.now() + 86400000 * 9).getTime(), // 9 days from now
              finalized: false,
              admin: this.signer ? this.signer.getAddress() : "0x123...",
              candidateCount: 2,
              totalVotes: 0,
              candidates: {
                1: {
                  id: 1,
                  name: "Proposal A: Community Garden",
                  details: "QmR9vLw7SnQx4XrJVNrGwDUVFrL3ZLXNpmdAUHJrFThJY7",
                  voteCount: 0
                },
                2: {
                  id: 2,
                  name: "Proposal B: Public Library",
                  details: "QmXHLkjyQPvL7GbEGHnMgY1PLjQJwhwzkLQrSSVbQNsZXb",
                  voteCount: 0
                }
              },
              voters: {}
            }
          }
        };
        this._saveMockData();
      }
    } catch (error) {
      console.warn('Error initializing mock blockchain storage:', error);
      // Initialize with empty data if there's an error
      this.mockData = { electionCount: 0, elections: {} };
    }
  }
  
  /**
   * Save mock data to localStorage
   * @private
   */
  _saveMockData() {
    try {
      localStorage.setItem('mock_blockchain_data', JSON.stringify(this.mockData));
    } catch (error) {
      console.warn('Error saving mock blockchain data:', error);
    }
  }
  
  /**
   * Generate a fake transaction hash
   * @returns {string} A mock transaction hash
   * @private
   */
  _generateTxHash() {
    return '0x' + Array(64).fill(0).map(() => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
  
  /**
   * Create a mock transaction receipt
   * @returns {Object} A mock transaction receipt
   * @private
   */
  _createMockReceipt() {
    return {
      transactionHash: this._generateTxHash(),
      blockNumber: Math.floor(Math.random() * 1000000) + 15000000,
      blockHash: '0x' + Array(64).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join(''),
      confirmations: 1,
      status: 1
    };
  }

  /**
   * Get all elections
   * @returns {Promise<Array>} Array of election details
   */
  async getAllElections() {
    try {
      if (this.useMockMode) {
        console.log('Using mock blockchain data for getAllElections');
        const elections = [];
        for (const id in this.mockData.elections) {
          const election = this.mockData.elections[id];
          
          // Create a copy with candidates as array
          const electionCopy = { ...election };
          electionCopy.candidates = Object.values(election.candidates);
          
          // Add status
          const now = new Date().getTime();
          if (election.finalized) {
            electionCopy.status = 'completed';
          } else if (now < election.startTime) {
            electionCopy.status = 'upcoming';
          } else if (now > election.endTime) {
            electionCopy.status = 'ended';
          } else {
            electionCopy.status = 'active';
          }
          
          elections.push(electionCopy);
        }
        
        return elections;
      }
      
      // Real blockchain implementation
      const electionCount = await this.contract.electionCount();
      const elections = [];

      for (let i = 1; i <= electionCount; i++) {
        try {
          const election = await this.getElectionDetails(i);
          elections.push(election);
        } catch (error) {
          console.error(`Error fetching election ${i}:`, error);
        }
      }

      return elections;
    } catch (error) {
      console.error('Error fetching elections:', error);
      throw error;
    }
  }

  /**
   * Get details for a specific election
   * @param {number} electionId - ID of the election
   * @returns {Promise<Object>} Election details
   */
  async getElectionDetails(electionId) {
    try {
      if (this.useMockMode) {
        console.log(`Using mock blockchain data for getElectionDetails(${electionId})`);
        
        const election = this.mockData.elections[electionId];
        if (!election) {
          throw new Error(`Election ${electionId} not found`);
        }
        
        // Create a copy
        const electionCopy = { ...election };
        
        // Get the current status
        const now = new Date().getTime();
        if (election.finalized) {
          electionCopy.status = 'completed';
        } else if (now < election.startTime) {
          electionCopy.status = 'upcoming';
        } else if (now > election.endTime) {
          electionCopy.status = 'ended';
        } else {
          electionCopy.status = 'active';
        }
        
        // Convert date timestamps to Date objects
        electionCopy.startTime = new Date(election.startTime);
        electionCopy.endTime = new Date(election.endTime);
        
        // Convert candidates object to array
        electionCopy.candidates = await this.getElectionCandidates(electionId, election.candidateCount);
        
        return electionCopy;
      }
      
      // Real blockchain implementation
      const result = await this.contract.getElectionDetails(electionId);
      
      // Format the response
      const election = {
        id: result.id.toNumber(),
        title: result.title,
        description: result.description, // IPFS hash
        startTime: new Date(result.startTime.toNumber() * 1000),
        endTime: new Date(result.endTime.toNumber() * 1000),
        finalized: result.finalized,
        admin: result.admin,
        candidateCount: result.candidateCount.toNumber(),
        totalVotes: result.totalVotes.toNumber()
      };

      // Get the current status
      const now = new Date();
      if (election.finalized) {
        election.status = 'completed';
      } else if (now < election.startTime) {
        election.status = 'upcoming';
      } else if (now > election.endTime) {
        election.status = 'ended';
      } else {
        election.status = 'active';
      }

      // Get candidates if available
      if (election.candidateCount > 0) {
        election.candidates = await this.getElectionCandidates(electionId, election.candidateCount);
      } else {
        election.candidates = [];
      }

      return election;
    } catch (error) {
      console.error(`Error fetching election ${electionId}:`, error);
      throw error;
    }
  }

 /**
 * Get all candidates for an election
 * @param {number} electionId - ID of the election
 * @param {number} candidateCount - Total number of candidates
 * @returns {Promise<Array>} Array of candidate details
 */
async getElectionCandidates(electionId, candidateCount) {
  try {
    if (this.useMockMode) {
      console.log(`Using mock blockchain data for getElectionCandidates(${electionId})`);
      
      const election = this.mockData.elections[electionId];
      if (!election) {
        throw new Error(`Election ${electionId} not found`);
      }
      
      return Object.values(election.candidates);
    }
    
    // Real blockchain implementation for your contract structure
    const candidates = [];
    console.log(`Fetching ${candidateCount} candidates for election ${electionId}`);

    // For each candidate ID, get the candidate details directly using getCandidate
    for (let i = 1; i <= candidateCount; i++) {
      try {
        console.log(`Fetching candidate ${i} for election ${electionId}`);
        const result = await this.contract.getCandidate(electionId, i);
        
        candidates.push({
          id: result.id.toNumber(),
          name: result.name,
          details: result.details, // IPFS hash or direct details
          voteCount: result.voteCount.toNumber()
        });
        
        console.log(`Successfully fetched candidate ${i}: ${result.name}`);
      } catch (error) {
        console.error(`Error fetching candidate ${i} for election ${electionId}:`, error);
      }
    }

    console.log(`Retrieved ${candidates.length} candidates for election ${electionId}`);
    return candidates;
  } catch (error) {
    console.error(`Error fetching candidates for election ${electionId}:`, error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Add a candidate to an election
 * @param {number} electionId - ID of the election
 * @param {string} name - Name of the candidate
 * @param {string} details - IPFS hash of candidate details
 * @returns {Promise<Object>} Transaction receipt
 */
async addCandidate(electionId, name, details) {
  try {
    if (this.useMockMode) {
      console.log(`Using mock blockchain data for addCandidate(${electionId})`);
      
      const election = this.mockData.elections[electionId];
      if (!election) {
        throw new Error(`Election ${electionId} not found`);
      }
      
      // Increment candidate count
      election.candidateCount++;
      const candidateId = election.candidateCount;
      
      // Add candidate
      election.candidates[candidateId] = {
        id: candidateId,
        name,
        details,
        voteCount: 0
      };
      
      // Save to localStorage
      this._saveMockData();
      
      // Create receipt
      const receipt = this._createMockReceipt();
      
      return {
        transactionHash: receipt.transactionHash,
        candidateId
      };
    }
    
    // Real blockchain implementation
    if (!this.signer) {
      throw new Error('Signer not available. Please connect your wallet.');
    }

    const contractWithSigner = this.contract.connect(this.signer);
    
    // Check if election has started before attempting to add candidate
    const electionDetails = await contractWithSigner.getElectionDetails(electionId);
    const now = Math.floor(Date.now() / 1000);
    
    if (now >= electionDetails.startTime.toNumber()) {
      throw new Error('Cannot add candidate after election has started');
    }
    
    console.log(`Adding candidate "${name}" to election ${electionId}...`);
    const tx = await contractWithSigner.addCandidate(electionId, name, details);
    console.log(`Transaction sent: ${tx.hash}`);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log(`Transaction mined: ${receipt.transactionHash}`);
    
    // Try to extract candidate ID from the event or get updated candidate count
    let candidateId;
    
    try {
      // First try standard event format
      const event = receipt.events?.find(evt => evt.event === 'CandidateAdded');
      if (event && event.args) {
        candidateId = event.args.candidateId.toNumber();
        console.log(`Found candidate ID from event: ${candidateId}`);
      } else {
        // If event not found, get updated candidate count
        console.log(`No event found. Getting updated election details...`);
        const updatedDetails = await contractWithSigner.getElectionDetails(electionId);
        candidateId = updatedDetails.candidateCount.toNumber();
        console.log(`Using candidate count as ID: ${candidateId}`);
      }
    } catch (eventError) {
      console.warn(`Error extracting candidate ID from events: ${eventError.message}`);
      // Use a fallback approach - if we had X candidates before, new one is likely X+1
      const updatedDetails = await contractWithSigner.getElectionDetails(electionId);
      candidateId = updatedDetails.candidateCount.toNumber();
    }
    
    return {
      transactionHash: receipt.transactionHash,
      candidateId
    };
  } catch (error) {
    console.error(`Error adding candidate to election ${electionId}:`, error);
    throw error;
  }
}

  /**
   * Check if a user has voted in an election
   * @param {number} electionId - ID of the election
   * @param {string} voterAddress - Ethereum address of the voter
   * @returns {Promise<boolean>} Whether the user has voted
   */
  async hasVoted(electionId, voterAddress) {
    try {
      if (this.useMockMode) {
        console.log(`Using mock blockchain data for hasVoted(${electionId}, ${voterAddress})`);
        
        const election = this.mockData.elections[electionId];
        if (!election) {
          throw new Error(`Election ${electionId} not found`);
        }
        
        return !!election.voters[voterAddress];
      }
      
      // Real blockchain implementation
      return await this.contract.hasVoted(electionId, voterAddress);
    } catch (error) {
      console.error(`Error checking if address ${voterAddress} has voted in election ${electionId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new election
   * @param {string} title - Title of the election
   * @param {string} description - IPFS hash of election details
   * @param {number} startTime - Start time of the election (Unix timestamp)
   * @param {number} endTime - End time of the election (Unix timestamp)
   * @returns {Promise<Object>} Transaction receipt
   */
  async createElection(title, description, startTime, endTime) {
    try {
      if (this.useMockMode) {
        console.log('Using mock blockchain data for createElection');
        
        // Implement mock version
        // Increment election count
        this.mockData.electionCount++;
        const electionId = this.mockData.electionCount;
        
        // Create new election
        this.mockData.elections[electionId] = {
          id: electionId,
          title,
          description,
          startTime: typeof startTime === 'number' ? startTime : Math.floor(startTime / 1000),
          endTime: typeof endTime === 'number' ? endTime : Math.floor(endTime / 1000),
          finalized: false,
          admin: await this.signer.getAddress(),
          candidateCount: 0,
          totalVotes: 0,
          candidates: {},
          voters: {}
        };
        
        // Save to localStorage
        this._saveMockData();
        
        // Create receipt
        const receipt = this._createMockReceipt();
        
        return {
          transactionHash: receipt.transactionHash,
          electionId
        };
      }
      
      // Real blockchain implementation
      if (!this.signer) {
        throw new Error('Signer not available. Please connect your wallet.');
      }

      const contractWithSigner = this.contract.connect(this.signer);
      
      const tx = await contractWithSigner.createElection(
        title,
        description,
        Math.floor(startTime / 1000), // Convert to Unix timestamp
        Math.floor(endTime / 1000)    // Convert to Unix timestamp
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Extract election ID from event logs
      const event = receipt.events.find(event => event.event === 'ElectionCreated');
      const electionId = event.args.electionId.toNumber();
      
      return {
        transactionHash: receipt.transactionHash,
        electionId
      };
    } catch (error) {
      console.error('Error creating election:', error);
      throw error;
    }
  }


  /**
   * Cast a vote in an election
   * @param {number} electionId - ID of the election
   * @param {number} candidateId - ID of the candidate
   * @returns {Promise<Object>} Transaction receipt
   */
  async vote(electionId, candidateId) {
    try {
      if (this.useMockMode) {
        console.log(`Using mock blockchain data for vote(${electionId}, ${candidateId})`);
        
        const election = this.mockData.elections[electionId];
        if (!election) {
          throw new Error(`Election ${electionId} not found`);
        }
        
        const candidate = election.candidates[candidateId];
        if (!candidate) {
          throw new Error(`Candidate ${candidateId} not found in election ${electionId}`);
        }
        
        // Simulate blockchain validation
        const now = new Date().getTime();
        if (now < election.startTime) {
          throw new Error('Election has not started yet');
        }
        if (now > election.endTime) {
          throw new Error('Election has ended');
        }
        if (election.finalized) {
          throw new Error('Election is already finalized');
        }
        
        // Get voter address
        const voterAddress = await this.signer.getAddress();
        
        // Check if already voted
        if (election.voters[voterAddress]) {
          throw new Error('You have already voted in this election');
        }
        
        // Record vote
        election.voters[voterAddress] = candidateId;
        candidate.voteCount++;
        election.totalVotes++;
        
        // Save to localStorage
        this._saveMockData();
        
        // Create receipt
        const receipt = this._createMockReceipt();
        
        // Add a small delay to simulate blockchain transaction time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return {
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber
        };
      }
      
      // Real blockchain implementation
      if (!this.signer) {
        throw new Error('Signer not available. Please connect your wallet.');
      }
  
      // Convert parameters to BigNumber to ensure proper formatting
      const electionIdBN = ethers.BigNumber.from(String(electionId));
      const candidateIdBN = ethers.BigNumber.from(String(candidateId));
      
      console.log("Converted parameters:", {
        electionIdBN: electionIdBN.toString(),
        candidateIdBN: candidateIdBN.toString()
      });
  
      const contractWithSigner = this.contract.connect(this.signer);
      
      // Use explicit gas settings
      const tx = await contractWithSigner.vote(electionIdBN, candidateIdBN, {
        gasLimit: 3000000 // Set a high gas limit
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error(`Error voting in election ${electionId}:`, error);
      throw error;
    }
  }

  /**
   * Finalize an election
   * @param {number} electionId - ID of the election
   * @returns {Promise<Object>} Transaction receipt including winning candidate ID
   */
  async finalizeElection(electionId) {
    try {
      if (this.useMockMode) {
        console.log(`Using mock blockchain data for finalizeElection(${electionId})`);
        
        const election = this.mockData.elections[electionId];
        if (!election) {
          throw new Error(`Election ${electionId} not found`);
        }
        
        // Simulate blockchain validation
        const now = new Date().getTime();
        if (now < election.endTime) {
          throw new Error('Election has not ended yet');
        }
        if (election.finalized) {
          throw new Error('Election is already finalized');
        }
        
        // Check if there are any votes
        if (election.totalVotes === 0) {
          throw new Error('No votes cast in this election');
        }
        
        // Find winning candidate
        const winningCandidateId = await this.getWinningCandidate(electionId);
        
        // Mark as finalized
        election.finalized = true;
        
        // Save to localStorage
        this._saveMockData();
        
        // Create receipt
        const receipt = this._createMockReceipt();
        
        return {
          transactionHash: receipt.transactionHash,
          winningCandidateId
        };
      }
      
      // Real blockchain implementation
      if (!this.signer) {
        throw new Error('Signer not available. Please connect your wallet.');
      }
  
      // Convert electionId to BigNumber
      const electionIdBN = ethers.BigNumber.from(String(electionId));
      console.log(`Attempting to finalize election ${electionIdBN.toString()}`);
      
      // Get election details first to check status
      try {
        const election = await this.contract.getElectionDetails(electionIdBN);
        console.log("Election details:", {
          id: election.id.toNumber(),
          startTime: new Date(election.startTime.toNumber() * 1000),
          endTime: new Date(election.endTime.toNumber() * 1000),
          finalized: election.finalized,
          totalVotes: election.totalVotes.toNumber()
        });
        
        const now = Math.floor(Date.now() / 1000);
        if (now <= election.endTime.toNumber()) {
          throw new Error("Election has not ended yet. Please wait until the end time.");
        }
        
        if (election.finalized) {
          throw new Error("Election is already finalized.");
        }
        
        if (election.totalVotes.toNumber() === 0) {
          throw new Error("No votes have been cast in this election. At least one vote is required to finalize.");
        }
      } catch (checkError) {
        console.warn("Error checking election status:", checkError);
        // Continue anyway - the contract will validate
      }
  
      const contractWithSigner = this.contract.connect(this.signer);
      
      // Add explicit gas settings
      const options = {
        gasLimit: 3000000
      };
      
      console.log("Sending finalize transaction with options:", options);
      const tx = await contractWithSigner.finalizeElection(electionIdBN, options);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Try to extract winning candidate ID from event logs
      let winningCandidateId = null;
      try {
        const event = receipt.events.find(event => event.event === 'ElectionFinalized');
        if (event && event.args) {
          winningCandidateId = event.args.winningCandidateId.toNumber();
        }
      } catch (eventError) {
        console.warn("Could not extract winning candidate ID from events:", eventError);
      }
      
      return {
        transactionHash: receipt.transactionHash,
        winningCandidateId
      };
    } catch (err) {
      console.error(`Error finalizing election ${electionId}:`, err);
      
      // Better error messaging
      let errorMessage = err.message || "Unknown error";
      
      // Check for common errors
      if (errorMessage.includes("No votes cast")) {
        throw new Error("Cannot finalize an election with no votes. At least one vote must be cast.");
      } else if (errorMessage.includes("has not ended")) {
        throw new Error("The election period has not ended yet. Please wait until the end time.");
      } else if (errorMessage.includes("already finalized")) {
        throw new Error("This election has already been finalized.");
      } else if (errorMessage.includes("Only election admin")) {
        throw new Error("Only the election admin can finalize this election.");
      } else {
        throw new Error(`Failed to finalize election: ${errorMessage}`);
      }
    }
  }

  /**
   * Get the winning candidate for an election
   * @param {number} electionId - ID of the election
   * @returns {Promise<number>} ID of the winning candidate
   */
  async getWinningCandidate(electionId) {
    try {
      if (this.useMockMode) {
        console.log(`Using mock blockchain data for getWinningCandidate(${electionId})`);
        
        const election = this.mockData.elections[electionId];
        if (!election) {
          throw new Error(`Election ${electionId} not found`);
        }
        
        // Find candidate with most votes
        let winningVoteCount = 0;
        let winningCandidateId = 0;
        
        for (const id in election.candidates) {
          const candidate = election.candidates[id];
          if (candidate.voteCount > winningVoteCount) {
            winningVoteCount = candidate.voteCount;
            winningCandidateId = candidate.id;
          }
        }
        
        if (winningCandidateId === 0) {
          throw new Error('No votes cast in this election');
        }
        
        return winningCandidateId;
      }
      
      // Real blockchain implementation
      const winningCandidateId = await this.contract.getWinningCandidate(electionId);
      return winningCandidateId.toNumber();
    } catch (error) {
      console.error(`Error getting winning candidate for election ${electionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if the service is using mock mode
   * @returns {boolean} Whether mock mode is being used
   */
  isUsingMockMode() {
    return this.useMockMode;
  }
}

export default BlockchainService;