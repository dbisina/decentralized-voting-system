const DecentralizedVotingSystem = artifacts.require("DecentralizedVotingSystem");

module.exports = async function(deployer, network, accounts) {
  console.log(`Deploying contracts to ${network} network...`);
  
  // Deploy the main voting contract
  await deployer.deploy(DecentralizedVotingSystem);
  const votingSystem = await DecentralizedVotingSystem.deployed();
  
  console.log(`Decentralized Voting System deployed at: ${votingSystem.address}`);
  
  // If on a testnet, create some sample data for testing
  if (network === 'development' || network === 'goerli' || network === 'mumbai') {
    console.log("Setting up test data...");
    
    const admin = accounts[0];
    console.log(`Using admin account: ${admin}`);
    
    // Calculate timestamps for election periods
    const now = Math.floor(Date.now() / 1000);
    const oneDay = 86400; // seconds in a day
    
    // Create a sample active election
    const activeElectionStart = now - oneDay; // Started yesterday
    const activeElectionEnd = now + (oneDay * 3); // Ends in 3 days
    
    console.log("Creating sample active election...");
    const activeElection = await votingSystem.createElection(
      "Student Council President",
      "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX", // IPFS hash for details
      activeElectionStart,
      activeElectionEnd,
      { from: admin }
    );
    
    const activeElectionId = activeElection.logs[0].args.electionId.toNumber();
    console.log(`Created active election with ID: ${activeElectionId}`);
    
    // Add candidates to the active election
    await votingSystem.addCandidate(
      activeElectionId,
      "Alex Johnson",
      "QmUbE6LyM4qs8Q8GC3JHKvLKUFP9yLKhcZ1KxGQRhKaTK6", // IPFS hash for candidate details
      { from: admin }
    );
    
    await votingSystem.addCandidate(
      activeElectionId,
      "Taylor Morgan",
      "QmNZw7yscUjMLYMKG1SHMzPvQdyBgDNUri1kTfUWvJeHTw",
      { from: admin }
    );
    
    await votingSystem.addCandidate(
      activeElectionId,
      "Jordan Smith",
      "QmTt5Z2D4RjGvnuFNbFpWLhCKYj1QxLrUPWZDsNLSUuGKA",
      { from: admin }
    );
    
    // Create a sample upcoming election
    const upcomingElectionStart = now + (oneDay * 2); // Starts in 2 days
    const upcomingElectionEnd = now + (oneDay * 9); // Ends in 9 days
    
    console.log("Creating sample upcoming election...");
    const upcomingElection = await votingSystem.createElection(
      "Community Development Proposal",
      "QmVZ1Wj4oHqyFNYT6VmxhEUhSjzrsZdDqoHSLkeGihQQZA",
      upcomingElectionStart,
      upcomingElectionEnd,
      { from: admin }
    );
    
    const upcomingElectionId = upcomingElection.logs[0].args.electionId.toNumber();
    console.log(`Created upcoming election with ID: ${upcomingElectionId}`);
    
    // Add candidates to the upcoming election
    await votingSystem.addCandidate(
      upcomingElectionId,
      "Proposal A: Community Garden",
      "QmR9vLw7SnQx4XrJVNrGwDUVFrL3ZLXNpmdAUHJrFThJY7",
      { from: admin }
    );
    
    await votingSystem.addCandidate(
      upcomingElectionId,
      "Proposal B: Public Library Expansion",
      "QmXHLkjyQPvL7GbEGHnMgY1PLjQJwhwzkLQrSSVbQNsZXb",
      { from: admin }
    );
    
    await votingSystem.addCandidate(
      upcomingElectionId,
      "Proposal C: Youth Center Renovation",
      "QmZkKyUqPwnKzBYwvE8ksGkNKQpKrHGvAFQRVK9fYcpHa5",
      { from: admin }
    );
    
    console.log("Sample data setup complete!");
  }
};