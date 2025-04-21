import { ethers } from 'ethers';

/**
 * Service for interacting with the enhanced voting contract with access control
 */
class EnhancedBlockchainService {
  constructor(contract, signer) {
    this.contract = contract;
    this.signer = signer;
    
    // Role hashes (matching the contract)
    this.ROLES = {
      SUPER_ADMIN: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SUPER_ADMIN_ROLE")),
      ELECTION_ADMIN: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ELECTION_ADMIN_ROLE")),
      AUDITOR: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AUDITOR_ROLE")),
      VOTER: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VOTER_ROLE"))
    };
    
    // Election types and statuses
    this.ELECTION_TYPES = {
      PUBLIC: 0,
      PRIVATE: 1,
      ORGANIZATION: 2
    };
    
    this.ELECTION_STATUS = {
      DRAFT: 0,
      REGISTRATION: 1,
      ACTIVE: 2,
      ENDED: 3,
      FINALIZED: 4
    };
    
    this.VOTER_STATUS = {
      NONE: 0,
      PENDING: 1,
      APPROVED: 2,
      REJECTED: 3,
      BLACKLISTED: 4
    };
  }
  
  /**
   * Check if an account has a specific role
   * @param {string} role - Role name
   * @param {string} account - Account address
   * @returns {Promise<boolean>} Whether the account has the role
   */
  async hasRole(role, account) {
    const roleHash = this.ROLES[role];
    if (!roleHash) throw new Error(`Invalid role: ${role}`);
    
    return await this.contract.hasRole(roleHash, account);
  }
  
  /**
   * Grant a role to an account
   * @param {string} role - Role name
   * @param {string} account - Account address
   * @returns {Promise<Object>} Transaction receipt
   */
  async grantRole(role, account) {
    const roleHash = this.ROLES[role];
    if (!roleHash) throw new Error(`Invalid role: ${role}`);
    
    const contractWithSigner = this.contract.connect(this.signer);
    const tx = await contractWithSigner.grantRole(roleHash, account);
    return await tx.wait();
  }
  
  /**
   * Create an organization
   * @param {string} organizationId - Organization identifier
   * @param {string} name - Organization name
   * @returns {Promise<Object>} Transaction receipt
   */
  async createOrganization(organizationId, name) {
    const contractWithSigner = this.contract.connect(this.signer);
    const organizationHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(organizationId));
    
