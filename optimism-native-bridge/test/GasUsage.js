const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
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

  it("Wrapping cycle", async function () {
    const [owner, otherBridgeAddr, user, remoteOwner] = await ethers.getSigners();

    const MinimalMessengerFactory = await ethers.getContractFactory("MinimalMessenger");
    const L1BridgeFactory = await ethers.getContractFactory("L1Bridge");
    const L2BridgeFactory = await ethers.getContractFactory("L2Bridge");
    const RemoteERC721Factory = await ethers.getContractFactory("RemoteERC721");
    const LocalERC721Factory = await ethers.getContractFactory("LocalERC721");

    const minimalMessenger = await MinimalMessengerFactory.connect(owner).deploy();
    const l1Bridge = await L1BridgeFactory.deploy(minimalMessenger.address, otherBridgeAddr.address);
    const l2Bridge = await L2BridgeFactory.deploy(minimalMessenger.address, otherBridgeAddr.address);
    const localERC721 = await LocalERC721Factory.connect(owner).deploy();
    const remoteERC721 = await RemoteERC721Factory.deploy(l2Bridge.address, localERC721.address);

    await localERC721.connect(owner).mint(user.address, 1);
    await localERC721.connect(user).approve(l1Bridge.address, 1);

    // settings of messenger
    minimalMessenger.setXDomainMessageSender(otherBridgeAddr.address);
    const minimalMessengerSigner = await ethers.getImpersonatedSigner(minimalMessenger.address);
    await setBalance(minimalMessenger.address, 100n ** 18n);

    // wrapping
    await l1Bridge.connect(user).bridgeERC721To(localERC721.address, remoteERC721.address, remoteOwner.address, 1, 10000, []);
    await l2Bridge.connect(minimalMessengerSigner).finalizeBridgeERC721(remoteERC721.address, localERC721.address, user.address, remoteOwner.address, 1, []);

    // unwrapping
    await l2Bridge.connect(remoteOwner).bridgeERC721To(remoteERC721.address, localERC721.address, user.address, 1, 10000, []);
    await l1Bridge.connect(minimalMessengerSigner).finalizeBridgeERC721(localERC721.address, remoteERC721.address, remoteOwner.address, user.address, 1, []);

    const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
    const optimismGasHelper = await OptimismGasHelperFactory.connect(owner).deploy(30_000_000_000);

    // L1 gas estimation for L2 functions
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.log("L1 gas estimation for L2 functions");
    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

    let rawTx = await l2Bridge.connect(user).populateTransaction.bridgeERC721To(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, NON_ZERO_BYTE_UINT32, []);
    let bytes = await getL1EstimatedGasCost(rawTx, user);

    let estimated = await optimismGasHelper.getL1Fee(bytes);
    console.log(">> l2Bridge.bridgeERC721To L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

    rawTx = await l2Bridge.connect(minimalMessengerSigner).populateTransaction.finalizeBridgeERC721(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_UINT256, []);
    bytes = await getL1EstimatedGasCost(rawTx, minimalMessengerSigner);

    estimated = await optimismGasHelper.getL1Fee(bytes);
    console.log(">> l2Bridge.finalizeBridgeERC721 L1 Fee in Wei: " + estimated + " L1 Fee in GWei: " + estimated / 10**9);

    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  });
});