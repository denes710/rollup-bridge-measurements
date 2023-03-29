/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  gasReporter: {
    enabled: true 
  },
  mocha: {
    timeout: 100000000
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    }
  }
};
