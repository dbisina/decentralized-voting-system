const DecentralizedVotingSystem = artifacts.require("DecentralizedVotingSystem");
const { time } = require('@openzeppelin/test-helpers');
const truffleAssert = require('truffle-assertions');

contract("DecentralizedVotingSystem", accounts => {
  let votingSystem;
  
  const owner = accounts[0];
  const admin = accounts[1];
  const voter1 = accounts[2];
  const voter2 = accounts[3];
  const voter3 = accounts[4];
  
  // Election parameters
  const title = "Test Election";
  const description = "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX"; // IPFS hash
  
  // Get current timestamp
  let now;
  
  before(async () => {
    votingSystem = await DecentralizedVotingSystem.deployed();
    now = parseInt(await time.latest());
  });
  
  describe("Admin Management", () => {
    it("should set the contract deployer as the owner", async () => {
      const contractOwner = await votingSystem.owner();
      assert.equal(contractOwner, owner, "Contract owner should be set to deployer");
    });
    
    it("should allow the owner to add a new admin", async () => {
      await votingSystem.addAdmin(admin, { from: owner });
      const isAdmin = await votingSystem.admins(admin);
      assert.equal(isAdmin, true, "Admin should be added successfully");
    });
    
    it("should prevent non-owners from adding admins", async () => {
      await truffleAssert.reverts(
        votingSystem.addAdmin(voter1, { from: admin }),
        "Only owner can call this function"
      );
    });
    
    it("should allow the owner to remove an admin", async () => {
      await votingSystem.removeAdmin(admin, { from: owner });
      const isAdmin = await votingSystem.admins(admin);
      assert.equal(isAdmin, false, "Admin should be removed successfully");
      
      // Add the admin back for subsequent tests
      await votingSystem.addAdmin(admin, { from: owner });
    });
  });
  
  describe("Election Creation", () => {
    it("should allow an admin to create an election", async () => {
      const startTime = now + 100; // Start in 100 seconds
      const endTime = now + 86400; // End in 1 day
      
      const tx = await votingSystem.createElection(
        title,
        description,
        startTime,
        endTime,
        { from: admin }
      );
      
      truffleAssert.eventEmitted(tx, 'ElectionCreated', (ev) => {
        return ev.electionId.toNumber() === 1 && ev.title === title && ev.admin === admin;
      });
      
      const electionCount = await votingSystem.electionCount();
      assert.equal(electionCount, 1, "Election count should be incremented");
      
      const election = await votingSystem.getElectionDetails(1);
      assert.equal(election.title, title, "Election title should match");
      assert.equal(election.description, description, "Election description should match");
      assert.equal(election.startTime, startTime, "Election start time should match");
      assert.equal(election.endTime, endTime, "Election end time should match");
      assert.equal(election.finalized, false, "Election should not be finalized");
      assert.equal(election.admin, admin, "Election admin should match");
    });
    
    it("should prevent creation of elections with invalid time parameters", async () => {
      // End time before start time
      await truffleAssert.reverts(
        votingSystem.createElection(
          "Invalid Election",
          description,
          now + 200,
          now + 100,
          { from: admin }
        ),
        "End time must be after start time"
      );
      
      // Start time in the past
      await truffleAssert.reverts(
        votingSystem.createElection(
          "Invalid Election",
          description,
          now - 100,
          now + 100,
          { from: admin }
        ),
        "Start time must be in the future"
      );
    });
  });
  
  describe("Candidate Management", () => {
    let electionId;
    
    before(async () => {
      const startTime = now + 500; // Start in 500 seconds
      const endTime = now + 86500; // End in ~1 day
      
      const tx = await votingSystem.createElection(
        "Election for Candidates",
        description,
        startTime,
        endTime,
        { from: admin }
      );
      
      electionId = tx.logs[0].args.electionId.toNumber();
    });
    
    it("should allow the election admin to add candidates", async () => {
      const candidateName = "Candidate 1";
      const candidateDetails = "QmUbE6LyM4qs8Q8GC3JHKvLKUFP9yLKhcZ1KxGQRhKaTK6";
      
      const tx = await votingSystem.addCandidate(
        electionId,
        candidateName,
        candidateDetails,
        { from: admin }
      );
      
      truffleAssert.eventEmitted(tx, 'CandidateAdded', (ev) => {
        return ev.electionId.toNumber() === electionId && 
               ev.candidateId.toNumber() === 1 && 
               ev.name === candidateName;
      });
      
      const candidate = await votingSystem.getCandidate(electionId, 1);
      assert.equal(candidate.name, candidateName, "Candidate name should match");
      assert.equal(candidate.details, candidateDetails, "Candidate details should match");
      assert.equal(candidate.voteCount, 0, "Candidate vote count should be zero");
    });
    
    it("should prevent non-admins from adding candidates", async () => {
      await truffleAssert.reverts(
        votingSystem.addCandidate(
          electionId,
          "Invalid Candidate",
          "QmInvalid",
          { from: voter1 }
        ),
        "Only election admin can call this function"
      );
    });
  });
  
  describe("Voting Process", () => {
    let electionId;
    
    before(async () => {
      // Create an election that starts immediately
      const startTime = now;
      const endTime = now + 86400; // End in 1 day
      
      const tx = await votingSystem.createElection(
        "Active Voting Election",
        description,
        startTime,
        endTime,
        { from: admin }
      );
      
      electionId = tx.logs[0].args.electionId.toNumber();
      
      // Add candidates
      await votingSystem.addCandidate(
        electionId,
        "Candidate A",
        "QmCandidateA",
        { from: admin }
      );
      
      await votingSystem.addCandidate(
        electionId,
        "Candidate B",
        "QmCandidateB",
        { from: admin }
      );
      
      // Advance time to start the election
      await time.increase(10);
    });
    
    it("should allow voters to cast votes", async () => {
      const candidateId = 1;
      
      const tx = await votingSystem.vote(electionId, candidateId, { from: voter1 });
      
      truffleAssert.eventEmitted(tx, 'VoteCast', (ev) => {
        return ev.electionId.toNumber() === electionId && 
               ev.voter === voter1 && 
               ev.candidateId.toNumber() === candidateId;
      });
      
      const hasVoted = await votingSystem.hasVoted(electionId, voter1);
      assert.equal(hasVoted, true, "Voter should be marked as having voted");
      
      const candidate = await votingSystem.getCandidate(electionId, candidateId);
      assert.equal(candidate.voteCount, 1, "Candidate vote count should be incremented");
    });
    
    it("should prevent voters from voting twice", async () => {
      await truffleAssert.reverts(
        votingSystem.vote(electionId, 2, { from: voter1 }),
        "You have already voted in this election"
      );
    });
    
    it("should prevent voting for non-existent candidates", async () => {
      await truffleAssert.reverts(
        votingSystem.vote(electionId, 99, { from: voter2 }),
        "Invalid candidate"
      );
    });
    
    it("should count votes correctly for multiple voters", async () => {
      // Voter 2 votes for candidate 2
      await votingSystem.vote(electionId, 2, { from: voter2 });
      
      // Voter 3 votes for candidate 2
      await votingSystem.vote(electionId, 2, { from: voter3 });
      
      const candidate1 = await votingSystem.getCandidate(electionId, 1);
      const candidate2 = await votingSystem.getCandidate(electionId, 2);
      
      assert.equal(candidate1.voteCount, 1, "Candidate 1 should have 1 vote");
      assert.equal(candidate2.voteCount, 2, "Candidate 2 should have 2 votes");
      
      const election = await votingSystem.getElectionDetails(electionId);
      assert.equal(election.totalVotes, 3, "Total votes should be 3");
    });
  });
  
  describe("Election Finalization", () => {
    let electionId;
    
    before(async () => {
      // Create an election that starts immediately
      const startTime = now;
      const endTime = now + 100; // End in 100 seconds
      
      const tx = await votingSystem.createElection(
        "Finalizable Election",
        description,
        startTime,
        endTime,
        { from: admin }
      );
      
      electionId = tx.logs[0].args.electionId.toNumber();
      
      // Add candidates
      await votingSystem.addCandidate(
        electionId,
        "Candidate X",
        "QmCandidateX",
        { from: admin }
      );
      
      await votingSystem.addCandidate(
        electionId,
        "Candidate Y",
        "QmCandidateY",
        { from: admin }
      );
      
      // Cast some votes
      await votingSystem.vote(electionId, 1, { from: voter1 });
      await votingSystem.vote(electionId, 2, { from: voter2 });
      await votingSystem.vote(electionId, 2, { from: voter3 });
      
      // Advance time to end the election
      await time.increase(200);
    });
    
    it("should correctly identify the winning candidate", async () => {
      const winningCandidateId = await votingSystem.getWinningCandidate(electionId);
      assert.equal(winningCandidateId, 2, "Candidate 2 should be the winner");
    });
    
    it("should allow the admin to finalize the election", async () => {
      const tx = await votingSystem.finalizeElection(electionId, { from: admin });
      
      truffleAssert.eventEmitted(tx, 'ElectionFinalized', (ev) => {
        return ev.electionId.toNumber() === electionId && 
               ev.winningCandidateId.toNumber() === 2;
      });
      
      const election = await votingSystem.getElectionDetails(electionId);
      assert.equal(election.finalized, true, "Election should be marked as finalized");
    });
    
    it("should prevent voting in finalized elections", async () => {
      const voter4 = accounts[5];
      
      await truffleAssert.reverts(
        votingSystem.vote(electionId, 1, { from: voter4 }),
        "Election is not active"
      );
    });
    
    it("should prevent finalizing an election multiple times", async () => {
      await truffleAssert.reverts(
        votingSystem.finalizeElection(electionId, { from: admin }),
        "Election is already finalized"
      );
    });
  });
});