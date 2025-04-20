// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title Improved Decentralized Voting System with Enhanced Access Control
 * @dev Implements multi-tier access control, better registration flow, and improved security
 */
contract ImprovedDecentralizedVotingSystem {
    // Role definitions
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN_ROLE");
    bytes32 public constant ELECTION_ADMIN_ROLE = keccak256("ELECTION_ADMIN_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant VOTER_ROLE = keccak256("VOTER_ROLE");

    // Election types
    enum ElectionType { PUBLIC, PRIVATE, ORGANIZATION }
    
    // Election status
    enum ElectionStatus { DRAFT, REGISTRATION, ACTIVE, ENDED, FINALIZED }
    
    // Voter status
    enum VoterStatus { NONE, PENDING, APPROVED, REJECTED, BLACKLISTED }
    
    // Structs
    struct Candidate {
        uint256 id;
        string name;
        string details;
        uint256 voteCount;
        bool isActive;
    }

    struct ElectionInfo {
        uint256 id;
        string title;
        string description;
        uint256 registrationStartTime;
        uint256 votingStartTime;
        uint256 votingEndTime;
        ElectionStatus status;
        ElectionType electionType;
        address admin;
        uint256 candidateCount;
        uint256 totalVotes;
        bytes32 organizationId;
        string metadataURI;  // For IPFS or other metadata storage
    }

    struct VoterRegistration {
        VoterStatus status;
        uint256 registrationTime;
        address approver;
        string verificationData;  // For KYC/verification details
    }

    // State variables
    address public owner;
    uint256 public electionCount;
    
    // Mappings
    mapping(bytes32 => mapping(address => bool)) public roles;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    mapping(uint256 => ElectionInfo) public electionInfo;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => VoterRegistration)) public voterRegistrations;
    mapping(bytes32 => bool) public organizations;
    mapping(uint256 => mapping(address => uint256)) public votingReceipts;  // For vote verification
    
    // Events
    event ElectionCreated(uint256 indexed electionId, string title, ElectionType electionType, address admin);
    event CandidateAdded(uint256 indexed electionId, uint256 candidateId, string name);
    event VoterRegistered(uint256 indexed electionId, address indexed voter, VoterStatus status);
    event VoterStatusUpdated(uint256 indexed electionId, address indexed voter, VoterStatus newStatus, address approver);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 candidateId, uint256 voteReceipt);
    event ElectionStatusChanged(uint256 indexed electionId, ElectionStatus newStatus);
    event ElectionFinalized(uint256 indexed electionId, uint256 winningCandidateId);
    event OrganizationCreated(bytes32 indexed organizationId, string name);
    event RoleGranted(bytes32 indexed role, address indexed account);
    event RoleRevoked(bytes32 indexed role, address indexed account);

    // Modifiers
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "Access denied: role not granted");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(_electionId > 0 && _electionId <= electionCount, "Election does not exist");
        _;
    }

    modifier electionInStatus(uint256 _electionId, ElectionStatus _status) {
        require(electionInfo[_electionId].status == _status, "Election is not in required status");
        _;
    }

    modifier canManageElection(uint256 _electionId) {
        require(
            hasRole(SUPER_ADMIN_ROLE, msg.sender) || 
            msg.sender == electionInfo[_electionId].admin,
            "Not authorized to manage this election"
        );
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
        _grantRole(SUPER_ADMIN_ROLE, msg.sender);
        electionCount = 0;
    }

    /**
     * @dev Check if an account has a specific role
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return roles[role][account];
    }

    /**
     * @dev Grant a role to an account
     */
    function grantRole(bytes32 role, address account) external onlyRole(SUPER_ADMIN_ROLE) {
        _grantRole(role, account);
    }

    /**
     * @dev Revoke a role from an account
     */
    function revokeRole(bytes32 role, address account) external onlyRole(SUPER_ADMIN_ROLE) {
        _revokeRole(role, account);
    }

    /**
     * @dev Internal function to grant a role
     */
    function _grantRole(bytes32 role, address account) internal {
        if (!hasRole(role, account)) {
            roles[role][account] = true;
            emit RoleGranted(role, account);
        }
    }

    /**
     * @dev Internal function to revoke a role
     */
    function _revokeRole(bytes32 role, address account) internal {
        if (hasRole(role, account)) {
            roles[role][account] = false;
            emit RoleRevoked(role, account);
        }
    }

    /**
     * @dev Create a new organization
     */
    function createOrganization(bytes32 _organizationId, string memory _name) 
        external 
        onlyRole(SUPER_ADMIN_ROLE) 
    {
        require(!organizations[_organizationId], "Organization already exists");
        organizations[_organizationId] = true;
        emit OrganizationCreated(_organizationId, _name);
    }

    /**
     * @dev Create a new election with enhanced parameters
     */
    function createElection(
        string memory _title,
        string memory _description,
        uint256 _registrationStartTime,
        uint256 _votingStartTime,
        uint256 _votingEndTime,
        ElectionType _electionType,
        bytes32 _organizationId,
        string memory _metadataURI
    ) external onlyRole(ELECTION_ADMIN_ROLE) returns (uint256) {
        require(_registrationStartTime >= block.timestamp, "Registration start must be in the future");
        require(_votingStartTime > _registrationStartTime, "Voting start must be after registration start");
        require(_votingEndTime > _votingStartTime, "Voting end must be after voting start");
        
        if (_electionType == ElectionType.ORGANIZATION) {
            require(organizations[_organizationId], "Organization does not exist");
        }

        electionCount++;
        uint256 electionId = electionCount;
        
        electionInfo[electionId] = ElectionInfo({
            id: electionId,
            title: _title,
            description: _description,
            registrationStartTime: _registrationStartTime,
            votingStartTime: _votingStartTime,
            votingEndTime: _votingEndTime,
            status: ElectionStatus.DRAFT,
            electionType: _electionType,
            admin: msg.sender,
            candidateCount: 0,
            totalVotes: 0,
            organizationId: _organizationId,
            metadataURI: _metadataURI
        });

        emit ElectionCreated(electionId, _title, _electionType, msg.sender);
        return electionId;
    }

    /**
     * @dev Add a candidate to an election with enhanced checks
     */
    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _details
    ) external electionExists(_electionId) canManageElection(_electionId) returns (uint256) {
        require(electionInfo[_electionId].status == ElectionStatus.DRAFT, "Can only add candidates to draft elections");
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        
        electionInfo[_electionId].candidateCount++;
        uint256 candidateId = electionInfo[_electionId].candidateCount;
        
        candidates[_electionId][candidateId] = Candidate({
            id: candidateId,
            name: _name,
            details: _details,
            voteCount: 0,
            isActive: true
        });

        emit CandidateAdded(_electionId, candidateId, _name);
        return candidateId;
    }

    /**
     * @dev Register a voter for an election
     */
    function registerVoter(
        uint256 _electionId, 
        string memory _verificationData
    ) external electionExists(_electionId) {
        require(
            electionInfo[_electionId].status == ElectionStatus.REGISTRATION || 
            (electionInfo[_electionId].electionType == ElectionType.PUBLIC && electionInfo[_electionId].status == ElectionStatus.ACTIVE),
            "Registration not open"
        );
        
        require(
            voterRegistrations[_electionId][msg.sender].status == VoterStatus.NONE ||
            voterRegistrations[_electionId][msg.sender].status == VoterStatus.REJECTED,
            "Already registered or blacklisted"
        );

        VoterStatus status = electionInfo[_electionId].electionType == ElectionType.PUBLIC ? 
            VoterStatus.APPROVED : VoterStatus.PENDING;

        voterRegistrations[_electionId][msg.sender] = VoterRegistration({
            status: status,
            registrationTime: block.timestamp,
            approver: address(0),
            verificationData: _verificationData
        });

        emit VoterRegistered(_electionId, msg.sender, status);
    }

    /**
     * @dev Approve or reject a voter registration
     */
    function updateVoterStatus(
        uint256 _electionId,
        address _voter,
        VoterStatus _newStatus
    ) external electionExists(_electionId) canManageElection(_electionId) {
        require(
            _newStatus == VoterStatus.APPROVED || 
            _newStatus == VoterStatus.REJECTED || 
            _newStatus == VoterStatus.BLACKLISTED,
            "Invalid status"
        );
        
        require(
            voterRegistrations[_electionId][_voter].status == VoterStatus.PENDING,
            "Can only update pending registrations"
        );

        voterRegistrations[_electionId][_voter].status = _newStatus;
        voterRegistrations[_electionId][_voter].approver = msg.sender;

        emit VoterStatusUpdated(_electionId, _voter, _newStatus, msg.sender);
    }

    /**
     * @dev Bulk approve voters
     */
    function bulkApproveVoters(
        uint256 _electionId,
        address[] memory _voters
    ) external electionExists(_electionId) canManageElection(_electionId) {
        for (uint i = 0; i < _voters.length; i++) {
            if (voterRegistrations[_electionId][_voters[i]].status == VoterStatus.PENDING) {
                voterRegistrations[_electionId][_voters[i]].status = VoterStatus.APPROVED;
                voterRegistrations[_electionId][_voters[i]].approver = msg.sender;
                emit VoterStatusUpdated(_electionId, _voters[i], VoterStatus.APPROVED, msg.sender);
            }
        }
    }

    /**
     * @dev Update election status
     */
    function updateElectionStatus(
        uint256 _electionId,
        ElectionStatus _newStatus
    ) external electionExists(_electionId) canManageElection(_electionId) {
        ElectionInfo storage election = electionInfo[_electionId];
        
        // Validate status transitions
        if (_newStatus == ElectionStatus.REGISTRATION) {
            require(election.status == ElectionStatus.DRAFT, "Can only move to registration from draft");
            require(election.candidateCount > 0, "Must have at least one candidate");
        } else if (_newStatus == ElectionStatus.ACTIVE) {
            require(election.status == ElectionStatus.REGISTRATION, "Can only move to active from registration");
            require(block.timestamp >= election.votingStartTime, "Voting period has not started");
        } else if (_newStatus == ElectionStatus.ENDED) {
            require(election.status == ElectionStatus.ACTIVE, "Can only end active elections");
            require(block.timestamp >= election.votingEndTime, "Voting period has not ended");
        }
        
        election.status = _newStatus;
        emit ElectionStatusChanged(_electionId, _newStatus);
    }

    /**
     * @dev Cast a vote with enhanced validation
     */
    function vote(uint256 _electionId, uint256 _candidateId) 
        external 
        electionExists(_electionId) 
        electionInStatus(_electionId, ElectionStatus.ACTIVE) 
    {
        ElectionInfo storage election = electionInfo[_electionId];
        
        require(block.timestamp >= election.votingStartTime && block.timestamp <= election.votingEndTime, "Outside voting period");
        require(!hasVoted[_electionId][msg.sender], "Already voted");
        require(_candidateId > 0 && _candidateId <= election.candidateCount, "Invalid candidate");
        require(candidates[_electionId][_candidateId].isActive, "Candidate is not active");
        
        // Check voter eligibility
        require(
            election.electionType == ElectionType.PUBLIC || 
            voterRegistrations[_electionId][msg.sender].status == VoterStatus.APPROVED,
            "Not eligible to vote"
        );
        
        hasVoted[_electionId][msg.sender] = true;
        candidates[_electionId][_candidateId].voteCount++;
        election.totalVotes++;
        
        // Generate vote receipt for verification
        uint256 voteReceipt = uint256(keccak256(abi.encodePacked(_electionId, msg.sender, _candidateId, block.timestamp)));
        votingReceipts[_electionId][msg.sender] = voteReceipt;
        
        emit VoteCast(_electionId, msg.sender, _candidateId, voteReceipt);
    }

    /**
     * @dev Finalize an election with enhanced validation
     */
    function finalizeElection(uint256 _electionId) 
        external 
        electionExists(_electionId) 
        canManageElection(_electionId) 
        electionInStatus(_electionId, ElectionStatus.ENDED) 
    {
        ElectionInfo storage election = electionInfo[_electionId];
        
        uint256 winningCandidateId = 0;
        uint256 maxVotes = 0;
        
        for (uint256 i = 1; i <= election.candidateCount; i++) {
            if (candidates[_electionId][i].voteCount > maxVotes) {
                maxVotes = candidates[_electionId][i].voteCount;
                winningCandidateId = i;
            }
        }
        
        election.status = ElectionStatus.FINALIZED;
        emit ElectionFinalized(_electionId, winningCandidateId);
    }

    /**
     * @dev Get voter registration details
     */
    function getVoterRegistration(uint256 _electionId, address _voter) 
        external 
        view 
        electionExists(_electionId) 
        returns (VoterRegistration memory) 
    {
        return voterRegistrations[_electionId][_voter];
    }

    /**
     * @dev Get election details with enhanced information
     */
    function getElectionDetails(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (
            uint256 id,
            string memory title,
            string memory description,
            uint256 registrationStartTime,
            uint256 votingStartTime,
            uint256 votingEndTime,
            ElectionStatus status,
            ElectionType electionType,
            address admin,
            uint256 candidateCount,
            uint256 totalVotes,
            bytes32 organizationId,
            string memory metadataURI
        )
    {
        ElectionInfo storage election = electionInfo[_electionId];
        return (
            election.id,
            election.title,
            election.description,
            election.registrationStartTime,
            election.votingStartTime,
            election.votingEndTime,
            election.status,
            election.electionType,
            election.admin,
            election.candidateCount,
            election.totalVotes,
            election.organizationId,
            election.metadataURI
        );
    }

    /**
     * @dev Verify a vote receipt
     */
    function verifyVoteReceipt(uint256 _electionId, address _voter, uint256 _receipt) 
        external 
        view 
        electionExists(_electionId) 
        returns (bool) 
    {
        return votingReceipts[_electionId][_voter] == _receipt;
    }
}