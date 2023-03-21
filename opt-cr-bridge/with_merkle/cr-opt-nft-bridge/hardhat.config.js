/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.18",
  gasReporter: {
    enabled: true 
  },
  settings: {
    optimizer: {
      enabled: true,
    }
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    }
  }
};
