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
}

export default EnhancedBlockchainService;