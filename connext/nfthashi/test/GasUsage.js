const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { serialize } = require("@ethersproject/transactions");

describe("Tests for gas measurements", function () {
    const NON_ZERO_BYTE_ADDR = "0x1111111111111111111111111111111111111111";
    const NON_ZERO_BYTE_UINT256 = "0x1111111111111111111111111111111111111111111111111111111111111111";
    const NON_ZERO_BYTE_UINT32 = "0x11111111";
    async function getL1EstimatedGasCost(rawTx, user) {
      rawTx = await user.populateTransaction(rawTx);
      let bytes = serialize({
        data: rawTx.data,
        to: rawTx.to,
        gasPrice: rawTx.gasPrice,
        type: rawTx.type,
        gasLimit: rawTx.gasLimit,
        nonce: 0xffffffff,
      });
  
      return bytes;
    }

    it("Wrapping cycle of PegNFT", async function () { // FIXME npx hardhat test --grep "Wrapping cycle of PegNFT"
        const [owner, user, remoteUser] = await ethers.getSigners();
        const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
        const NON_NULL_BYTES32 = '0x1111111111111111111111111111111111111111111111111111111111111111';

        const Hashi721BridgeFactory = await ethers.getContractFactory("Hashi721Bridge");
        const FaucetHashi721Factory = await ethers.getContractFactory("FaucetHashi721");
        const WrappedHashi721Factory = await ethers.getContractFactory("WrappedHashi721");
        const ConnextHelperFactory = await ethers.getContractFactory("ConnextHelper");

        const localBridge = await Hashi721BridgeFactory.connect(owner).deploy();
        const remoteBridge = await Hashi721BridgeFactory.connect(owner).deploy();
        const wrappedHashi721 = await WrappedHashi721Factory.connect(owner).deploy();
        const faucetHashi721 = await FaucetHashi721Factory.connect(owner).deploy("");
        const connextHelper = await ConnextHelperFactory.connect(owner).deploy();

        await localBridge.connect(owner).initialize(connextHelper.address, ZERO_ADDRESS);
        await localBridge.connect(owner).setBridge(999, remoteBridge.address);

        await remoteBridge.connect(owner).initialize(connextHelper.address, localBridge.address);
        await remoteBridge.connect(owner).setBridge(500, localBridge.address);
        await remoteBridge.connect(owner).setBridge(500, localBridge.address);

        const remoteBridgeSigner = await ethers.getImpersonatedSigner(remoteBridge.address);
        await setBalance(remoteBridge.address, 100n ** 18n);
        await wrappedHashi721.connect(owner).initialize();
        await wrappedHashi721.connect(owner).transferOwnership(remoteBridge.address);

        const connextHelperSigner = await ethers.getImpersonatedSigner(connextHelper.address);
        await setBalance(connextHelper.address, 100n ** 18n);

        await faucetHashi721.connect(user).mint();
        await faucetHashi721.connect(user).approve(localBridge.address, 0);

        // Local->Remote
        await localBridge.connect(user).xCall(999, 10000, 10000, faucetHashi721.address, remoteUser.address, 0, true);
        const messageToRemote = remoteBridge._encodeCallData(999, wrappedHashi721.address, remoteUser.address, 0, "");
        await remoteBridge.connect(connextHelperSigner).xReceive(NON_NULL_BYTES32, 0, ZERO_ADDRESS, localBridge.address, 500, messageToRemote);
        expect(await wrappedHashi721.ownerOf(0)).to.equal(remoteUser.address);

        // maybe it is 2 different test case becasue burn/mint vs only transfer
        // Remote->Local
        await remoteBridge.setForWrapper(wrappedHashi721.address, 500, faucetHashi721.address);
        await remoteBridge.connect(remoteUser).xCall(500, 10000, 10000, wrappedHashi721.address, user.address, 0, true);
        const messageToLocal = localBridge._encodeCallData(1, faucetHashi721.address, user.address, 0, "");
        await localBridge.connect(connextHelperSigner).xReceive(NON_NULL_BYTES32, 0, ZERO_ADDRESS, remoteBridge.address, 999, messageToLocal);

        const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
        const optimismGasHelper = await OptimismGasHelperFactory.connect(owner).deploy(30_000_000_000);

        // L1 gas estimation for L2 functions
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        console.log("L1 gas estimation for L2 functions");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        let rawTx = await remoteBridge.connect(user).populateTransaction.xCall(NON_ZERO_BYTE_UINT32, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, true);
        let bytes = await getL1EstimatedGasCost(rawTx, user);
    
        let estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> remoteBridge.xCall L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await remoteBridge.connect(connextHelperSigner).populateTransaction.xReceive(NON_NULL_BYTES32, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT32, messageToRemote);
        bytes = await getL1EstimatedGasCost(rawTx, connextHelperSigner);
    
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> remoteBridge.xReceive L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);
    
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await localBridge.connect(connextHelperSigner).populateTransaction.xReceive(NON_NULL_BYTES32, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT32, messageToRemote);
        bytes = await getL1EstimatedGasCost(rawTx, connextHelperSigner);
    
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> localBridge.xReceive L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);
    
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await localBridge.connect(user).populateTransaction.xCall(NON_ZERO_BYTE_UINT32, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, true);
        bytes = await getL1EstimatedGasCost(rawTx, user);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> localBridge.xCall L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);
    
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    });
});