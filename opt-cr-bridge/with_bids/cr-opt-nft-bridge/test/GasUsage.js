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

        const transaction = [NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR]

        const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
        const optimismGasHelper = await OptimismGasHelperFactory.connect(owner).deploy(30_000_000_000);

        // L1 gas estimation for L2 functions
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        console.log("L1 gas estimation for L2 functions");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        let rawTx = await simpleGatewaySrcSpokeBrdige.connect(user).populateTransaction.createBid(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_ADDR, {value: ethers.utils.parseEther("0.01")});
        let bytes = await getL1EstimatedGasCost(rawTx, user);
        let estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewaySrcSpokeBrdige.createBid L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewaySrcSpokeBrdige.connect(relayer).populateTransaction.buyBid(NON_ZERO_BYTE_UINT256);
        bytes = await getL1EstimatedGasCost(rawTx, relayer);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewaySrcSpokeBrdige.buyBid L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewayDstSpokeBrdige.connect(relayer).populateTransaction.addIncomingBid(NON_ZERO_BYTE_UINT256, NON_NULL_BYTES32, transaction);
        bytes = await getL1EstimatedGasCost(rawTx, relayer);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.addIncomingBid L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewayDstSpokeBrdige.connect(remoteUser).populateTransaction.createBid(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, transaction, {value: ethers.utils.parseEther("0.01")});
        bytes = await getL1EstimatedGasCost(rawTx, remoteUser);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.createBid L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewayDstSpokeBrdige.connect(relayer).populateTransaction.buyBid(NON_ZERO_BYTE_UINT256);
        bytes = await getL1EstimatedGasCost(rawTx, relayer);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.buyBid L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewaySrcSpokeBrdige.connect(relayer).populateTransaction.addIncomingBid(NON_ZERO_BYTE_UINT256, NON_NULL_BYTES32, transaction);
        bytes = await getL1EstimatedGasCost(rawTx, relayer);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewaySrcSpokeBrdige.addIncomingBid L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewaySrcSpokeBrdige.connect(user).populateTransaction.claimNFT(NON_ZERO_BYTE_UINT256, transaction);
        bytes = await getL1EstimatedGasCost(rawTx, user);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewaySrcSpokeBrdige.claimNFT L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    });
    it("Challing cycle", async function () {
        const [owner, user, remoteUser, relayer, wathcer] = await ethers.getSigners();
        const NON_NULL_BYTES32_RAW = '1111111111111111111111111111111111111111111111111111111111111111';
        
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

//        await time.increase(3600 * 4);
//        const proofIncoming = await simpleGatewayHub.getMessage(false);
//        await simpleGatewaySrcSpokeBrdige.connect(simpleGatewayHubSigner).receiveProof(proofIncoming);

        const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
        const optimismGasHelper = await OptimismGasHelperFactory.connect(owner).deploy(30_000_000_000);

        // L1 gas estimation for L2 functions
        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
        console.log("L1 gas estimation for L2 functions");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        let rawTx = await simpleGatewayDstSpokeBrdige.connect(wathcer).populateTransaction.challengeIncomingBid(NON_ZERO_BYTE_UINT256, {value: ethers.utils.parseEther("10.00")});
        let bytes = await getL1EstimatedGasCost(rawTx, wathcer);
        let estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.challengeIncomingBid L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        rawTx = await simpleGatewaySrcSpokeBrdige.connect(wathcer).populateTransaction.sendProof(true, NON_ZERO_BYTE_UINT256);
        bytes = await getL1EstimatedGasCost(rawTx, wathcer);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewaySrcSpokeBrdige.sendProof L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        // outgoing data == 224 byte
        let input = "";
        for (let i = 0; i < 7; i++) {
            input += NON_NULL_BYTES32_RAW;
        }

        rawTx = await simpleGatewayDstSpokeBrdige.connect(simpleGatewayHubSigner).populateTransaction.receiveProof("0x" + input);
        bytes = await getL1EstimatedGasCost(rawTx, simpleGatewayHubSigner);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.receiveProof Outgoing proof L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

        // incoming data == 256 byte
        input = "";
        for (let i = 0; i < 8; i++) {
            input += NON_NULL_BYTES32_RAW;
        }

        rawTx = await simpleGatewayDstSpokeBrdige.connect(simpleGatewayHubSigner).populateTransaction.receiveProof("0x" + input);
        bytes = await getL1EstimatedGasCost(rawTx, simpleGatewayHubSigner);
        estimated = await optimismGasHelper.getL1Fee(bytes);
        console.log(">> simpleGatewayDstSpokeBrdige.receiveProof Incoming proof L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

        console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    });
});