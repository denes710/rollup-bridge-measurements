const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { serialize } = require("@ethersproject/transactions");

describe("Tests for gas measurements", function () {
    const NON_ZERO_BYTE_ADDR = "0x1111111111111111111111111111111111111111";
    const NON_ZERO_BYTE_UINT256 = "0x1111111111111111111111111111111111111111111111111111111111111111";
    const NON_ZERO_BYTE_UINT32 = "0x11111111";
    const NON_ZERO_BYTE_UINT64 = "0x1111111111111111";
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
    it("Wrapping cycle of MCNNFT", async function () {
        const [owner, user, remoteUser] = await ethers.getSigners();
    
        const MCNNFTFactory = await ethers.getContractFactory("MCNNFT");
        const MinimalMessageBusFactory = await ethers.getContractFactory("MinimalMessageBus");
        const NFTBridgeFactory = await ethers.getContractFactory("NFTBridge");
    
        const minimalMessageBus = await MinimalMessageBusFactory.deploy();
        const localNftBridge = await NFTBridgeFactory.connect(owner).deploy(minimalMessageBus.address);
        const remoteNftBridge = await NFTBridgeFactory.connect(owner).deploy(minimalMessageBus.address);
        const localMcnNFT = await MCNNFTFactory.connect(owner).deploy("Local MCN", "LMC", localNftBridge.address);
        const remoteMcnNFT = await MCNNFTFactory.connect(owner).deploy("Remote MCN", "RMC", remoteNftBridge.address);
    
        // remote chain id == 999
        await localNftBridge.connect(owner).setDestBridge(999, remoteMcnNFT.address);
        await localNftBridge.connect(owner).setDestNFT(localMcnNFT.address, 999, remoteMcnNFT.address);
    
        // local chain id == 500
        await remoteNftBridge.connect(owner).setDestBridge(500, localMcnNFT.address);
        await remoteNftBridge.connect(owner).setDestNFT(remoteMcnNFT.address, 500, localMcnNFT.address);
    
        // settings of messenger
        const minimalMessageBusSigner = await ethers.getImpersonatedSigner(minimalMessageBus.address);
        await setBalance(minimalMessageBus.address, 100n ** 18n);
    
        // mint a nft in local
        await localMcnNFT.connect(owner).mint(user.address, 1, "");
    
        // wrapping
        await localMcnNFT.connect(user)["crossChain(uint64,uint256,address)"](999, 1, remoteUser.address, {value: 10100000});
        const messageToRemote = minimalMessageBus.getEncodedData(remoteUser.address, remoteMcnNFT.address, 1, "");
        await remoteNftBridge.connect(minimalMessageBusSigner).executeMessage(localMcnNFT.address, 500, messageToRemote, minimalMessageBus.address);
    
        // unwrapping
        await remoteMcnNFT.connect(remoteUser)["crossChain(uint64,uint256,address)"](500, 1, user.address, {value: 10100000});
        const messageToLocal = minimalMessageBus.getEncodedData(user.address, localMcnNFT.address, 1, "");
        await localNftBridge.connect(minimalMessageBusSigner).executeMessage(remoteMcnNFT.address, 999, messageToLocal, minimalMessageBus.address);

        // L1 gas estimation for L2 functions
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        console.log("L1 gas estimation for L2 functions");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
        const optimismGasHelper = await OptimismGasHelperFactory.connect(owner).deploy(30_000_000_000);

        let rawTx = await localMcnNFT.connect(user).populateTransaction["crossChain(uint64,uint256,address)"](NON_ZERO_BYTE_UINT64, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, {value: 10100000});
        let bytes = await getL1EstimatedGasCost(rawTx, user);
        let estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> localMcnNFT.crossChain L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        rawTx = await remoteMcnNFT.connect(user).populateTransaction["crossChain(uint64,uint256,address)"](NON_ZERO_BYTE_UINT64, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, {value: 10100000});
        bytes = await getL1EstimatedGasCost(rawTx, user);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> remoteMcnNFT.crossChain L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        rawTx = await localNftBridge.connect(minimalMessageBusSigner).populateTransaction.executeMessage(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT64, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR);
        bytes = await getL1EstimatedGasCost(rawTx, minimalMessageBusSigner);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> localNftBridge.executeMessage L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        rawTx = await remoteNftBridge.connect(minimalMessageBusSigner).populateTransaction.executeMessage(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT64, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR);
        bytes = await getL1EstimatedGasCost(rawTx, minimalMessageBusSigner);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> remoteNftBridge.executeMessage L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

    });
    it("Wrapping cycle of PegNFT", async function () { // FIXME npx hardhat test --grep "Wrapping cycle of PegNFT"
        const [owner, user, remoteUser] = await ethers.getSigners();

        const PegNFTFactory = await ethers.getContractFactory("PegNFT");
        const SimpleNFTFactory = await ethers.getContractFactory("SimpleNFT");
        const MinimalMessageBusFactory = await ethers.getContractFactory("MinimalMessageBus");
        const NFTBridgeFactory = await ethers.getContractFactory("NFTBridge");

        const minimalMessageBus = await MinimalMessageBusFactory.deploy();
        const localNftBridge = await NFTBridgeFactory.connect(owner).deploy(minimalMessageBus.address);
        const remoteNftBridge = await NFTBridgeFactory.connect(owner).deploy(minimalMessageBus.address);
        const pegNFT = await PegNFTFactory.connect(owner).deploy("PegNFT", "PNF", remoteNftBridge.address);
        const simpleNFT = await SimpleNFTFactory.connect(owner).deploy("OrigNFT", "ONF");

        // remote chain id == 999
        await localNftBridge.connect(owner).setDestBridge(999, pegNFT.address);
        await localNftBridge.connect(owner).setDestNFT(simpleNFT.address, 999, pegNFT.address);
        await localNftBridge.connect(owner).setOrigNFT(simpleNFT.address);

        // local chain id == 500
        await remoteNftBridge.connect(owner).setDestBridge(500, simpleNFT.address);
        await remoteNftBridge.connect(owner).setDestNFT(pegNFT.address, 500, simpleNFT.address);

        // settings of messenger
        const minimalMessageBusSigner = await ethers.getImpersonatedSigner(minimalMessageBus.address);
        await setBalance(minimalMessageBus.address, 100n ** 18n);

        // mint a nft in local
        await simpleNFT.connect(owner).mint(user.address, 1, "");
        await simpleNFT.connect(user).approve(localNftBridge.address, 1);

        // wrapping
        await localNftBridge.connect(user).sendTo(simpleNFT.address, 1, 999, remoteUser.address);
        const messageToRemote = minimalMessageBus.getEncodedData(remoteUser.address, pegNFT.address, 1, "");
        await remoteNftBridge.connect(minimalMessageBusSigner).executeMessage(simpleNFT.address, 500, messageToRemote, minimalMessageBus.address);

        // unwrapping
        await remoteNftBridge.connect(remoteUser).sendTo(pegNFT.address, 1, 500, user.address);
        const messageToLocal = minimalMessageBus.getEncodedData(user.address, simpleNFT.address, 1, "");
        await localNftBridge.connect(minimalMessageBusSigner).executeMessage(pegNFT.address, 999, messageToLocal, minimalMessageBus.address);

        // L1 gas estimation for L2 functions
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        console.log("L1 gas estimation for L2 functions");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
        const optimismGasHelper = await OptimismGasHelperFactory.connect(owner).deploy(30_000_000_000);

        let rawTx = await localNftBridge.connect(user).populateTransaction.sendTo(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_UINT64, NON_ZERO_BYTE_ADDR);
        let bytes = await getL1EstimatedGasCost(rawTx, user);
        let estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> localNftBridge.sendTo L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        rawTx = await await remoteNftBridge.connect(user).populateTransaction.sendTo(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_UINT64, NON_ZERO_BYTE_ADDR);
        bytes = await getL1EstimatedGasCost(rawTx, user);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> remoteNftBridge.sendTo L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        rawTx = await localNftBridge.connect(minimalMessageBusSigner).populateTransaction.executeMessage(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT64, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR);
        bytes = await getL1EstimatedGasCost(rawTx, minimalMessageBusSigner);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> localNftBridge.executeMessage L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        rawTx = await remoteNftBridge.connect(minimalMessageBusSigner).populateTransaction.executeMessage(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT64, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR);
        bytes = await getL1EstimatedGasCost(rawTx, minimalMessageBusSigner);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> remoteNftBridge.executeMessage L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    
    });
    it("MinimalMessageBus cost", async function () {
        const [owner] = await ethers.getSigners();

        const MinimalMessageBusFactory = await ethers.getContractFactory("MinimalMessageBus");

        const minimalMessageBus = await MinimalMessageBusFactory.connect(owner).deploy();
        const message = minimalMessageBus.getEncodedData(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, "");
        await minimalMessageBus.connect(owner).sendMessage(owner.address, 1111, message);
    });
    it("FunctionalMinimalMessageBus cost", async function () {
        const [owner] = await ethers.getSigners();

        const MinimalMessageBusFactory = await ethers.getContractFactory("FunctionalMinimalMessageBus");

        const minimalMessageBus = await MinimalMessageBusFactory.connect(owner).deploy();
        const message = minimalMessageBus.getEncodedData(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, "");
        await minimalMessageBus.connect(owner).sendMessage(owner.address, 1111, message);
    });
    it("Wrapping cycle func of MCNNFT", async function () {
        const [owner, user, remoteUser] = await ethers.getSigners();
    
        const MCNNFTFactory = await ethers.getContractFactory("MCNNFT");
        const MinimalMessageBusFactory = await ethers.getContractFactory("FunctionalMinimalMessageBus");
        const NFTBridgeFactory = await ethers.getContractFactory("NFTBridge");
    
        const minimalMessageBus = await MinimalMessageBusFactory.deploy();
        const localNftBridge = await NFTBridgeFactory.connect(owner).deploy(minimalMessageBus.address);
        const remoteNftBridge = await NFTBridgeFactory.connect(owner).deploy(minimalMessageBus.address);
        const localMcnNFT = await MCNNFTFactory.connect(owner).deploy("Local MCN", "LMC", localNftBridge.address);
        const remoteMcnNFT = await MCNNFTFactory.connect(owner).deploy("Remote MCN", "RMC", remoteNftBridge.address);
    
        // remote chain id == 999
        await localNftBridge.connect(owner).setDestBridge(999, remoteMcnNFT.address);
        await localNftBridge.connect(owner).setDestNFT(localMcnNFT.address, 999, remoteMcnNFT.address);
    
        // local chain id == 500
        await remoteNftBridge.connect(owner).setDestBridge(500, localMcnNFT.address);
        await remoteNftBridge.connect(owner).setDestNFT(remoteMcnNFT.address, 500, localMcnNFT.address);
    
        // settings of messenger
        const minimalMessageBusSigner = await ethers.getImpersonatedSigner(minimalMessageBus.address);
        await setBalance(minimalMessageBus.address, 100n ** 18n);
    
        // mint a nft in local
        await localMcnNFT.connect(owner).mint(user.address, 1, "");
    
        // wrapping
        await localMcnNFT.connect(user)["crossChain(uint64,uint256,address)"](999, 1, remoteUser.address, {value: 10100000});
        const messageToRemote = minimalMessageBus.getEncodedData(remoteUser.address, remoteMcnNFT.address, 1, "");
        await remoteNftBridge.connect(minimalMessageBusSigner).executeMessage(localMcnNFT.address, 500, messageToRemote, minimalMessageBus.address);
    
        // unwrapping
        await remoteMcnNFT.connect(remoteUser)["crossChain(uint64,uint256,address)"](500, 1, user.address, {value: 10100000});
        const messageToLocal = minimalMessageBus.getEncodedData(user.address, localMcnNFT.address, 1, "");
        await localNftBridge.connect(minimalMessageBusSigner).executeMessage(remoteMcnNFT.address, 999, messageToLocal, minimalMessageBus.address);
    });
    it("Wrapping cycle func of PegNFT", async function () { // FIXME npx hardhat test --grep "Wrapping cycle of PegNFT"
        const [owner, user, remoteUser] = await ethers.getSigners();

        const PegNFTFactory = await ethers.getContractFactory("PegNFT");
        const SimpleNFTFactory = await ethers.getContractFactory("SimpleNFT");
        const MinimalMessageBusFactory = await ethers.getContractFactory("FunctionalMinimalMessageBus");
        const NFTBridgeFactory = await ethers.getContractFactory("NFTBridge");

        const minimalMessageBus = await MinimalMessageBusFactory.deploy();
        const localNftBridge = await NFTBridgeFactory.connect(owner).deploy(minimalMessageBus.address);
        const remoteNftBridge = await NFTBridgeFactory.connect(owner).deploy(minimalMessageBus.address);
        const pegNFT = await PegNFTFactory.connect(owner).deploy("PegNFT", "PNF", remoteNftBridge.address);
        const simpleNFT = await SimpleNFTFactory.connect(owner).deploy("OrigNFT", "ONF");

        // remote chain id == 999
        await localNftBridge.connect(owner).setDestBridge(999, pegNFT.address);
        await localNftBridge.connect(owner).setDestNFT(simpleNFT.address, 999, pegNFT.address);
        await localNftBridge.connect(owner).setOrigNFT(simpleNFT.address);

        // local chain id == 500
        await remoteNftBridge.connect(owner).setDestBridge(500, simpleNFT.address);
        await remoteNftBridge.connect(owner).setDestNFT(pegNFT.address, 500, simpleNFT.address);

        // settings of messenger
        const minimalMessageBusSigner = await ethers.getImpersonatedSigner(minimalMessageBus.address);
        await setBalance(minimalMessageBus.address, 100n ** 18n);

        // mint a nft in local
        await simpleNFT.connect(owner).mint(user.address, 1, "");
        await simpleNFT.connect(user).approve(localNftBridge.address, 1);

        // wrapping
        await localNftBridge.connect(user).sendTo(simpleNFT.address, 1, 999, remoteUser.address);
        const messageToRemote = minimalMessageBus.getEncodedData(remoteUser.address, pegNFT.address, 1, "");
        await remoteNftBridge.connect(minimalMessageBusSigner).executeMessage(simpleNFT.address, 500, messageToRemote, minimalMessageBus.address);

        // unwrapping
        await remoteNftBridge.connect(remoteUser).sendTo(pegNFT.address, 1, 500, user.address);
        const messageToLocal = minimalMessageBus.getEncodedData(user.address, simpleNFT.address, 1, "");
        await localNftBridge.connect(minimalMessageBusSigner).executeMessage(pegNFT.address, 999, messageToLocal, minimalMessageBus.address);
    });
});