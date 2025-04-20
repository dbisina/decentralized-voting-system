const DecentralizedVotingSystem = artifacts.require("DecentralizedVotingSystem");

module.exports = function(deployer) {
  deployer.deploy(DecentralizedVotingSystem);
};