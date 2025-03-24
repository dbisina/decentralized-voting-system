// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title Decentralized Voting System
 * @dev Implements a secure, transparent voting system on the blockchain
 */
contract DecentralizedVotingSystem {
    // Structs
    struct Candidate {
        uint256 id;
        string name;
        string details;    // IPFS hash for candidate details
        uint256 voteCount;
    }

    struct Election {
        uint256 id;
        string title;
        string description; // IPFS hash for election details
        uint256 startTime;
        uint256 endTime;
        bool finalized;
        address admin;
        mapping(uint256 => Candidate) candidates;
        uint256 candidateCount;
        mapping(address => bool) hasVoted;
        uint256 totalVotes;
    }

    // State variables
    address public owner;
    uint256 public electionCount;
    mapping(uint256 => Election) public elections;
    mapping(address => bool) public admins;
    
    // Events
    event ElectionCreated(uint256 indexed electionId, string title, address admin);
    event CandidateAdded(uint256 indexed electionId, uint256 candidateId, string name);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 candidateId);
    event ElectionFinalized(uint256 indexed electionId, uint256 winningCandidateId);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Only admin can call this function");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(_electionId > 0 && _electionId <= electionCount, "Election does not exist");
        _;
    }

    modifier electionAdmin(uint256 _electionId) {
        require(
            elections[_electionId].admin == msg.sender || msg.sender == owner,
            "Only election admin can call this function"
        );
        _;
    }

    modifier electionActive(uint256 _electionId) {
        require(
            block.timestamp >= elections[_electionId].startTime && 
            block.timestamp <= elections[_electionId].endTime,
            "Election is not active"
        );
        _;
    }

    modifier electionNotFinalized(uint256 _electionId) {
        require(!elections[_electionId].finalized, "Election is already finalized");
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
        electionCount = 0;
    }

    /**
     * @dev Add a new admin
     * @param _admin Address of the new admin
     */
    function addAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid address");
        admins[_admin] = true;
    }

    /**
     * @dev Remove an admin
     * @param _admin Address of the admin to remove
     */
    function removeAdmin(address _admin) external onlyOwner {
        require(_admin != owner, "Cannot remove owner as admin");
        admins[_admin] = false;
    }

    /**
     * @dev Create a new election
     * @param _title Title of the election
     * @param _description IPFS hash containing election details
     * @param _startTime Start time of the election (Unix timestamp)
     * @param _endTime End time of the election (Unix timestamp)
     * @return electionId ID of the newly created election
     */
    function createElection(
        string memory _title,
        string memory _description,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyAdmin returns (uint256) {
        require(_startTime >= block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");

        electionCount++;
        uint256 electionId = electionCount;
        
        Election storage newElection = elections[electionId];
        newElection.id = electionId;
        newElection.title = _title;
        newElection.description = _description;
        newElection.startTime = _startTime;
        newElection.endTime = _endTime;
        newElection.finalized = false;
        newElection.admin = msg.sender;
        newElection.candidateCount = 0;
        newElection.totalVotes = 0;

        emit ElectionCreated(electionId, _title, msg.sender);
        return electionId;
    }

    /**
     * @dev Add a candidate to an election
     * @param _electionId ID of the election
     * @param _name Name of the candidate
     * @param _details IPFS hash containing candidate details
     * @return candidateId ID of the newly added candidate
     */
    function addCandidate(
        uint256 _electionId,
        string memory _name,
        string memory _details
    ) 
        external 
        electionExists(_electionId)
        electionAdmin(_electionId)
        electionNotFinalized(_electionId)
        returns (uint256)
    {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        
        Election storage election = elections[_electionId];
        require(block.timestamp < election.startTime, "Cannot add candidate after election has started");
        
        election.candidateCount++;
        uint256 candidateId = election.candidateCount;
        
        Candidate storage newCandidate = election.candidates[candidateId];
        newCandidate.id = candidateId;
        newCandidate.name = _name;
        newCandidate.details = _details;
        newCandidate.voteCount = 0;

        emit CandidateAdded(_electionId, candidateId, _name);
        return candidateId;
    }

    /**
     * @dev Cast a vote in an election
     * @param _electionId ID of the election
     * @param _candidateId ID of the candidate
     */
    function vote(uint256 _electionId, uint256 _candidateId) 
        external 
        electionExists(_electionId)
        electionActive(_electionId)
        electionNotFinalized(_electionId)
    {
        Election storage election = elections[_electionId];
        
        require(!election.hasVoted[msg.sender], "You have already voted in this election");
        require(_candidateId > 0 && _candidateId <= election.candidateCount, "Invalid candidate");
        
        election.hasVoted[msg.sender] = true;
        election.candidates[_candidateId].voteCount++;
        election.totalVotes++;
        
        emit VoteCast(_electionId, msg.sender, _candidateId);
    }

    /**
     * @dev Finalize an election after it has ended
     * @param _electionId ID of the election
     * @return winningCandidateId ID of the winning candidate
     */
    function finalizeElection(uint256 _electionId) 
        external 
        electionExists(_electionId)
        electionAdmin(_electionId)
        electionNotFinalized(_electionId)
        returns (uint256)
    {
        Election storage election = elections[_electionId];
        require(block.timestamp > election.endTime, "Election has not ended yet");
        
        uint256 winningCandidateId = getWinningCandidate(_electionId);
        election.finalized = true;
        
        emit ElectionFinalized(_electionId, winningCandidateId);
        return winningCandidateId;
    }

    /**
     * @dev Get candidate details
     * @param _electionId ID of the election
     * @param _candidateId ID of the candidate
     * @return id Candidate ID
     * @return name Candidate name
     * @return details Candidate details (IPFS hash)
     * @return voteCount Number of votes received
     */
    function getCandidate(uint256 _electionId, uint256 _candidateId)
        external
        view
        electionExists(_electionId)
        returns (uint256 id, string memory name, string memory details, uint256 voteCount)
    {
        require(_candidateId > 0 && _candidateId <= elections[_electionId].candidateCount, "Invalid candidate");
        
        Candidate storage candidate = elections[_electionId].candidates[_candidateId];
        return (candidate.id, candidate.name, candidate.details, candidate.voteCount);
    }

    /**
     * @dev Get election details
     * @param _electionId ID of the election
     * @return id Election ID
     * @return title Election title
     * @return description Election description (IPFS hash)
     * @return startTime Start time of the election
     * @return endTime End time of the election
     * @return finalized Whether the election is finalized
     * @return admin Admin address
     * @return candidateCount Number of candidates
     * @return totalVotes Total number of votes cast
     */
    function getElectionDetails(uint256 _electionId)
        external
        view
        electionExists(_electionId)
        returns (
            uint256 id,
            string memory title,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            bool finalized,
            address admin,
            uint256 candidateCount,
            uint256 totalVotes
        )
    {
        Election storage election = elections[_electionId];
        return (
            election.id,
            election.title,
            election.description,
            election.startTime,
            election.endTime,
            election.finalized,
            election.admin,
            election.candidateCount,
            election.totalVotes
        );
    }

    /**
     * @dev Check if an address has voted in an election
     * @param _electionId ID of the election
     * @param _voter Address of the voter
     * @return True if the address has voted, false otherwise
     */
    function hasVoted(uint256 _electionId, address _voter)
        external
        view
        electionExists(_electionId)
        returns (bool)
    {
        return elections[_electionId].hasVoted[_voter];
    }

    /**
     * @dev Get the winning candidate ID for an election
     * @param _electionId ID of the election
     * @return winningCandidateId ID of the winning candidate
     */
    function getWinningCandidate(uint256 _electionId)
        public
        view
        electionExists(_electionId)
        returns (uint256 winningCandidateId)
    {
        Election storage election = elections[_electionId];
        uint256 winningVoteCount = 0;
        
        for (uint256 i = 1; i <= election.candidateCount; i++) {
            if (election.candidates[i].voteCount > winningVoteCount) {
                winningVoteCount = election.candidates[i].voteCount;
                winningCandidateId = i;
            }
        }
        
        require(winningCandidateId > 0, "No votes cast in this election");
        return winningCandidateId;
    }
}