import { ethers } from 'ethers';

/**
 * Service for interacting with the blockchain voting smart contract
 */
class BlockchainService {
  constructor(contract, signer) {
    this.contract = contract;
    this.signer = signer;
  }

  /**
   * Get all elections
   * @returns {Promise<Array>} Array of election details
   */
  async getAllElections() {
    try {
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
      const candidates = [];

      for (let i = 1; i <= candidateCount; i++) {
        try {
          const result = await this.contract.getCandidate(electionId, i);
          
          candidates.push({
            id: result.id.toNumber(),
            name: result.name,
            details: result.details, // IPFS hash
            voteCount: result.voteCount.toNumber()
          });
        } catch (error) {
          console.error(`Error fetching candidate ${i} for election ${electionId}:`, error);
        }
      }

      return candidates;
    } catch (error) {
      console.error(`Error fetching candidates for election ${electionId}:`, error);
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
   * Add a candidate to an election
   * @param {number} electionId - ID of the election
   * @param {string} name - Name of the candidate
   * @param {string} details - IPFS hash of candidate details
   * @returns {Promise<Object>} Transaction receipt
   */
  async addCandidate(electionId, name, details) {
    try {
      if (!this.signer) {
        throw new Error('Signer not available. Please connect your wallet.');
      }

      const contractWithSigner = this.contract.connect(this.signer);
      
      const tx = await contractWithSigner.addCandidate(electionId, name, details);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Extract candidate ID from event logs
      const event = receipt.events.find(event => event.event === 'CandidateAdded');
      const candidateId = event.args.candidateId.toNumber();
      
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
   * Cast a vote in an election
   * @param {number} electionId - ID of the election
   * @param {number} candidateId - ID of the candidate
   * @returns {Promise<Object>} Transaction receipt
   */
  async vote(electionId, candidateId) {
    try {
      if (!this.signer) {
        throw new Error('Signer not available. Please connect your wallet.');
      }

      const contractWithSigner = this.contract.connect(this.signer);
      
      const tx = await contractWithSigner.vote(electionId, candidateId);
      
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
      if (!this.signer) {
        throw new Error('Signer not available. Please connect your wallet.');
      }

      const contractWithSigner = this.contract.connect(this.signer);
      
      const tx = await contractWithSigner.finalizeElection(electionId);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Extract winning candidate ID from event logs
      const event = receipt.events.find(event => event.event === 'ElectionFinalized');
      const winningCandidateId = event.args.winningCandidateId.toNumber();
      
      return {
        transactionHash: receipt.transactionHash,
        winningCandidateId
      };
    } catch (error) {
      console.error(`Error finalizing election ${electionId}:`, error);
      throw error;
    }
  }

  /**
   * Get the winning candidate for an election
   * @param {number} electionId - ID of the election
   * @returns {Promise<number>} ID of the winning candidate
   */
  async getWinningCandidate(electionId) {
    try {
      const winningCandidateId = await this.contract.getWinningCandidate(electionId);
      return winningCandidateId.toNumber();
    } catch (error) {
      console.error(`Error getting winning candidate for election ${electionId}:`, error);
      throw error;
    }
  }
}

export default BlockchainService;