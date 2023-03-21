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

        const simpleGatewaySrcSpokeBrdige = await SimpleGatewaySrcSpokeBrdigeFactory.connect(owner).deploy( contractMap.address, simpleGatewayHub.address, 4, 0);
        const simpleGatewayDstSpokeBrdige = await SimpleGatewayDstSpokeBrdigeFactory.connect(owner).deploy(simpleGatewayHub.address, 4, 0);

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
            await simpleGatewaySrcSpokeBrdige.connect(user).addNewTransactionToBlock(remoteUser.address, i, localERC721.address);
        }

        await simpleGatewaySrcSpokeBrdige.calculateTransactionHashes(0)
        const transactionRoot = await simpleGatewaySrcSpokeBrdige.getRoot()

        await simpleGatewayDstSpokeBrdige.connect(relayer).addIncomingBlock(transactionRoot)
    
        const proof_1 = [simpleGatewaySrcSpokeBrdige.hashes(1), simpleGatewaySrcSpokeBrdige.hashes(5)];
        await simpleGatewayDstSpokeBrdige.connect(remoteUser).claimNFT(0, [1, user.address, remoteUser.address, localERC721.address, wrappedERC721.address], proof_1, 0, {value: ethers.utils.parseEther("0.00")});
    
        const proof_2 = [simpleGatewaySrcSpokeBrdige.hashes(0), simpleGatewaySrcSpokeBrdige.hashes(5)];
        await simpleGatewayDstSpokeBrdige.connect(remoteUser).claimNFT(0, [2, user.address, remoteUser.address, localERC721.address, wrappedERC721.address], proof_2, 1, {value: ethers.utils.parseEther("0.00")});
    
        const proof_3 = [simpleGatewaySrcSpokeBrdige.hashes(3), simpleGatewaySrcSpokeBrdige.hashes(4)];
        await simpleGatewayDstSpokeBrdige.connect(remoteUser).claimNFT(0, [3, user.address, remoteUser.address, localERC721.address, wrappedERC721.address], proof_3, 2, {value: ethers.utils.parseEther("0.00")});
    
        const proof_4 = [simpleGatewaySrcSpokeBrdige.hashes(2), simpleGatewaySrcSpokeBrdige.hashes(4)];
        await simpleGatewayDstSpokeBrdige.connect(remoteUser).claimNFT(0, [4, user.address, remoteUser.address, localERC721.address, wrappedERC721.address], proof_4, 3, {value: ethers.utils.parseEther("0.00")});

        // unwrapping
        await time.increase(3600 * 4);

        proofs = [proof_1, proof_2, proof_3, proof_4];
        for (let i = 1; i < 5; i++) {
            await wrappedERC721.connect(remoteUser).approve(simpleGatewayDstSpokeBrdige.address, i);
            await simpleGatewayDstSpokeBrdige.connect(remoteUser).addNewTransactionToBlock(user.address, 0, [i, user.address, remoteUser.address, localERC721.address, wrappedERC721.address], proofs[i - 1], i - 1);
        }

        await simpleGatewayDstSpokeBrdige.calculateTransactionHashes(0);
        const transactionRootDest = await simpleGatewayDstSpokeBrdige.getRoot();

        await simpleGatewaySrcSpokeBrdige.connect(relayer).addIncomingBlock(transactionRootDest);

        await time.increase(3600 * 4);
    
        const proof_1_dest = [simpleGatewayDstSpokeBrdige.hashes(1), simpleGatewayDstSpokeBrdige.hashes(5)];
        await simpleGatewaySrcSpokeBrdige.connect(user).claimNFT(0, [1, remoteUser.address, user.address, localERC721.address, wrappedERC721.address], proof_1_dest, 0);

        const proof_2_dest = [simpleGatewayDstSpokeBrdige.hashes(0), simpleGatewayDstSpokeBrdige.hashes(5)];
        await simpleGatewaySrcSpokeBrdige.connect(user).claimNFT(0, [2, remoteUser.address, user.address, localERC721.address, wrappedERC721.address], proof_2_dest, 1);
    
        const proof_3_dest = [simpleGatewayDstSpokeBrdige.hashes(3), simpleGatewayDstSpokeBrdige.hashes(4)];
        await simpleGatewaySrcSpokeBrdige.connect(user).claimNFT(0, [3, remoteUser.address, user.address, localERC721.address, wrappedERC721.address], proof_3_dest, 2);
    
        const proof_4_dest = [simpleGatewayDstSpokeBrdige.hashes(2), simpleGatewayDstSpokeBrdige.hashes(4)];
        await simpleGatewaySrcSpokeBrdige.connect(user).claimNFT(0, [4, remoteUser.address, user.address, localERC721.address, wrappedERC721.address], proof_4_dest, 3);
    });
    it("Challenging cycle", async function () {
        const [owner, user, remoteUser, relayer, wathcer] = await ethers.getSigners();

        const SimpleGatewaySrcSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewaySrcSpokeBrdige");
        const SimpleGatewayDstSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewayDstSpokeBrdige");
        const SimpleGatewayHubFactory = await ethers.getContractFactory("SimpleGatewayHub");
        const ContractMapFactory = await ethers.getContractFactory("ContractMap");
        const WrappedERC721Factory = await ethers.getContractFactory("WrappedERC721");

        const contractMap = await ContractMapFactory.connect(owner).deploy();
        const simpleGatewayHub = await SimpleGatewayHubFactory.connect(owner).deploy();

        const simpleGatewaySrcSpokeBrdige = await SimpleGatewaySrcSpokeBrdigeFactory.connect(owner).deploy( contractMap.address, simpleGatewayHub.address, 4, 0);
        const simpleGatewayDstSpokeBrdige = await SimpleGatewayDstSpokeBrdigeFactory.connect(owner).deploy(simpleGatewayHub.address, 4, 0);

        const wrappedERC721 = await WrappedERC721Factory.deploy("WrappedERC", "WER");
        const localERC721 = await WrappedERC721Factory.deploy("LocalERC", "LER");

        await wrappedERC721.connect(owner).transferOwnership(simpleGatewayDstSpokeBrdige.address);
        await contractMap.connect(owner).addPair(localERC721.address, wrappedERC721.address);

        await simpleGatewaySrcSpokeBrdige.connect(relayer).deposite({value: ethers.utils.parseEther("20.0")});
        await simpleGatewayDstSpokeBrdige.connect(relayer).deposite({value: ethers.utils.parseEther("20.0")});

        for (let i = 1; i < 10; i++) {
            await localERC721.connect(owner).mint(user.address, i);
            await localERC721.connect(user).approve(simpleGatewaySrcSpokeBrdige.address, i);
            await simpleGatewaySrcSpokeBrdige.connect(user).addNewTransactionToBlock(remoteUser.address, i, localERC721.address);
        }

        await simpleGatewaySrcSpokeBrdige.calculateTransactionHashes(0)
        const transactionRoot = await simpleGatewaySrcSpokeBrdige.getRoot()

        await simpleGatewayDstSpokeBrdige.connect(relayer).addIncomingBlock(transactionRoot)
        await simpleGatewayDstSpokeBrdige.connect(relayer).addIncomingBlock(transactionRoot)

        await simpleGatewayHub.connect(owner).addSpokeBridge(simpleGatewaySrcSpokeBrdige.address, simpleGatewayDstSpokeBrdige.address);
        await simpleGatewayDstSpokeBrdige.connect(wathcer).challengeIncomingBlock(1, {value: ethers.utils.parseEther("10.0")});
        await simpleGatewaySrcSpokeBrdige.connect(wathcer).sendProof(1);
        await simpleGatewayDstSpokeBrdige.connect(owner).restore();

        await simpleGatewayDstSpokeBrdige.connect(remoteUser).deposite({value: ethers.utils.parseEther("20.0")});

        await simpleGatewayDstSpokeBrdige.connect(remoteUser).addIncomingBlock(transactionRoot)
        await simpleGatewayDstSpokeBrdige.connect(remoteUser).addIncomingBlock(transactionRoot)

        await simpleGatewayDstSpokeBrdige.connect(wathcer).challengeIncomingBlock(1, {value: ethers.utils.parseEther("10.0")});
        const simpleGatewayHubSigner = await ethers.getImpersonatedSigner(simpleGatewayHub.address);
        await setBalance(simpleGatewayHub.address, 100n ** 18n);

        const message = await simpleGatewayHub.getMessage(1, transactionRoot);
        await simpleGatewayDstSpokeBrdige.connect(simpleGatewayHubSigner).receiveProof(message);
    });
});