    const tx = await contractWithSigner.createOrganization(organizationHash, name);
    return await tx.wait();
  }
  
  /**
   * Create an enhanced election
   * @param {Object} electionData - Election data
   * @returns {Promise<Object>} Transaction receipt with election ID
   */
  async createElection(electionData) {
    const contractWithSigner = this.contract.connect(this.signer);
    
    const {
      title,
      description,
      registrationStartTime,
      votingStartTime,
      votingEndTime,
      electionType = 'PUBLIC',
      organizationId = '',
      metadataURI = ''
    } = electionData;
    
    const electionTypeEnum = this.ELECTION_TYPES[electionType];
    const organizationHash = organizationId ? 
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes(organizationId)) : 
      ethers.constants.HashZero;
    
    // Convert dates to timestamps if they're Date objects
    const registrationStart = typeof registrationStartTime === 'number' 
      ? registrationStartTime 
      : Math.floor(new Date(registrationStartTime).getTime() / 1000);
    const votingStart = typeof votingStartTime === 'number' 
      ? votingStartTime 
      : Math.floor(new Date(votingStartTime).getTime() / 1000);
    const votingEnd = typeof votingEndTime === 'number' 
      ? votingEndTime 
      : Math.floor(new Date(votingEndTime).getTime() / 1000);
    
    const tx = await contractWithSigner.createElection(
      title,
      description,
      registrationStart,
      votingStart,
      votingEnd,
      electionTypeEnum,
      organizationHash,
      metadataURI
    );
    
    const receipt = await tx.wait();
    
    // Extract election ID from event
    const event = receipt.events.find(e => e.event === 'ElectionCreated');
    const electionId = event.args.electionId.toNumber();
    
    return { ...receipt, electionId };
  }
  
  /**
   * Register as a voter for an election
   * @param {number} electionId - Election ID
   * @param {string} verificationData - Verification data (could be JSON string)
   * @returns {Promise<Object>} Transaction receipt
   */
  async registerVoter(electionId, verificationData = '') {
    const contractWithSigner = this.contract.connect(this.signer);
    const tx = await contractWithSigner.registerVoter(electionId, verificationData);
    return await tx.wait();
  }
  
  /**
   * Update voter registration status
   * @param {number} electionId - Election ID
   * @param {string} voterAddress - Voter address
   * @param {string} status - New status ('APPROVED', 'REJECTED', 'BLACKLISTED')
   * @returns {Promise<Object>} Transaction receipt
   */
  async updateVoterStatus(electionId, voterAddress, status) {
    const contractWithSigner = this.contract.connect(this.signer);
    const statusEnum = this.VOTER_STATUS[status];
    
    if (statusEnum === undefined) throw new Error(`Invalid status: ${status}`);
    
    const tx = await contractWithSigner.updateVoterStatus(electionId, voterAddress, statusEnum);
    return await tx.wait();
  }
  
  /**
   * Bulk approve voters
   * @param {number} electionId - Election ID
   * @param {string[]} voterAddresses - Array of voter addresses
   * @returns {Promise<Object>} Transaction receipt
   */
  async bulkApproveVoters(electionId, voterAddresses) {
    const contractWithSigner = this.contract.connect(this.signer);
    const tx = await contractWithSigner.bulkApproveVoters(electionId, voterAddresses);
    return await tx.wait();
  }
  
  /**
   * Update election status
   * @param {number} electionId - Election ID
   * @param {string} status - New status ('DRAFT', 'REGISTRATION', 'ACTIVE', 'ENDED', 'FINALIZED')
   * @returns {Promise<Object>} Transaction receipt
   */
  async updateElectionStatus(electionId, status) {
    const contractWithSigner = this.contract.connect(this.signer);
    const statusEnum = this.ELECTION_STATUS[status];
    
    if (statusEnum === undefined) throw new Error(`Invalid status: ${status}`);
    
    const tx = await contractWithSigner.updateElectionStatus(electionId, statusEnum);
    return await tx.wait();
  }
  
  /**
   * Get voter registration details
   * @param {number} electionId - Election ID
   * @param {string} voterAddress - Voter address
   * @returns {Promise<Object>} Voter registration data
   */
  async getVoterRegistration(electionId, voterAddress) {
    const registration = await this.contract.getVoterRegistration(electionId, voterAddress);
    
    return {
      status: Object.keys(this.VOTER_STATUS).find(key => this.VOTER_STATUS[key] === registration.status.toNumber()),
      registrationTime: new Date(registration.registrationTime.toNumber() * 1000),
      approver: registration.approver,
      verificationData: registration.verificationData
    };
  }
  
  /**
   * Get enhanced election details
   * @param {number} electionId - Election ID
   * @returns {Promise<Object>} Election details
   */
  async getElectionDetails(electionId) {
    const result = await this.contract.getElectionDetails(electionId);
    
    return {
      id: result.id.toNumber(),
      title: result.title,
      description: result.description,
      registrationStartTime: new Date(result.registrationStartTime.toNumber() * 1000),
      votingStartTime: new Date(result.votingStartTime.toNumber() * 1000),
      votingEndTime: new Date(result.votingEndTime.toNumber() * 1000),
      status: Object.keys(this.ELECTION_STATUS).find(key => this.ELECTION_STATUS[key] === result.status.toNumber()),
      electionType: Object.keys(this.ELECTION_TYPES).find(key => this.ELECTION_TYPES[key] === result.electionType.toNumber()),
      admin: result.admin,
      candidateCount: result.candidateCount.toNumber(),
      totalVotes: result.totalVotes.toNumber(),
      organizationId: result.organizationId !== ethers.constants.HashZero ? result.organizationId : null,
      metadataURI: result.metadataURI
    };
  }
  
  /**
   * Cast a vote with receipt
   * @param {number} electionId - Election ID
   * @param {number} candidateId - Candidate ID
   * @returns {Promise<Object>} Transaction receipt with vote receipt
   */
  async vote(electionId, candidateId) {
    const contractWithSigner = this.contract.connect(this.signer);
    const tx = await contractWithSigner.vote(electionId, candidateId);
    const receipt = await tx.wait();
    
    // Extract vote receipt from event
    const event = receipt.events.find(e => e.event === 'VoteCast');
    const voteReceipt = event.args.voteReceipt.toString();
    
    return { ...receipt, voteReceipt };
  }
  
  /**
   * Verify a vote receipt
   * @param {number} electionId - Election ID
   * @param {string} voterAddress - Voter address
   * @param {string} receipt - Vote receipt
   * @returns {Promise<boolean>} Whether the receipt is valid
   */
  async verifyVoteReceipt(electionId, voterAddress, receipt) {
    return await this.contract.verifyVoteReceipt(electionId, voterAddress, receipt);
  }

  /**
 * Finalize an election with enhanced error handling and debugging
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
        
        // Detailed validation with specific error messages
        const now = new Date().getTime();
        if (now < election.endTime) {
          throw new Error('Election has not ended yet');
        }
        if (election.finalized) {
          throw new Error('Election is already finalized');
        }
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
        
        console.log(`Mock election ${electionId} finalized successfully. Winner: Candidate #${winningCandidateId}`);
        
        return {
          transactionHash: receipt.transactionHash,
          winningCandidateId
        };
      }
      
      // Real blockchain implementation with enhanced error handling
      if (!this.signer) {
        throw new Error('Signer not available. Please connect your wallet.');
      }
  
      // Convert electionId to BigNumber
      const electionIdBN = ethers.BigNumber.from(String(electionId));
      console.log(`Attempting to finalize election ${electionIdBN.toString()}`);
      
      // Get election details first to check status
      try {
        const election = await this.contract.getElectionDetails(electionIdBN);
        
        // Log detailed information for debugging
        const now = Math.floor(Date.now() / 1000);
        console.log("Election details:", {
          id: election.id.toNumber(),
          startTime: new Date(election.startTime.toNumber() * 1000),
          endTime: new Date(election.endTime.toNumber() * 1000),
          finalized: election.finalized,
          totalVotes: election.totalVotes.toNumber(),
          currentTime: new Date(now * 1000)
        });
        
        // Check all conditions that might cause the transaction to fail
        if (now <= election.endTime.toNumber()) {
          throw new Error("Election has not ended yet. Please wait until the end time.");
        }
        
        if (election.finalized) {
          throw new Error("Election is already finalized.");
        }
        
        if (election.totalVotes.toNumber() === 0) {
          throw new Error("No votes have been cast in this election. At least one vote is required to finalize.");
        }
        
        // Check if caller is admin
        const callerAddress = await this.signer.getAddress();
        console.log("Caller address:", callerAddress);
        console.log("Election admin:", election.admin);
        
        if (callerAddress.toLowerCase() !== election.admin.toLowerCase() && 
            callerAddress.toLowerCase() !== (await this.contract.owner()).toLowerCase()) {
          throw new Error("Only the election admin or contract owner can finalize this election.");
        }
      } catch (checkError) {
        // If there's an error checking elections details, provide clear error message
        console.error("Error checking election status:", checkError);
        throw new Error(`Election validation failed: ${checkError.message}`);
      }
  
      const contractWithSigner = this.contract.connect(this.signer);
      
      // Try multiple gas configurations
      const gasConfigurations = [
        { gasLimit: 1000000 },                 // Standard high gas limit
        { gasLimit: 500000 },                  // Lower gas limit
        { gasLimit: 2000000 },                 // Very high gas limit
        { gasLimit: 1000000, gasPrice: null }, // Let wallet decide gas price
      ];
      
      // Try each gas configuration
      let lastError = null;
      for (const gasConfig of gasConfigurations) {
        try {
          console.log(`Trying finalization with gas configuration:`, gasConfig);
          
          // Use a different method name if available as fallback
          let tx;
          if (typeof contractWithSigner.finalizeElection === 'function') {
            tx = await contractWithSigner.finalizeElection(electionIdBN, gasConfig);
          } else if (typeof contractWithSigner.completeElection === 'function') {
            tx = await contractWithSigner.completeElection(electionIdBN, gasConfig);
          } else {
            throw new Error("No valid finalization method found on contract");
          }
          
          // Wait for transaction to be mined
          console.log(`Finalization transaction sent: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`Finalization transaction confirmed: ${receipt.transactionHash}`);
          
          // Try to extract winning candidate ID from event logs
          let winningCandidateId = null;
          try {
            const event = receipt.events.find(event => event.event === 'ElectionFinalized');
            if (event && event.args) {
              winningCandidateId = event.args.winningCandidateId.toNumber();
              console.log(`Winning candidate ID: ${winningCandidateId}`);
            }
          } catch (eventError) {
            console.warn("Could not extract winning candidate ID from events:", eventError);
          }
          
          // If winning candidate ID couldn't be extracted, try to calculate it
          if (winningCandidateId === null) {
            try {
              winningCandidateId = await this.getWinningCandidate(electionId);
              console.log(`Calculated winning candidate ID: ${winningCandidateId}`);
            } catch (calcError) {
              console.warn("Could not calculate winning candidate:", calcError);
            }
          }
          
          // Successful transaction
          return {
            transactionHash: receipt.transactionHash,
            winningCandidateId
          };
        } catch (txError) {
          console.warn(`Finalization attempt with gas ${gasConfig.gasLimit} failed:`, txError);
          lastError = txError;
        }
      }
      
      // If all attempts failed, try to use mock mode as fallback in development
      if (process.env.NODE_ENV === 'development') {
        console.warn("All transaction attempts failed. Using mock mode as fallback in development environment.");
        this.useMockMode = true;
        return await this.finalizeElection(electionId);
      }
      
      // If we got here, all attempts failed
      throw lastError || new Error("Failed to finalize election after multiple attempts");
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
}

export default EnhancedBlockchainService;