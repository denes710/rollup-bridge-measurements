const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");

describe("Tests for gas measurements", function () {
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
  });
});