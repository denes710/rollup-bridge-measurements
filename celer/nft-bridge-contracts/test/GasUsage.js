const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");

describe("Tests for gas measurements", function () {
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
    });
    it("MinimalMessageBus cost", async function () {
        const [owner] = await ethers.getSigners();

        const MinimalMessageBusFactory = await ethers.getContractFactory("MinimalMessageBus");

        const minimalMessageBus = await MinimalMessageBusFactory.connect(owner).deploy();
        const message = minimalMessageBus.getEncodedData(owner.address, owner.address, 1, "");
        await minimalMessageBus.connect(owner).sendMessage(owner.address, 1111, message);
    });
});