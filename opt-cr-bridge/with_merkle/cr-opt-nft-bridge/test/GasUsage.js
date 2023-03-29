const { time, setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { serialize } = require("@ethersproject/transactions");

describe("Tests for gas measurements", function () {
    const NON_ZERO_BYTE_ADDR = "0x1111111111111111111111111111111111111111";
    const NON_ZERO_BYTE_UINT256 = "0x1111111111111111111111111111111111111111111111111111111111111111";
    const NON_ZERO_BYTE_UINT32 = "0x11111111";
    const NON_NULL_BYTES32 = '0x1111111111111111111111111111111111111111111111111111111111111111';

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

        const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
        const optimismGasHelper = await OptimismGasHelperFactory.connect(owner).deploy(30_000_000_000);

        // L1 gas estimation for L2 functions
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        console.log("L1 gas estimation for L2 functions");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        let rawTx = await simpleGatewaySrcSpokeBrdige.connect(user).populateTransaction.addNewTransactionToBlock(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR);
        let bytes = await getL1EstimatedGasCost(rawTx, user);
        let estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewaySrcSpokeBrdige.addNewTransactionToBlock L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewayDstSpokeBrdige.connect(relayer).populateTransaction.addIncomingBlock(NON_NULL_BYTES32);
        bytes = await getL1EstimatedGasCost(rawTx, relayer);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.addIncomingBlock L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewayDstSpokeBrdige.connect(remoteUser).populateTransaction.claimNFT(NON_ZERO_BYTE_UINT256, [NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR], proof_1, NON_ZERO_BYTE_UINT256, {value: ethers.utils.parseEther("0.00")});
        bytes = await getL1EstimatedGasCost(rawTx, remoteUser);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.claimNFT L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewayDstSpokeBrdige.connect(remoteUser).populateTransaction.addNewTransactionToBlock(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, [NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR], proof_1, NON_ZERO_BYTE_UINT256);
        bytes = await getL1EstimatedGasCost(rawTx, remoteUser);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.addNewTransactionToBlock L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewaySrcSpokeBrdige.connect(relayer).populateTransaction.addIncomingBlock(NON_NULL_BYTES32);
        bytes = await getL1EstimatedGasCost(rawTx, relayer);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewaySrcSpokeBrdige.addIncomingBlock L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewayDstSpokeBrdige.connect(user).populateTransaction.claimNFT(NON_ZERO_BYTE_UINT256, [NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR], proof_1, NON_ZERO_BYTE_UINT256, {value: ethers.utils.parseEther("0.00")});
        bytes = await getL1EstimatedGasCost(rawTx, user);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.claimNFT L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
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
        // we dealing with in other cases
        // await simpleGatewayDstSpokeBrdige.connect(wathcer).challengeIncomingBlock(1, {value: ethers.utils.parseEther("10.0")});
        // await simpleGatewaySrcSpokeBrdige.connect(wathcer).sendProof(1);
        // await simpleGatewayDstSpokeBrdige.connect(owner).restore();

        await simpleGatewayDstSpokeBrdige.connect(remoteUser).deposite({value: ethers.utils.parseEther("20.0")});

        await simpleGatewayDstSpokeBrdige.connect(remoteUser).addIncomingBlock(transactionRoot)
        await simpleGatewayDstSpokeBrdige.connect(remoteUser).addIncomingBlock(transactionRoot)

        await simpleGatewayDstSpokeBrdige.connect(wathcer).challengeIncomingBlock(1, {value: ethers.utils.parseEther("10.0")});
        const simpleGatewayHubSigner = await ethers.getImpersonatedSigner(simpleGatewayHub.address);
        await setBalance(simpleGatewayHub.address, 100n ** 18n);

        const message = await simpleGatewayHub.getMessage(1, NON_NULL_BYTES32);
        await simpleGatewayDstSpokeBrdige.connect(simpleGatewayHubSigner).receiveProof(message);

        const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
        const optimismGasHelper = await OptimismGasHelperFactory.connect(owner).deploy(30_000_000_000);

        // L1 gas estimation for L2 functions
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        console.log("L1 gas estimation for L2 functions");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        let rawTx = await simpleGatewayDstSpokeBrdige.connect(wathcer).populateTransaction.challengeIncomingBlock(NON_ZERO_BYTE_UINT256, {value: ethers.utils.parseEther("10.0")});
        let bytes = await getL1EstimatedGasCost(rawTx, wathcer);
        let estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> challengeIncomingBlock L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        
        rawTx = await simpleGatewaySrcSpokeBrdige.connect(wathcer).populateTransaction.sendProof(NON_ZERO_BYTE_UINT256);
        bytes = await getL1EstimatedGasCost(rawTx, wathcer);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> sendProof L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewayDstSpokeBrdige.connect(owner).populateTransaction.restore();
        bytes = await getL1EstimatedGasCost(rawTx, owner);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> restore L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        const bigProof = await simpleGatewayHub.getMessage(NON_ZERO_BYTE_UINT256, NON_NULL_BYTES32);
        rawTx = await simpleGatewayDstSpokeBrdige.connect(simpleGatewayHubSigner).populateTransaction.receiveProof(bigProof);
        bytes = await getL1EstimatedGasCost(rawTx, simpleGatewayHubSigner);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> receiveProof L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    });
    it("Cost of merkle root in claiming", async function () {
        const [owner, user, remoteUser, relayer] = await ethers.getSigners();

        const SimpleGatewaySrcSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewaySrcSpokeBrdige");
        const SimpleGatewayDstSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewayDstSpokeBrdige");
        const SimpleGatewayHubFactory = await ethers.getContractFactory("SimpleGatewayHub");
        const ContractMapFactory = await ethers.getContractFactory("ContractMap");
        const WrappedERC721Factory = await ethers.getContractFactory("WrappedERC721");

        const contractMap = await ContractMapFactory.connect(owner).deploy();
        const simpleGatewayHub = await SimpleGatewayHubFactory.connect(owner).deploy();

        const simpleGatewaySrcSpokeBrdige = await SimpleGatewaySrcSpokeBrdigeFactory.connect(owner).deploy( contractMap.address, simpleGatewayHub.address, 4, 0);

        const localERC721 = await WrappedERC721Factory.deploy("LocalERC", "LER");

        const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
        const optimismGasHelper = await OptimismGasHelperFactory.deploy(30_000_000_000);

        console.log(">> NFT claiming cost:");
        for (let i = 2; i <= 2**5; i++) {
            const simpleGatewayDstSpokeBrdige = await SimpleGatewayDstSpokeBrdigeFactory.connect(owner).deploy(simpleGatewayHub.address, i, 0);
            await simpleGatewayDstSpokeBrdige.connect(relayer).deposite({value: ethers.utils.parseEther("20.0")});

            const wrappedERC721 = await WrappedERC721Factory.deploy("WrappedERC", "WER");
            await wrappedERC721.connect(owner).transferOwnership(simpleGatewayDstSpokeBrdige.address);
            const transaction = [i, user.address, remoteUser.address, localERC721.address, wrappedERC721.address];
            const {0: root, 1: proofs} = await simpleGatewayDstSpokeBrdige.getProof(transaction, i - 1);
            await simpleGatewayDstSpokeBrdige.connect(relayer).addIncomingBlock(root);
            const gasUsed = (await (await simpleGatewayDstSpokeBrdige.connect(remoteUser).claimNFT(0, [i, user.address, remoteUser.address, localERC721.address, wrappedERC721.address], proofs, 0, {value: ethers.utils.parseEther("0.00")})).wait()).gasUsed;

            let rawTx = await simpleGatewayDstSpokeBrdige.connect(remoteUser).populateTransaction.claimNFT(0, [i, user.address, remoteUser.address, localERC721.address, wrappedERC721.address], proofs, 0, {value: ethers.utils.parseEther("0.00")});
            let bytes = await getL1EstimatedGasCost(rawTx, remoteUser);
            let estimated = await optimismGasHelper.getL1Fee(bytes);
            console.log(">> Gas used(" + i + " height): " + gasUsed + '\t '  +" L1 Fee in GWei: " + estimated / 10**9);
        }
    });
    it("Cost of merkle root in challenging", async function () {
        const [owner, user, remoteUser, relayer, wathcer] = await ethers.getSigners();

        const SimpleGatewaySrcSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewaySrcSpokeBrdige");
        const SimpleGatewayDstSpokeBrdigeFactory = await ethers.getContractFactory("SimpleGatewayDstSpokeBrdige");
        const SimpleGatewayHubFactory = await ethers.getContractFactory("BlackholeHub");
        const ContractMapFactory = await ethers.getContractFactory("ContractMap");
        const WrappedERC721Factory = await ethers.getContractFactory("WrappedERC721");

        const contractMap = await ContractMapFactory.connect(owner).deploy();
        const simpleGatewayHub = await SimpleGatewayHubFactory.connect(owner).deploy();

        let idx = 13;
        for (let i = 2**13; i < 2**16; i = i*2) {
            const simpleGatewaySrcSpokeBrdige = await SimpleGatewaySrcSpokeBrdigeFactory.connect(owner).deploy( contractMap.address, simpleGatewayHub.address, i, 0);
            await simpleGatewaySrcSpokeBrdige.connect(relayer).deposite({value: ethers.utils.parseEther("20.0")});

            const wrappedERC721 = await WrappedERC721Factory.deploy("WrappedERC", "WER");
            const localERC721 = await WrappedERC721Factory.deploy("LocalERC", "LER");
    
            await contractMap.connect(owner).addPair(localERC721.address, wrappedERC721.address);

            for (let j = 0; j < i + 1; j++) {
                await localERC721.connect(owner).mint(user.address, j);
                await localERC721.connect(user).approve(simpleGatewaySrcSpokeBrdige.address, j);
                await simpleGatewaySrcSpokeBrdige.connect(user).addNewTransactionToBlock(remoteUser.address, j, localERC721.address);
            }

            const gasUsed = (await (await simpleGatewaySrcSpokeBrdige.connect(wathcer).sendProof(0)).wait()).gasUsed;
            console.log(">> Gas used(" + idx + " \t h, " + i + " \t n): \t " + gasUsed);
            idx += 1;
        }
    });
});