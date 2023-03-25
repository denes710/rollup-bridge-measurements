const { time, setBalance } = require("@nomicfoundation/hardhat-network-helpers");

describe("Tests for gas measurements", function () {
    it("Wrapping cycle", async function () {
        const [owner, user, remoteUser, relayer] = await ethers.getSigners();

        const SimpleGatewaySrcSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewaySrcSpokeBrdige");
        const SimpleGatewayDstSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewayDstSpokeBrdige");
        const SimpleGatewayHubFactory = await ethers.getContractFactory("SimpleGatewayHub");
        const ContractMapFactory = await ethers.getContractFactory("ContractMap");
        const WrappedERC721Factory = await ethers.getContractFactory("WrappedERC721");

        const contractMap = await ContractMapFactory.connect(owner).deploy();
        const simpleGatewayHub = await SimpleGatewayHubFactory.connect(owner).deploy();

        const simpleGatewaySrcSpokeBrdige = await SimpleGatewaySrcSpokeBrdigeFactory.connect(owner).deploy(simpleGatewayHub.address, contractMap.address);
        const simpleGatewayDstSpokeBrdige = await SimpleGatewayDstSpokeBrdigeFactory.connect(owner).deploy(simpleGatewayHub.address);

        const wrappedERC721 = await WrappedERC721Factory.deploy("WrappedERC", "WER");
        const localERC721 = await WrappedERC721Factory.deploy("LocalERC", "LER");

        await wrappedERC721.connect(owner).transferOwnership(simpleGatewayDstSpokeBrdige.address);
        await contractMap.connect(owner).addPair(localERC721.address, wrappedERC721.address);

        await simpleGatewaySrcSpokeBrdige.connect(relayer).deposite({value: ethers.utils.parseEther("20.0")});
        await simpleGatewayDstSpokeBrdige.connect(relayer).deposite({value: ethers.utils.parseEther("20.0")});

        // wrapping
        for (let i = 1; i < 10; i++) {
            await localERC721.connect(owner).mint(user.address, i);
            await localERC721.connect(user).approve(simpleGatewaySrcSpokeBrdige.address, i);
            await simpleGatewaySrcSpokeBrdige.connect(user).createBid(remoteUser.address, i, localERC721.address, {value: ethers.utils.parseEther("0.01")});
        }
        for (let i = 1; i < 10; i++) {
            await simpleGatewaySrcSpokeBrdige.connect(relayer).buyBid(i - 1);
        }
        for (let i = 1; i < 10; i++) {
            let transaction = [i, user.address, remoteUser.address, localERC721.address, wrappedERC721.address]
            let transactionHash = await simpleGatewayDstSpokeBrdige.getTransactionHash(transaction)
            await simpleGatewayDstSpokeBrdige.connect(relayer).addIncomingBid(i - 1, transactionHash, transaction);
        }

        await time.increase(3600 * 4);

        // unwrapping
        for (let i = 1; i < 10; i++) {
            await wrappedERC721.connect(remoteUser).approve(simpleGatewayDstSpokeBrdige.address, i);
            let transaction = [i, user.address, remoteUser.address, localERC721.address, wrappedERC721.address]
            await simpleGatewayDstSpokeBrdige.connect(remoteUser).createBid(user.address, i - 1, transaction, {value: ethers.utils.parseEther("0.01")});
        }
        for (let i = 1; i < 10; i++) {
            await simpleGatewayDstSpokeBrdige.connect(relayer).buyBid(i - 1);
        }
        for (let i = 1; i < 10; i++) {
            let transaction = [i, remoteUser.address, user.address, localERC721.address, wrappedERC721.address]
            let transactionHash = await simpleGatewaySrcSpokeBrdige.getTransactionHash(transaction)
            await simpleGatewaySrcSpokeBrdige.connect(relayer).addIncomingBid(i - 1, transactionHash, transaction);
        }

        await time.increase(3600 * 4);

        for (let i = 1; i < 10; i++) {
            let transaction = [i, remoteUser.address, user.address, localERC721.address, wrappedERC721.address]
            await simpleGatewaySrcSpokeBrdige.connect(user).claimNFT(i - 1, transaction);
        }
    });
    it("Challing cycle", async function () {
        const [owner, user, remoteUser, relayer, wathcer] = await ethers.getSigners();
    
        const SimpleGatewaySrcSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewaySrcSpokeBrdige");
        const SimpleGatewayDstSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewayDstSpokeBrdige");
        const SimpleGatewayHubFactory = await ethers.getContractFactory("SimpleGatewayHub");
        const ContractMapFactory = await ethers.getContractFactory("ContractMap");
        const WrappedERC721Factory = await ethers.getContractFactory("WrappedERC721");
    
        const contractMap = await ContractMapFactory.connect(owner).deploy();
        const simpleGatewayHub = await SimpleGatewayHubFactory.connect(owner).deploy();
    
        const simpleGatewaySrcSpokeBrdige = await SimpleGatewaySrcSpokeBrdigeFactory.connect(owner).deploy(simpleGatewayHub.address, contractMap.address);
        const simpleGatewayDstSpokeBrdige = await SimpleGatewayDstSpokeBrdigeFactory.connect(owner).deploy(simpleGatewayHub.address);
    
        const wrappedERC721 = await WrappedERC721Factory.deploy("WrappedERC", "WER");
        const localERC721 = await WrappedERC721Factory.deploy("LocalERC", "LER");
    
        await wrappedERC721.connect(owner).transferOwnership(simpleGatewayDstSpokeBrdige.address);
        await contractMap.connect(owner).addPair(localERC721.address, wrappedERC721.address);
    
        await simpleGatewaySrcSpokeBrdige.connect(relayer).deposite({value: ethers.utils.parseEther("20.0")});
        await simpleGatewayDstSpokeBrdige.connect(relayer).deposite({value: ethers.utils.parseEther("20.0")});
    
        // wrapping
        for (let i = 1; i < 10; i++) {
            await localERC721.connect(owner).mint(user.address, i);
            await localERC721.connect(user).approve(simpleGatewaySrcSpokeBrdige.address, i);
            await simpleGatewaySrcSpokeBrdige.connect(user).createBid(remoteUser.address, i, localERC721.address, {value: ethers.utils.parseEther("0.01")});
        }
        for (let i = 1; i < 10; i++) {
            await simpleGatewaySrcSpokeBrdige.connect(relayer).buyBid(i - 1);
        }
    
        // challenge
        await simpleGatewayHub.connect(owner).addSpokeBridge(simpleGatewaySrcSpokeBrdige.address, simpleGatewayDstSpokeBrdige.address);
    
        for (let i = 1; i < 10; i++) {
            let transaction = [i, user.address, relayer.address, localERC721.address, wrappedERC721.address]
            let transactionHash = await simpleGatewayDstSpokeBrdige.getTransactionHash(transaction)
            await simpleGatewayDstSpokeBrdige.connect(relayer).addIncomingBid(i - 1, transactionHash, transaction);
        }

        await simpleGatewayDstSpokeBrdige.connect(wathcer).challengeIncomingBid(2, {value: ethers.utils.parseEther("10.00")});
    
        await simpleGatewaySrcSpokeBrdige.connect(wathcer).sendProof(true, 2);
    
        const simpleGatewayHubSigner = await ethers.getImpersonatedSigner(simpleGatewayHub.address);
        await setBalance(simpleGatewayHub.address, 100n ** 18n);
    
        const proof = await simpleGatewayHub.getMessage(true);
        await simpleGatewayDstSpokeBrdige.connect(simpleGatewayHubSigner).receiveProof(proof);
    });
});