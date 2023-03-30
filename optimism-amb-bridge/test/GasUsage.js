const { serialize } = require("@ethersproject/transactions");

describe("Tests for gas measurements", function () {
  const NON_ZERO_BYTE_ADDR = "0x1111111111111111111111111111111111111111";
  const NON_ZERO_BYTE_UINT256 = "0x1111111111111111111111111111111111111111111111111111111111111111";
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

  it("Cost of CrossDomainMessenger", async function () {
        // *********************
        // Deployments
        // *********************
        const [owner, l1CrossDomainMessengerHelper] = await ethers.getSigners();
        const NON_NULL_BYTES32 = '0x1111111111111111111111111111111111111111111111111111111111111111';
        const NON_NULL_BYTES32_RAW = '1111111111111111111111111111111111111111111111111111111111111111';
        const L1CrossDomainMessengerFactory = await ethers.getContractFactory("L1CrossDomainMessenger");
        const L2CrossDomainMessengerFactory = await ethers.getContractFactory("L2CrossDomainMessenger");

        const LibAddressManagerFactory = await ethers.getContractFactory("Lib_AddressManager");
        const CanonicalTransactionChainFactory = await ethers.getContractFactory("CanonicalTransactionChain");
        const StateCommitmentChainFactory = await ethers.getContractFactory("StateCommitmentChain");
        const ChainStorageContainerFactory = await ethers.getContractFactory("ChainStorageContainer");
        const OVML2ToL1MessagePasserFactory = await ethers.getContractFactory("OVM_L2ToL1MessagePasser");

        
        const libAddressManager = await LibAddressManagerFactory.connect(owner).deploy();
        const oVML2ToL1MessagePasser = await OVML2ToL1MessagePasserFactory.connect(owner).deploy();

        const l1CrossDomainMessenger = await L1CrossDomainMessengerFactory.connect(owner).deploy();
        const l2CrossDomainMessenger = await L2CrossDomainMessengerFactory.connect(owner).deploy(l1CrossDomainMessengerHelper.address, oVML2ToL1MessagePasser.address);

        const canonicalTransactionChain = await CanonicalTransactionChainFactory.connect(owner).deploy(libAddressManager.address, 30000000, 2, 4);
        const stateCommitmentChain = await StateCommitmentChainFactory.connect(owner).deploy(libAddressManager.address, 1, 1000000000);
        const chainStorageContainer = await ChainStorageContainerFactory.connect(owner).deploy(libAddressManager.address, "");

        await libAddressManager.connect(owner).setAddress("CanonicalTransactionChain", canonicalTransactionChain.address); 
        await libAddressManager.connect(owner).setAddress("StateCommitmentChain", stateCommitmentChain.address); 
        await libAddressManager.connect(owner).setAddress("ChainStorageContainer-SCC-batches", chainStorageContainer.address); 

        await l1CrossDomainMessenger.connect(owner).initialize(libAddressManager.address);

        // *********************
        // One cycle
        // *********************
        // L1->L2
        // L1
        await l1CrossDomainMessenger.sendMessage(l2CrossDomainMessenger.address, NON_NULL_BYTES32, 100000);
        // L2
        await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).relayMessage(l2CrossDomainMessenger.address, l1CrossDomainMessenger.address, NON_NULL_BYTES32, 2);

        // L2->L1
        // L2
        await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).sendMessage(l1CrossDomainMessenger.address, NON_NULL_BYTES32, 1000000);
        // L1
        const target = "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1";
        const sender = "0x4200000000000000000000000000000000000010";
        // 458 bytes long
        const message = "0xa9f9e675000000000000000000000000b4272071ecadd69d933adcd19ca99fe80664fc08000000000000000000000000e4f27b04cc7729901876b44f4eaa5102ec1502650000000000000000000000009df659ecd8cf577b1a61ecf2caa364bd9277481d0000000000000000000000009df659ecd8cf577b1a61ecf2caa364bd9277481d0000000000000000000000000000000000000000000001f29f6046b2a786477900000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000";
        const messageNonce = 131800;
        const stateTrieWitness = "0xf90b87b90214f90211a09fbc547cb5e04d43ce4bbb01113c7eaeea9318909961b1811786bf415a27c865a0fed0bfba5e190a5c3aee24ec03e6e90868ac68e84c565fea3b5cae1e16bcd053a0693288e46f797995683caffa474ff160931ce2fdfc553fa54c2f7f200e7e0f5ba0dac338339a20e08407e7cea67b9ed7ba93b33bca6a24d4ec780d4d49a894950ea0263ba2989eedffdd1673bf5c7e6c047d1028b3195039a0f22169363a83989e19a0cde4bb4d036958c96a658efb03ab239e82344a72d934bb21d122fc9cc4d825fba07508dc3836804ac32b73321006e1943bb1c2ba2f67145dcb8969727279dfcee9a0095f218d65eef2e256128c9e8cc52a6cddba9f51c3deeb9635b7b91721535302a0aa671d3a538838d99bc8f71122546c70fca311b42c9f14f10c6c12704aa4e8a0a055afb98102ef23929d4cadee6a65271be6ba4cfff312931118066d92a61b55caa0747f985b5f0777fd9d80dbd962fb17e29aade6dfc39cea78a86824332cb0b7c8a0eecc0f4e81e7e60bba8dcce9bc84d87cb5fceb481e291c5049a1a53010c22bcda00f1855affcaa18ac4262e35c9c250d1c7187c5b6ec899740c1d5145fa31a34dfa0cbfe38970c8ca29afc91b6d91ad1891064d4ee15a3895a469448d30c2ed7a348a01d47d3bae6b9de2b761ca04f0fe4eeb391b8c71914856572284a75d787216d38a04a20225d5766918795cbc938f49dd29a1b9629c259cefc9aaa95eecbacd2ec3280b90214f90211a04ba811879d768c8979f3153b11436ecdc6779b0dcff060f92dd0fd2acea6ffe1a019f5e8e67f178090011da5d3866aa1a3db41cd93c89ffe4eb3dd9b2182554f85a05f7c6e62f6d7a481f4c9f3be9fc7dbc836b9ffb31b9e3c402748ba333251929ba01bdabc186fdbed4aec7a5e24c004b79d43c52a7075c55534e0e93057feecd5c3a0882f06a8cbedf12d1df592804fbd1ba58e2c167a0d11a00cddf740abcdade4bba0ef4ea843dfad605036ddb1ba8ea19f12ad4546366e304b298a679cf7712a3c8ca0737f6799bd3d6d0ecd1b03248c05d5dc4d5bf11a30cb89fc6c1aff124123e149a0e4a2b202129ff304e7b7f5769d3d01895ba4f67151ed4c49da1b5c1b98cf2b84a0aa7ce375eba216ababba41d35639f1aaf59a8446966a2c9710d74b5bf3037b60a0fec59b859bb5fc9221ae4a3e61633e851a7f75185607e1aef6dceea7e78358cba041b346bac9e9775072ba2c0750c16159285426f636cfb84afe0eb4a548d0e248a0b4c9183d7c3e19f0dacbc58d0d8ad925cec6bcde6be243887c808b06690cc578a01e33a78508781c98298f4986e39be3f562a7c2d15aba552f5dc5b5004503fa80a0bf357ae7ca8428dda3f36898da6cdfc43c36a7db8e043243fa1c6e88abb903a6a018bd2c52d63aaa34015b4fb696f2afdaeb6360d26e434004b6133082cf72436fa02794e2906f393bd70156387a920daa58249fd15c48ba49fb02e6d6170b3de61980b90214f90211a01fc0990bfc918389e70b8b5efd351a6b3f0015b1d58d8d45ff7cf8a658f73192a09eb2838978ff22f1297ebf14bf989fb358ce0c3560b65472b58ffdd9989d02c0a0ce65993f908ce5ebb4e4e6ea14f573261634581192670e8f689a432f08dc715fa0b2762c62f1b34be253e75a138af50c2dfdb690abd9fc15b9bd2a8c708827a6ffa07bd542e8a3e7a3450221c3999d0476960353234cb064e763548a178cf9581681a07a3b6b841ee0bdbd7d84fcc693c096319749f6ecde19753d8a5d3457c14ad8f8a099950a93dcf4ba715ab292edfc7c658fd1bb73ad2edb5b494235363a8f19fcb0a0381c7b859528255c61c798a1d65cc94279da430e2397074ff5971274bd1e3175a0194181814f7b8dc3e119d150d1d90b86550b4bb0c2f9738c1a124083a7068711a038c0c83c4dce36924f7d7f74cfbbefb3cc2c9c8d8d333ed6531a4e45663b110aa077505c10106a56f4d7e765b9c390f607fd08cfe4470a9d1365fa37a01051408da0fe00844683823db93aa74b2f9f8efa6c661b2ad26d7d6e8afc5c26520bd24b12a0b8865cbe469309663215c895a56cdfb75cdbf1d8084c08029f44f50c550c6cb4a054ade298b6438b5356faf3e359eda5b80761fbe5682c88c5cfd5faf4e9a8cd2ca0622198dca5edba022d4b0944f9851828dde90ff0bfe1a3a5f59f9fe4e05148b8a0c2df38deab7027b171746c0b11143fb8c1596a1b91ec9cf1e0595eab613906f080b90214f90211a049b5db46a44b46e4e16cdff2f0a0e782c094e3a6654d9d296c0f295f5b69b108a06d667c4c707e8bae2489178aab80203402b0a470209983e20fbd6de416a4baefa0b5fa5574756abd936093015d4cb30fea75a100c5f32e9084c6b66820a95c6e24a0ecda54c763dcdf15017bb9d9d003b0d27fe38208de3214a6d021441a58fb254ea033ab021f94f2cfeda0c2c94e49273f29cdc14423180592d72b0b85e97df8eddca0b5b687f2a17e199e56de70e3ec73ed16ece5368134e5d2ab579aa3a37683a124a0306f065b3b4f2dc3d572b845e8927d10032fdc5140bae8a7fd433a92d45081d1a0579d327c114aa00e504f6f522ecbfe59c7ebab580c2551a4d599b68acda848f7a0de6270a56ba49430c4d8e448bb7ec66db9276e342c93d6a1c2112caf132608c7a0399fb3f1c89cb67a24da9f47402dcfd1c48ad752790e698ded2e46cf105b3f0ca05527a750459d2fc1860b09a144c1f9bff6f4aea76564a84f52e343e6fe95e751a0e631f76d6cc8bb28ae3237562659db3f068fa9708066651b45ed368188bfc5a2a016019285a38946b7757615270d2f6862d9e6013d23f103518a7de017f9e2c2caa077772401bb4f030fd2ba7564a842b94be2d4aa562c91ba6b74434fefe7ebb015a0fbba9c277353d43a256f5751631f9250d9c12907021a576ab0a4d8c07d79f6c0a018ae653324c082dd07498655020211e754fef110b6ea665386238e9048ca411680b901d4f901d180a02f65e5698fecccc36e05c6196afaafd85ae9fb9089c3015277e3463763ef2ca5a051263b6ce89a9aad633536d8ff50131dbbe2ce121a089f0e1c322f828e079ed9a03db3e7769cb232f0441ae3d3ccd71ae2cb9b82a53e20bded235a41d8d234423aa00762049ebc67c114590bab773a1a72982129f5b675b7d91ba55c7fda8eb8ef26a0b131fd2b55350c21c4e93973697afc020ceeac47f89277d41676572f40e17e9880a0584c48f053c3b7d3b2d0abb99551e57c059b596d7cdfc73f98dad9eeaeb8cc18a0ce53c52d6dc58bfa6ae8c2c1d504e67c98b4f050ec1c4583d65d913cab2d89b2a0961e6bd8a7603562443b1a9ff229c04ffa219adb237e052faa0ae4c0b3e0d3faa02cb727879aab6796c25094dbbd68eccde995d4d825e49eedc8b3b3a4585f4eb3a0fe3f2416baaa999934dc10c8c60cba7d93d2edccebd4e440bc19c548280aa473a01fa04fe6007013570445228a51240352538b2de545b31e3afb27a7c4eccec42aa04542c3e17ab8e4fe55c72ac67eecfcc04458e4ed4c117b72dd781a578dab597da0601237f1fc265a30e4a25f1205b1d6ff471b5b83f9880b803c3401dbeb39d828a02ebd1e7f6866019d07cd8803228d3fee12091d1e16aeeab434fcb5ca0eb06b1c80b893f891a0e2ae5a02ceb21a3ad07f80f3bb1e04462c166f0335e03622e8b6fc76ab44dc54a06b56b8ee1c8e1e876bc5fec0aeae647480a3ee39c91bdccb1468cfa74276111d8080a0b30f4552a12e236334072f564c5551fa591be4766ead43a9f43f2f2e81aee8be8080808080a013ea7ed65b31d32b8253e4b14e686232d5763385b61d41827ea3fc9407469f88808080808080b853f85180a0b84badff8cb2c1a3675ee4e4697dc432ca5c8a3cee5ebd4ed6a633c31dfec1c480808080808080808080808080a06da7b13be9147cc29fe975d1e456206090ee512a9ec983986b42096e04fc051480b868f8669d3b46a2440f3eaf346b6c1ce588ed08712591822a258c5a1c4cf44cd0c9b846f8448080a03c6e6d34c116a70330f1a118520a5bfeaa488d9878c4e3f7dfd6063e29080b62a011a24190f7e396e61e0fdf84fa138cdbb67aeba7b4dcbb1f444447cb53f5ae5f";
        const storageTrieWitness = "0xf90813b90214f90211a0f83ec9daadc456bbef8439e0ed9c7f943fca5d66efd402741ce4b0272a6a928ea060db7af93e5731b82a28bbe1c6c27c198f117016c3a21588198b2f529ebf23e7a0474dbed27648dd7405c1e5bf3a524d0cc4e12c778958530b3ed6d4c676e8d87ea0968175500dd744e60e6b5c5c5b1522e51e49a656293ce6f49281e9aa115e06faa08a2a68bdaf9aeca13db77aba1fba14ebac5a1b636ca0771f5ec173fa6183e558a04e0d6916122e50272ead9e0873ff39a9a888855458d83b76bff3f89571c564a6a04ce789f7a87f64ae2bcdb3befac2835c3a0a18320beac8037120c1962cfdb444a0c07a00af604165ba9b04b3c3a59caee3b4046099c484dfd0cea1befa09518889a04d6c439c8750acb74adb4531dd7bf410e298835bc9ebc0d2b06d3c190db9ca87a0a28e6d4c2042f0a3e0b57f4054e00ab2ab2c2c428625d147df78823f0c9e195da0258de5c80e1a2cb8df2faca8615c9c15334fad7e3e9ca384c4fa020e43c6a5a3a012c711ef65aa42f007af6133dac637f4bf75e0ae9433175aab7a4faf9c1831bda0287db22b648d15b8c98532a96ca204ac3b02a4664651fcd7191caf57e0976174a02b668236cd8f910b0f424a3fe5adcab73606c6a59a80b3c30732b8bcb4655534a03a42ec2be35e3ec722af20e81d0d74dfc7a4c14308635f7de0904eeb2a715bd9a0f84fc7cbf0a2e3961bd952375fda050160a67682edbaacae8e97603a9b95fb8b80b90214f90211a083d0d276e47e087f2da9b151ceeca9740cf76c417fb8fdedf960ad2157164a70a0d6bf43f1f1e7acea604f9f00089c46c6f1cc073f183c748ce8acf596e003da88a0740155f0bf6935075214c47f43af63ef670a1e22bc583aea3aeeecf9ccefc63fa01a33190a60bb70b25ace847407f06dd31a35ea7de23fc47448f8ff83929d54d9a09b018debcbaa0d9ce8e360b9595dfb09852a415ed1d58a798a21b127df377bfaa022e26a74b7d6976bc922021fcc63b052329bd5d75b7b142729ee980f80756211a0c8fe9ec128a67c85ffd8e68b4b633fc410730e46ad66c2bca9453ec47a8f3d0ba0724a1c619c75b5222bf19fb5d879a0aac21238c5e744dafe7e46ad4b850ef22ba0ad90f3459b0c8b5a2f01942ade7b946002a00a203145be146c3b037fef14915da011713e34d30625306eaa93853c3deab701432fc6f2e30e2055fd75a6dcbb076da0579b83d92dd89e0525d7cfc9f79ef71df0c9488dbde6dbfd9e2d3bd9f73e9ce4a0af39bf58facbba207fb296ec10e440fd5b95e7feb23a7c86be8b7864451aa71ea0003422d6c76de165b23d8786e793a7993d7c39fde58fceac096627475980bf40a0fcf2736064c5edcb131ab183a27268147b0022ac2f57a7204a18aeb8a13791f8a0f7e014ebafef7a5944032d9a926cb06a3fba15e3dee39c153d6e08de6f47105ba0bf78f92c998d2ac920327b8e2f73645fe01505a72eb9562c051344f023fb317a80b90214f90211a010d6b1e82fd6ed7769146a938a2eb3a60d6caddd374c9e7cacc2a6783638eef0a05f056571bb24e28986caaf8decb63889b5b68ba5d32b4d6c2a25c1509c2ae81ea03a9719330a9aa95ae9c5720f0fb8efb0eb0ad83b2a43bb044755da95384d6956a02f7d0a1cbd7740e6d1c90fb232c97ab3c656ced003d076e279ef5a9286064902a03a98d58523feb8303707efd7c3b39b75e920786ee9541127444491b0518ff116a09d28da2196ac1b9ff3d376f9f6940b0c1980edb44cf03a46ddff99ca0f36c2eea0453a7da93ad67de4108f21bd398e92e4d26fab01a638d7f3b092773be4cab714a075129169dc6625b3fdd67d051fea69e530f6a55d37496006deab031e4f6d08f3a06780b5a4dabae856ebefc3ffe9105e5689016cfe4919a4dd2d508e1c89ca6a69a035a3306b212ae5c9c8f27bbfdd3c8d6c094136843327b00d9651a958868ccc42a00a5d3f4d278c6bede517279169613ca09825aba0a6985fca0f37d185341f8f31a03485bba5970ee0d8ee6508b60d566adff35f4b2be45623c3da0d5f2c20750a4ea093a9ebf8694bff70bb052f3a5f1577576bec0e07e4927c42e5095b7c890ed765a0c549de9637ce00c65083958a509e25babc9f4809eca786fc2fa638ecda7b5b48a03eefb76f474b7164f8f2bbfa30415bb29fc38f70ca669baa83113c2d8bfe51f1a0678033f52f3977ee5157e7d177f16f67f54be174f355f9d767f8d8779c1a248b80b90134f9013180a035ba1025ea309ad117aa00705470078f08bb34a24b3b2cb7f4f3f83adf1660eba011ae01428bbae3250fc67ffbb776e461fb02f0842483433546ac39843501cb078080a078379ca6c4d0a2b10db454b5aef180f98dfdc38361f587c1cd930d81d5fd5bdea01cdc6084e09870680a4ce4846aa6765836909aa15898a16bbacfe31ac97de43fa04b65201c5cc17ffd6806de86ea8a0c71dab7487569d021ab67007f49f58e24ca80a0efb15ed2f8c39af9d4d50e387c58d38956a02d295871de771d4a2c39a216549980a0e0f9a7e1740dbe3f0f1acc9a0daaddbdffb598d174f4491b17d7577ce05d9b3c80a060726a62801803af1c1d1b55fdf35550063e1059e24d49378351091543f31972a0c26e58bf936593855a161fddf2d2e15cd92544198cc889b7ea6e5ad4586fa5288080b873f8718080808080808080808080a0e52b97f4ffcb98841b878cfa03de4510cc30a4056ee83c140510097c6ec27bea80a0b17ee1dbd8bbfa067ec2c28e31bf7e4064ebd5f66a0ddac2133db6ae6df37cb980a031407b41f8a11b055bd95e731ec6ff45463086ca4b677d69d1428096cb3a7ad380a1e09e31a93313b94e9101dcebee9f20e901e8131c61f69e8e39334e74ac88da7901";

        const stateRootBatchHeader = {batchIndex: 85827, batchRoot: "0xf08ea46e2f71f274719c9677df83002770bb7610730cb192ee8e5a688257b3c2", batchSize: 971, prevTotalElements: 80391401, extraData: "0x00000000000000000000000000000000000000000000000000000000640e5e67000000000000000000000000473300df21d047806a082244b417f96b32f13a33"};
        const stateRootProof = {index: 216, siblings: ["0x575dce7e1e6ae2c34d740d4aded1b8c4a76df2100dc08e358921aad940fa2115","0xf841e42bfd4415e89cdffa02d50785862ec08015a44612263aa9051d3b96ab1f","0x915bada43d484f7b15855cfe1f59cd1551b457b944368517fa712618627e9443","0x410efe5363206b75b75cebe8d423735efd8cad74a72761a576b7de64535f3469","0xbde2f7b4b003cbc294821facb116efeeeb32b63045e6eb708fecb2c3c50e4f2a","0x61f6c79e92b05ddc9021f0ed6a2015dac3f788070dcee77f1c4223bd985c28ef","0x1c84cf3ee211cde11f44d330c5057593e6d61cdb144e4ca59303ade603af50ea","0xe00ff167ed41f0b56b15e93240522d5a9d4e848c3791c63e390ec70c139d5a7c","0xe84eb7ce4c8fa45b968296301a316432b26bc22815696b3582331d5010169070","0xd6305ceb0067da693ece6e8abf7ae75d893c1c03fbe8cc8b729b42fdea11b4c2"]};

        await chainStorageContainer.connect(owner).setSavedHash(stateRootBatchHeader);

        const proof = {stateRoot: "0xf96ff434a34b7acd3e8eaae0234f6fe835b43ebed5ec432db405e63aec6bc4f5", stateRootBatchHeader: stateRootBatchHeader, stateRootProof: stateRootProof, stateTrieWitness: stateTrieWitness, storageTrieWitness: storageTrieWitness};

        const resultRelayMessage = (await (await l1CrossDomainMessenger.relayMessage(target, sender, message, messageNonce, proof)).wait()).gasUsed;
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
        console.log("l1CrossDomainMessenger.relayMessage message Length: " + message.length + " Consumed gas: " + resultRelayMessage);
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        // *********************
        // Measurements
        // *********************
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
        console.log("l1CrossDomainMessenger.sendMessage");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
        let current = "";
        for (let i = 1; i < 17; i++) {
          const l1CrossDomainMessenger = await L1CrossDomainMessengerFactory.connect(owner).deploy();
          await l1CrossDomainMessenger.connect(owner).initialize(libAddressManager.address);

          current += NON_NULL_BYTES32_RAW;
          const result = (await (await l1CrossDomainMessenger.sendMessage(l2CrossDomainMessenger.address, '0x' + current, 100000)).wait()).gasUsed;
          console.log("Bytes: " + (i * 32) + " Consumed gas: " + result);
        }        
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        const OptimismGasHelperFactory = await ethers.getContractFactory("OptimismGasHelper");
        const optimismGasHelper = await OptimismGasHelperFactory.connect(owner).deploy(30_000_000_000);

        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
        console.log("l2CrossDomainMessenger.relayMessage");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        current = "";
        for (let i = 1; i < 17; i++) {
          current += NON_NULL_BYTES32_RAW;
          const l2CrossDomainMessenger = await L2CrossDomainMessengerFactory.connect(owner).deploy(l1CrossDomainMessengerHelper.address, oVML2ToL1MessagePasser.address);

          const result = (await (await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).relayMessage(l2CrossDomainMessenger.address, l1CrossDomainMessenger.address, '0x' + current, 2)).wait()).gasUsed;

          let rawTx = await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).populateTransaction.relayMessage(NON_ZERO_BYTE_ADDR, NON_ZERO_BYTE_ADDR, '0x' + current, NON_ZERO_BYTE_UINT256);
          let bytes = await getL1EstimatedGasCost(rawTx, l1CrossDomainMessengerHelper);
          let estimatedL1Gas = await optimismGasHelper.getL1Fee(bytes);
          console.log("Bytes: " + (i * 32) + " \t Consumed gas: " + result + " \t L1 fee(Wei): " + estimatedL1Gas + " \t L1 fee(GWei): " + estimatedL1Gas/10**9);
        }        
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
        console.log("l2CrossDomainMessenger.sendMessage");
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

        current = "";
        for (let i = 1; i < 17; i++) {
          current += NON_NULL_BYTES32_RAW;
          const l2CrossDomainMessenger = await L2CrossDomainMessengerFactory.connect(owner).deploy(l1CrossDomainMessengerHelper.address, oVML2ToL1MessagePasser.address);

          const result = (await (await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).sendMessage(l1CrossDomainMessenger.address, '0x' + current, 1000000)).wait()).gasUsed;
          let rawTx = await await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).populateTransaction.sendMessage(NON_ZERO_BYTE_ADDR, '0x' + current, 1000000);
          let bytes = await getL1EstimatedGasCost(rawTx, l1CrossDomainMessengerHelper);
          let estimatedL1Gas = await optimismGasHelper.getL1Fee(bytes);
          console.log("Bytes: " + (i * 32) + " \t Consumed gas: " + result + " \t L1 fee(Wei): " + estimatedL1Gas + " \t L1 fee(GWei): " + estimatedL1Gas/10**9);
        }
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
        
      });
      it("Test relay messaging with mainnet data with 522", async function () {
        // optimisim cross com contract
        // https://etherscan.io/txs?a=0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1
        // *********************
        // Deployments
        // *********************
        const [owner, l1CrossDomainMessengerHelper] = await ethers.getSigners();
        const NON_NULL_BYTES32 = '0x1111111111111111111111111111111111111111111111111111111111111111';
        const NON_NULL_BYTES32_RAW = '1111111111111111111111111111111111111111111111111111111111111111';
        const L1CrossDomainMessengerFactory = await ethers.getContractFactory("L1CrossDomainMessenger");
        const L2CrossDomainMessengerFactory = await ethers.getContractFactory("L2CrossDomainMessenger");

        const LibAddressManagerFactory = await ethers.getContractFactory("Lib_AddressManager");
        const CanonicalTransactionChainFactory = await ethers.getContractFactory("CanonicalTransactionChain");
        const StateCommitmentChainFactory = await ethers.getContractFactory("StateCommitmentChain");
        const ChainStorageContainerFactory = await ethers.getContractFactory("ChainStorageContainer");
        const OVML2ToL1MessagePasserFactory = await ethers.getContractFactory("OVM_L2ToL1MessagePasser");

        
        const libAddressManager = await LibAddressManagerFactory.connect(owner).deploy();
        const oVML2ToL1MessagePasser = await OVML2ToL1MessagePasserFactory.connect(owner).deploy();

        const l1CrossDomainMessenger = await L1CrossDomainMessengerFactory.connect(owner).deploy();
        const l2CrossDomainMessenger = await L2CrossDomainMessengerFactory.connect(owner).deploy(l1CrossDomainMessengerHelper.address, oVML2ToL1MessagePasser.address);

        const canonicalTransactionChain = await CanonicalTransactionChainFactory.connect(owner).deploy(libAddressManager.address, 30000000, 2, 4);
        const stateCommitmentChain = await StateCommitmentChainFactory.connect(owner).deploy(libAddressManager.address, 1, 1000000000);
        const chainStorageContainer = await ChainStorageContainerFactory.connect(owner).deploy(libAddressManager.address, "");

        await libAddressManager.connect(owner).setAddress("CanonicalTransactionChain", canonicalTransactionChain.address); 
        await libAddressManager.connect(owner).setAddress("StateCommitmentChain", stateCommitmentChain.address); 
        await libAddressManager.connect(owner).setAddress("ChainStorageContainer-SCC-batches", chainStorageContainer.address); 

        await l1CrossDomainMessenger.connect(owner).initialize(libAddressManager.address);

        // *********************
        // One cycle
        // *********************
        // L1->L2
        // L1
        await l1CrossDomainMessenger.sendMessage(l2CrossDomainMessenger.address, NON_NULL_BYTES32, 100000);
        // L2
        await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).relayMessage(l2CrossDomainMessenger.address, l1CrossDomainMessenger.address, NON_NULL_BYTES32, 2);

        // L2->L1
        // L2
        await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).sendMessage(l1CrossDomainMessenger.address, NON_NULL_BYTES32, 1000000);
        // L1
        const target = "0x5a7749f83b81B301cAb5f48EB8516B986DAef23D";
        const sender = "0x4200000000000000000000000000000000000014";
        // 522 bytes long
        const message = "0x761f44930000000000000000000000002ca113e1aa37d83662a1d3f84e209f7068700fa6000000000000000000000000d0ece2f629dd1cf73277263313ad8a05d32a9105000000000000000000000000afb50e978276e07d3ae3fcc7a96a8b05c5650e22000000000000000000000000afb50e978276e07d3ae3fcc7a96a8b05c5650e22000000000000000000000000000000000000000000000000000000000000177c00000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000";
        const messageNonce = 129817;
        const stateTrieWitness = "0xf90b87b90214f90211a0303bb4b6de93a1166a1da1405f8476b94a9dfe68b4fe9fe42e655e34d6202417a04cca5f625956d628c22221e476d297f522ca7f87faf3cee86e09f562f1b808e2a06cda2c66d5927d0d89578505e6c8edf88a6bddc532d2c3ac77b3055aebc8ea9ca013558a4380c8034d340adee7f906a07a81588f3241bedbe30f0c36792637cb37a0b9d713d3940d624913cf1c500b45ee278a9b2cba92c6d6c01e532fe1ec61a52fa06dac39c2522880fdda55e300c90b0c4e9d884b206108dee41d368c5916973fd2a0aa91a6d955fa2c4bf732522e20d05890b00e6f0487a5b73f782db2c3c5ed1a8ba01e9061ffb8a77e1463c09b9d977f2326835696ea41e32f0e33a68dbe7dc9c444a031aa476a4f4bb3e8d107c72aa91588d0087c5674f84e9b44662e18f56621061aa0796a77e49127954c0c05036b5c2b4715cec645f7f582eacf87855e5fe060e4c8a0dc800fa6a04ba590e055f4c3cd0f4e3243213bd1d9f627f03fc3e0c58a344005a0aa785ba634c0e6afa04b57eb6d39c620d0e0172df295ba30fde68e15deeba975a0218d6e6b82fb68584cc98374ad4a3e4234e4585709cf2a7ca45010b57e14101da0ee980b0ebab8a9b1e40ac6be3d22f533f24dd70a7d4a070d8b18df8bbe3106f1a02b090e98b690c5cafc87583e1706f5673700e7c2b606ff555439ae400bce7582a03cbc5033e2760f6da76c8f0b4baee97d4986f0f6a9753a8ad3c21edfbbd01fcc80b90214f90211a057a312290434269480173c145b21b32082cdf0834ff1135dc775df4c62ab07c0a0225f9b7b2cdcc34d1fae9d1f77f07846320bf28389c478497e08b084c9ab8865a0d8943205ae362709a29ffa47b75afc376533771c0b2ce65579db97f01c067410a03f4e1865d71a8fd8cbcbf9d715115ac8fd4efa52ca621a7f99ef629e51daefaca0eea6ce52cc44af8924be42025689885fc5a8d38f29bcd0cb7d3a433f2a94150da0eff943a05aee08508a2f2d051968b4baad446de4537737d22744020db4cf7409a0f4db25e6403b8da8f908587158aa6f73cefa48df92884160e52396d797c3f2a8a099fcf1db8b4cd446b85e825a1f91c799629b84cce0be9637d6617d10c511be0da0410afddfa8b4df07aade65097926c9a5de6f34b2f8e2528bf4766e611e68046ba0ea5cba7fbfd5dcafbc1d4648dfdf11d2a4cc8c6ef019d731611cfb93f5d50111a089f1db18bc213fe19053489685dd49b3964427c1d9c5d34df941a5e21d88927aa0f858f7ae9f9efd5318cc2f7aa665f3f71f37c20978291fb414c994275d444c2da0bc9e942b801e907683f962976edcb3ea76b2739ee4ae6f9942eac84b0b43cb1ba04bedd94651ba09db1a6be91d712a9a1f1fb97f3cfb479f5e82c39f281d9425bfa042f69d684a773dafe04b8d5b633033caa8bdabcedee20997f59f8da8dd1b2420a04d3b8f92d3fb1dfb8ef5021019d2e9d349618306ad6cfd737e97a32dc40a916a80b90214f90211a0bed7328a8f21761e83c12e77daf282495d1d11e7b64278fd60e96b2492979500a0a42572e409ae7b54e2317f7245229690eab59995284649a0f92f09740507b5bca0654465277772dd7b23866f8c2d34036f7474f9b678497af4fb68ffc40b380d6ea0421b764e83587e4ccd737f6d4fd77518604f4a88ebbccb84d412260fe8f5d218a0ec2d62f40f8e01cb0e36eea2bb15f0e4bc1143d00337a259b3eb14a5ce27d2aca070c5008c272804ced1d4e18bbc34f912da9aa7bcd4e0fda4e8975a2faefc4751a009d61023a81a14865dcba30442c1038084bd880fe88cd37ede6698e96c04de83a04b8fe25614ca4a5e0702e41fec62db6c00be5946af01ecb9cbed477f7e1f19e9a046ab948af45a4652c7568c15415335e956a6130c1e81836e17aba35a6640a756a0c073e13f646754c35f4b160dcdee33a9a89535e12dd89aad56c6b4731be58a40a03899f754c96cff6ec97255895eb300675a63f0befb25e74b37aee234d0f7cc2ca06e5e80541f3c752792c2b0ee37ea4913ae95bd52c269adfc6c27be20957d55d4a0b016ea3671f9bddd59106dd3f49ca9c93a8c58f964f2f88977ee5714fb96ad8fa06b60f80d1c2a1341b01605b8efb26197bdbdac58475fb8fcc6cff81935caaef0a0ce27b9824367d389ecf30ebdad01414b0cd1f1cb056556e495e19c9178586ad0a0f2864a42ae8cc822b596c604610bc4f292a55cae6e0961fd64738b2bccd5af2d80b90214f90211a0a8f1d6fafebb4b5075b1e84ab35b1db3b091eacc4a7a1e3ed450a107a8ae9626a0590637fe01bd5a87b6b378641f84f4a085c768c9e910d937d14459a5dbc5fec7a0f538d7643c5e44c345581b4aff80ac62b31d314300c26e9295b7c64524755fa2a022094174adfacccf3faf640c7570714bc7ee1a4454b5a8166588ab1ff4d7362da0c30351b9c74815fd4f06e5eaf8a179360e2df07d0c6a5e1adf09a290876763d7a0dd96ed72ca7b858e3141ba01dbe7a54a7fbfe3acb87ad8ba4c28fb27caeb38aea08d687b26239b96e14d81a9929b8de8a4ebde3ee1f481e020f4c10cbcbd7dc0b0a0976a1a725073d82231dd3bfbdf20878fdc6155d8c2c4e0cb9ae347dff6aeaecfa0fd8e0e10c72244ce2f6d1f715e58d3f71d5bcb5efa0159d4ab48c959829b8f7ca02c06c2b05eece418dec4229d80fb9754210c85c4cdca9bf78cea435700a1906fa0cb938ce34ceecc3cb269ea8eba1b38944e520a5e0b713950e8c32611df936c68a04c16d24cba87f09b2e3f263dcba1f1aed2a21021b5319d7cde79c6f7b5e78c73a00d69f5dbe45ec6949cd00c6cf175ee56c044b15aeb3fb3e8a5be460a782754d8a06ffb5b20cec1292683fb18f5b2583ba2466fd7002b0ae28e061b85486ae29e67a07b222bd21217689c17dbebc95b8651378c02bcc074af0d78c6c481d80e469426a0f1274e9fbc1fd389b143c2bd0f0b4fd42265400b646217a8f3ce6f9d908cc44380b901d4f901d180a0c84d3c2176e3a336b9078bccb360c2237cfe5e4de7a73e3b8a1c673b0f8748d4a03c7748b6770d36dea58a9cfe6b3d8a00a4559d95234b92d0a8752ccc00d37da0a07f5675bc09e7c39ba1b7f781aa201b85f0ea001b67e5ab12c73a8bb6645661b5a08310375252901cd0bfaafd4672d2fac3a9df0b4c02090f6dae58acdd53a0a99ba0b131fd2b55350c21c4e93973697afc020ceeac47f89277d41676572f40e17e9880a0584c48f053c3b7d3b2d0abb99551e57c059b596d7cdfc73f98dad9eeaeb8cc18a0735219230502d541b27438a653cf261f0119c39c4e2d0b676a201b5e7e82544ca0961e6bd8a7603562443b1a9ff229c04ffa219adb237e052faa0ae4c0b3e0d3faa060520e5bd2b2cedf9448bfb0cd21083fe0da4e425459227cc503dbf4b8513159a0fe3f2416baaa999934dc10c8c60cba7d93d2edccebd4e440bc19c548280aa473a01fa04fe6007013570445228a51240352538b2de545b31e3afb27a7c4eccec42aa04542c3e17ab8e4fe55c72ac67eecfcc04458e4ed4c117b72dd781a578dab597da0601237f1fc265a30e4a25f1205b1d6ff471b5b83f9880b803c3401dbeb39d828a02ebd1e7f6866019d07cd8803228d3fee12091d1e16aeeab434fcb5ca0eb06b1c80b893f891a0e2ae5a02ceb21a3ad07f80f3bb1e04462c166f0335e03622e8b6fc76ab44dc54a071901695ffd7a4f198a21fa762ac4245d76c6f11336b077967ffe4505254fe8f8080a0b30f4552a12e236334072f564c5551fa591be4766ead43a9f43f2f2e81aee8be8080808080a013ea7ed65b31d32b8253e4b14e686232d5763385b61d41827ea3fc9407469f88808080808080b853f85180a0b4b8de668d0f0560514ea7f2dbd7e66048ef0a221114bb9c244696357957129a80808080808080808080808080a001c306eb230b0be100e8fd23c6e6bbe846eebf6d4ed88cf625a4182bf92a1cbc80b868f8669d3b46a2440f3eaf346b6c1ce588ed08712591822a258c5a1c4cf44cd0c9b846f8448080a0933e1b6f740dac47dbc724de278b060bd77c896ce6a2614cba9b4531c7ef4b8fa011a24190f7e396e61e0fdf84fa138cdbb67aeba7b4dcbb1f444447cb53f5ae5f";
        const storageTrieWitness = "0xf90806b90214f90211a09aca9419596159009cbffc78117a4b4db5a0cc9f018e547032f5ec90e7579af4a0c03ce476a9aa48e1a321f5a2d7af1fe7908ca6fd7fb5e8ca5d6f6ce1667e212ea0600b101cd5c5b4d65cd2acec7da22421a7bd1c7306560b58a156883354e2c9f0a0a5f17750cc1922a7d745e28028dd179410b38996abcb0097d45c1f40f434acbfa0fe5e406fee4afb8830b207be96bcc196da2cc25ea1780cf59db8157370b2e03fa02663ced5b88bb48f62a216fd3305780f5287aaab552e4768b14dac30fb37f56da028f9601105bc4cb57b3221172ad51dc094b90e12cfd75fb086fedb62c3dcb9bda0a89d1942da665c14a6126a30e598d0132236435823f65dd874a9d5e9a4fd8451a0f361960f706bcfaafb39cfb022014f2bcf3b10a7a8e52b22c273277485727aa3a0189bd8b05b32c7e916d2bef585318fa5def32f03539dcdeb4d9562a91d4cf928a093e4e0eba629cc9296a97043bb213fe9b909342a36448c994f66c7de03fa4b25a0c4847c919d419c100f24fbfe36ee6a76f0252815cf76ac1056401bf9daefcb22a058f4145399f22a527b18bacba341601749fe4b35a86d13184fff698c92c23cd7a06dfc635c72a35517497eb7f5979f41441fc03914dc4cbf1dc032988ad9b9a280a058e039baf80992c4788dfe55286a8b704bdf1574d304654314cfb5b36f4a1733a05d3a8464593074faa6f7553e15eed06d0ce125b1fba743474a7fed954e58fe9480b90214f90211a0e58e0af73a48410f975ae63e570e5ca740f0b9b5914ffe8f91dae5534dba587aa00b661a0a08603ca77dd48e847c5a59c47380a16d129ca3f4d8790988b01c237ba00bb63275965194f552b546e4958cf8d8f6138ba819c4f112b7cbb484c808877ea085f62819ff7adb034d39aa9f99b937595e06c80efe1d788c5b84668c12470cbca036b8912be2ab1ebf63364f3fc40f2672f5381a8ae8f7e08695597de2ad2f47d1a0525ba2bb7d9f0ec4912bfc4f0830473c277e15e08e7e1f580a43a088b77610bfa0a3450ce4788142384cc0c44ff964898faf119d275f1d17fa76f15b982c57914ca0d0084e8af3cf7417860020314398e46a9ad4da5d82fd976757ce7033c92fa414a078dac1b1e6eb4545b42f3443c9e3d58c109dddbc82f932cc99b1ea4dff8d363ea079abeef762465f243175480dec78721efb5c18819dca7e0accf6f49798b4ea5fa050b8be8aaf722981e1e499bf93889fbbe3e1c3dbaf653f9cb7aa1167bc9137d0a0c13f85ab3ce0985980eb494ae078fbcf91c7e5f5d8f3bbd20cdf8af66abe9850a08bd140d8982743bf7264b8dd44dc1f1001074ad369ef6194e0d6a39026f2f9bfa083820d007d1c5835632f2879698ef5132c19e70fb741cc80053d93095adbdef8a0eedc99fde36f8ce074d787b577aee08eb81d6caa4a26d61aec134bdab3b84751a0430014021d04c0041f356a1c7e905725ea9bbe5c84564055b99e2f20de91eb4580b90214f90211a0ba6b866468d12bf58765cb751546a79dc4bad89ee858958529b027ea0dd61d4ea004abdc246b9ee8cddb52f58d34eafd67616537e583a5648182eee47a55fce5c1a04a158c5f001af5e866fb090ee9cc6882b52a3433b812e620578b221ed7af813aa0e6a63c892f9efa00f0992c06345463f839d82725b07132115fcc6e349de6cae9a038666600874adb18032e1fb1e9948c0c6967c0347d85dc5cb8f64fc404c11d5da04af2ed44f4ff74ed136322054ab933283650d2bf815c47d769d1e6536bcb0e7da02287580a3f190ffbf464b84ac9a1f75a52f8e6baf6b2f91f83a2f4ff4f6324b7a0887f3f9d47614b5e541b3e1d775ff737e2a4829871f78e69f88b5f84464fc4aea0f489abc3c26e8c19829a6d8196ab54055e1ac2b2896e12ab2d9883512908db98a07ace86286e671a1f379922a71a401c27e45b629eeb1152ddeaf30e3a94ceb405a08795e75bd8807cfecec7a4938aa59ce27d8d8b74d8f34728442d365de479a435a0cc270659d90ddce389dad640e84d00a6b464a268ab0d53b0742442ee0e0539d4a0e90cdcebb55a30a85429777491777f3071d704499dae2d208fe080c8257ad201a0351513afad7187525c59ca0602af588aab16395123d419c92cd8dacb0b1dd663a018aa135ccda48a2ea3e68c83b710e2aeb15bd724a9a0317eca53a431cbf415b9a008d0c1d11f62497c500008a5bf6ba7fe633b92637d5aedd8a77100c0987818cf80b8f3f8f1a0ee57164385e79283b9d52997c012017151abc67695c49357e362059246375c18a03690dc2544f498ee455dbee982d3f934b5a3e493794ab838c3282130aa40f63fa0f9bda8cc74e9add1cf44b93471a65d4c387c44742c06964726c43f893630a572808080a057a0ec7d11ecddc387215372e5fa54a6691901e18978b9f95ca8620d763212b680a00e834d6252858afbbcebebb0252e2c6bfa96ae4313f2b690d025e9788873743680808080a02a567d5fc5e7d89c47837ccd654acebfc56981fc4989ef33864bbcc2b43273a5a04f81f4526e2d1c493d199daf3d5c9c9a763270f8236ded03ebf2acdb4af156088080b853f85180808080a0597181a0fce7ffd59fc19ca54adeb31584aeab30a1a821b9513c8e5b508ad20780808080808080808080a0f5bbec6e8976e1056dda283b8c7445c64821d8d4d9ccfb5ba8aa69c37eb876e580b853f851a0f471a420e9c5d7caf33747eef839dda5afdbfa82b2c1b19f71ad061c297445648080a0afd1faa29dfa635da90c4009767bfecc2258f430f48e4f2292b675bf5ecdeb6080808080808080808080808080a1e09e2018453d694332d6b4b8e2cc2fce3ad461c2beae3c4313eb6e46460e581f01";
        
        const stateRootBatchHeader = {batchIndex: 83182, batchRoot: "0x0ea5018cc4d21d9410fba612a760412a22121c5bbd88f249bab03aaf4043920b", batchSize: 971, prevTotalElements: 77823142, extraData: "0x0000000000000000000000000000000000000000000000000000000063fe6dd7000000000000000000000000473300df21d047806a082244b417f96b32f13a33"};
        const stateRootProof = {index: 219, siblings: ["0x6582a6f0b876ffb3dd09d5048ccbf94f095cc88d463aa72fd8e8c5fabbc51e8b","0x30d4226481c0028639d9db4c5e9f2e8624d6fb2a856d956466c186905ab0ef2a","0x2864a3f8344eee423c85553213921917e443bb23716b71b7367e4bfd8de04992","0x1ad63b90ba58475934f0142553826b0a54701cda4615f2c4d7a70b62beb0222a","0x1162724e8ebebfb6d24359ca52811f0ee3509c032337d0f585d31e898ea0a91a","0x200dd0e32140d0ab3309cb11b227d4fcb4e1b1be9b9ebc11c8d264f1c61e8aaf","0x06feec7592b302855bc289858f5b3e8f2821966f609ee983f304ee328e06a700","0x6b596ef211bc4034e9ddabba3ecf3c6fc1ae5dd15fe2118b51775c9405e8e791","0xa408d08c19f6a4b7ea32d45bdfc4adb1eab569aa4c50d93811f4f26f0a850f88","0x2d9874ba2fb8102230d6c1ae4aaab8ad7e1db2b52394a0bfac869b9367078256"]};
        
        await chainStorageContainer.connect(owner).setSavedHash(stateRootBatchHeader);
        
        const proof = {stateRoot: "0x03dcfb2b7822f72dfd7c3c071ba49b9f98bc07726f1efddb77d5dfab3ea3d164", stateRootBatchHeader: stateRootBatchHeader, stateRootProof: stateRootProof, stateTrieWitness: stateTrieWitness, storageTrieWitness: storageTrieWitness};

        const resultRelayMessage = (await (await l1CrossDomainMessenger.relayMessage(target, sender, message, messageNonce, proof)).wait()).gasUsed;

        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
        console.log("l1CrossDomainMessenger.relayMessage Length: " + message.length + " Consumed gas: " + resultRelayMessage);
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
      });
      it("Test relay messaging with mainnet data with 330", async function () {
        // optimisim cross com contract
        // https://etherscan.io/txs?a=0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1
        // *********************
        // Deployments
        // *********************
        const [owner, l1CrossDomainMessengerHelper] = await ethers.getSigners();
        const NON_NULL_BYTES32 = '0x1111111111111111111111111111111111111111111111111111111111111111';
        const NON_NULL_BYTES32_RAW = '1111111111111111111111111111111111111111111111111111111111111111';
        const L1CrossDomainMessengerFactory = await ethers.getContractFactory("L1CrossDomainMessenger");
        const L2CrossDomainMessengerFactory = await ethers.getContractFactory("L2CrossDomainMessenger");

        const LibAddressManagerFactory = await ethers.getContractFactory("Lib_AddressManager");
        const CanonicalTransactionChainFactory = await ethers.getContractFactory("CanonicalTransactionChain");
        const StateCommitmentChainFactory = await ethers.getContractFactory("StateCommitmentChain");
        const ChainStorageContainerFactory = await ethers.getContractFactory("ChainStorageContainer");
        const OVML2ToL1MessagePasserFactory = await ethers.getContractFactory("OVM_L2ToL1MessagePasser");

        
        const libAddressManager = await LibAddressManagerFactory.connect(owner).deploy();
        const oVML2ToL1MessagePasser = await OVML2ToL1MessagePasserFactory.connect(owner).deploy();

        const l1CrossDomainMessenger = await L1CrossDomainMessengerFactory.connect(owner).deploy();
        const l2CrossDomainMessenger = await L2CrossDomainMessengerFactory.connect(owner).deploy(l1CrossDomainMessengerHelper.address, oVML2ToL1MessagePasser.address);

        const canonicalTransactionChain = await CanonicalTransactionChainFactory.connect(owner).deploy(libAddressManager.address, 30000000, 2, 4);
        const stateCommitmentChain = await StateCommitmentChainFactory.connect(owner).deploy(libAddressManager.address, 1, 1000000000);
        const chainStorageContainer = await ChainStorageContainerFactory.connect(owner).deploy(libAddressManager.address, "");

        await libAddressManager.connect(owner).setAddress("CanonicalTransactionChain", canonicalTransactionChain.address); 
        await libAddressManager.connect(owner).setAddress("StateCommitmentChain", stateCommitmentChain.address); 
        await libAddressManager.connect(owner).setAddress("ChainStorageContainer-SCC-batches", chainStorageContainer.address); 

        await l1CrossDomainMessenger.connect(owner).initialize(libAddressManager.address);

        // *********************
        // One cycle
        // *********************
        // L1->L2
        // L1
        await l1CrossDomainMessenger.sendMessage(l2CrossDomainMessenger.address, NON_NULL_BYTES32, 100000);
        // L2
        await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).relayMessage(l2CrossDomainMessenger.address, l1CrossDomainMessenger.address, NON_NULL_BYTES32, 2);

        // L2->L1
        // L2
        await l2CrossDomainMessenger.connect(l1CrossDomainMessengerHelper).sendMessage(l1CrossDomainMessenger.address, NON_NULL_BYTES32, 1000000);
        // L1
        const target = "0x914f986a44AcB623A277d6Bd17368171FCbe4273";
        const sender = "0x03D7f750777eC48d39D080b020D83Eb2CB4e3547";
        // 330 bytes long
        const message = "0xef6ebe5e000000000000000000000000000000000000000000000000000000000000000aacae10e53b5d538333bc91863547713718a4a15d877021e7d37379606636cff2000000000000000000000000000000000000000000000000000000000000008900000000000000000000000000000000000000000000200fce4d521792c58cf000000000000000000000000000000000000000000000000000000000640c03ac";
        const messageNonce = 131532;
        const stateTrieWitness = "0xf90b87b90214f90211a0b30acf15c29575ee93e7c44b81984e912356619807a806a3d813920af7b2762ca06787f1d817bf9a604002a386df4fdabfd2c15da8c4fed99edb12799e7c4e33c5a074b806253aeb390432fe08843e6bd0f188d52f349c14b06c33cb386bdbc01657a048eed8fb1b8b9f56dc008fe19123d9879a67fd4360cd442e6bc6783a9ca85de1a08ae9cdd0d0927d6733a4620587828d5f5ccef42f9d98a26d558b904d974a1154a05f6a7b7ff98081a50df252f26eb66534531aa0a2a120217ba78aafaa0b58a576a0b20868e85d21bbb9b550697882d8bf77b71c18f5785233f2f3f75ea5320f4ccea01da0f5788ea6e9c3d66ffd597050c40218b4b19fc4eff0d2129aaeb79a9dcd47a0171abd3a9187fb78eec570cf873cd79944a6c4087b103d51236219dbdcd5bc90a0f6473723567eaa24c21f21e049347a60edf1136fad8d27cdc455ee2f25e4ba26a03f0428fadfab794180bbe77777b44680cde9eb70c1313127baa0eef9a59ccfb3a03e34ebf7a6df453beec0d349a34c8a54ca05df200070abde8a38090b34964de9a0184b134eca312902c81dd0427a96415c56dda810b48d22803f57a8e878dfdc04a03471c7daa2b3937fb567d77f7b4850a0387ee845a7e8f69a3993261b9e69425fa037ed17a13bda8ac878e5cf4062fdf6197615e652960f762328c964aa541d5845a0c843f2872a6446a87e4ebd8377850750b336fd70886faddce22b4318107a8e2f80b90214f90211a039c7314ab65430475a6bdaa2685b02c8d15d4a943b915c06e471113adbdf0955a014d80799d6596ea21d9d2575bca8db3ab703c314097f094869c733860a15cb55a02ce970d116f76faf623153f101f7ee5e39e6c39d86e9fff01b16f37f24b26669a0a1a08e9595e44b23b4588fa393ddfda2333d9f45ac5b3a7e6e4822548e332620a0bd88ff42860e02961aad4e26a09a5a108d963a6178a6327211f25c05de95a3dfa0d62280860be537c6bbe425a0d400b1a0d029d14a0220a68fcd9fdb130c991174a061df5fde983a7d44b2f954661be77f3facabd25701b89e7dfe2ed7c1a132061ca067665bf8674571b81f492904415a792c48d5ee5c2416aeaed6d92d024e86c668a018da6dc8b672dbb34277a9f2f2fd024d1904bf7f13038d60b18d3de825496d4ca0402b791d67bd00f92aa68be4dc0850ae371eee24fd11ae183583114d4a701c0ca04edf32258079518209a775840aac34e04e045804b77ef8d387831d1884e42091a0983cb404d0aebe0f9d16fd50880b0b41ef920f39fad1012bb0890a9ea1f96a6da03d01992364d5db5c71198be86425e67b3711647df7f365d1a52019e4c0e68b03a05e076dcc3bad57a5153777ac8e87f80ad0ba95eaa0a33c4c9126ecf94ddd2272a03872b50705cfe2a8b49421b7a1a8630edcc1cf4f559ece1aeb4273f540957527a05bd799ae83dbe88d3a68487518cf186092f50bc2da3d667153d8b30331827bd480b90214f90211a04e7c06f158fef533c1d94472fa0b86090a6cc8da4dc7d655c8a2394b892619a4a05c100bff28b9649113969e48d6e77589985112aa37f732d41eea94b1fb90cd8ca0e8a6837cbe0b06faa621a2398b01600271390438ccc09dc5edf143d3e7f4445fa0944a6cfe1d225fddfea6cb72763af7e3bca6e6fc9e873c4b5e91e3ffd6d6579ea08b1bd6ee35a3fda775eaba211891854ee1ecb7f728a69d96cab370ae8a59d65fa01c91051532033150d06e94fe0b94abdff55c88abf3723a42519a74f8f971d56ea09b90ce31908161272ebde413bbc3549a75ca387baa18630feae318b7d24f8ed2a0c4c4b624ef1e707898a079c1ad9fe99fce4d9096fddf627b044d24b1fa164eeba0f6415157877d4ffbc50e40be963112aee562736d2cc0ad3f321e7a2f81566d8fa0c1edb084126192bdcb129bbddfb2dfbbd9f73fb727078e4b63fc213914de3f64a0ff4cea9a239096f8b548b97f42af884acd26269310a2a07a676124ce5146a07aa04bfbb64a778699e10a3cbc314e64a39e18aaad7f17cae2f04499a3809d922a78a0db646b6d17b0348675cf95fd18cd3dd2b44dd4aafa6d5fd09681545a56610ec6a0c621a35c18d083a97d0eb4a1995355e1508fe0fb03c81677a30bc700c95f700ca0601b06a09c98045ba4a718bc9cab3f421dd30923a33e99feb5a2b4b8b9e29d9ea02fadb7bc0fdad643cac7eb7f398328d93a7e43785a9c4d56677bc97accf8d1db80b90214f90211a0ad949c96e603563cbe4e12644cd1ff67d43573b1b837cb3ddec5b352e81f6540a0f80f9fd32d3b4b1d8928fdd128116d2589506091a157444390f8bb5f64f2d3f2a09c69b73924420892c8285020fed4c0479b09c4f5deb6010318bc426775bf636ba0ecda54c763dcdf15017bb9d9d003b0d27fe38208de3214a6d021441a58fb254ea033ab021f94f2cfeda0c2c94e49273f29cdc14423180592d72b0b85e97df8eddca0b5b687f2a17e199e56de70e3ec73ed16ece5368134e5d2ab579aa3a37683a124a0597fa89e98f6db65530218e9bd09040180afe3bebccdefaa5a637591b661942da00686fad79a4fd8195e51b9d8f19d35024435090960227c1d82aaea21ab816f05a012341b57670dd3f11eb3189118c5e0efd97c5010eabf1d2204c705941e397fa4a0399fb3f1c89cb67a24da9f47402dcfd1c48ad752790e698ded2e46cf105b3f0ca08919d3c292c44a4b82720f350da43f7fd0dbf8e0823f8a39c6d40cc0dd8635f6a0e631f76d6cc8bb28ae3237562659db3f068fa9708066651b45ed368188bfc5a2a016019285a38946b7757615270d2f6862d9e6013d23f103518a7de017f9e2c2caa03300efcbb9c5b30e2dde73a418d645b7b7b913b795a41e42a6d5ba0ed3e6c56ca029d387c1f166ee5d5905c0ca57aa3373c285788056b2b194a23482c0155c0aa2a0c774eae580bd5672617bae935d9ba94be515b4df6aa8038768de0368456a254980b901d4f901d180a02f65e5698fecccc36e05c6196afaafd85ae9fb9089c3015277e3463763ef2ca5a051263b6ce89a9aad633536d8ff50131dbbe2ce121a089f0e1c322f828e079ed9a0dbcad8bf7fb8639b28620d79b38b8151561e0eeb64784cb20bcebc2b5ef27243a00762049ebc67c114590bab773a1a72982129f5b675b7d91ba55c7fda8eb8ef26a0b131fd2b55350c21c4e93973697afc020ceeac47f89277d41676572f40e17e9880a0584c48f053c3b7d3b2d0abb99551e57c059b596d7cdfc73f98dad9eeaeb8cc18a0ce53c52d6dc58bfa6ae8c2c1d504e67c98b4f050ec1c4583d65d913cab2d89b2a0961e6bd8a7603562443b1a9ff229c04ffa219adb237e052faa0ae4c0b3e0d3faa02cb727879aab6796c25094dbbd68eccde995d4d825e49eedc8b3b3a4585f4eb3a0fe3f2416baaa999934dc10c8c60cba7d93d2edccebd4e440bc19c548280aa473a01fa04fe6007013570445228a51240352538b2de545b31e3afb27a7c4eccec42aa04542c3e17ab8e4fe55c72ac67eecfcc04458e4ed4c117b72dd781a578dab597da0601237f1fc265a30e4a25f1205b1d6ff471b5b83f9880b803c3401dbeb39d828a02ebd1e7f6866019d07cd8803228d3fee12091d1e16aeeab434fcb5ca0eb06b1c80b893f891a0e2ae5a02ceb21a3ad07f80f3bb1e04462c166f0335e03622e8b6fc76ab44dc54a0bdfb27dac2b8d148350a9ae5f43d1bbea9b56e7ce06187e744536baf036203168080a0b30f4552a12e236334072f564c5551fa591be4766ead43a9f43f2f2e81aee8be8080808080a013ea7ed65b31d32b8253e4b14e686232d5763385b61d41827ea3fc9407469f88808080808080b853f85180a0edde26f96629937a2937bbf19a6d429e147bf6d4f97b38a046b546b8d00c77cc80808080808080808080808080a06da7b13be9147cc29fe975d1e456206090ee512a9ec983986b42096e04fc051480b868f8669d3b46a2440f3eaf346b6c1ce588ed08712591822a258c5a1c4cf44cd0c9b846f8448080a0bc3b487693f60b12206345ebf891adf59eb0d105d0af11928e6af629bb0c9168a011a24190f7e396e61e0fdf84fa138cdbb67aeba7b4dcbb1f444447cb53f5ae5f";
        const storageTrieWitness = "0xf907dfb90214f90211a040c10a0410807fe6791d0f3a09e78b8fc9c9163dbf58497fa97bcc3122e1f1f8a07ebf79fa6e92e58967a8ec2d6be514a41dace9d75965ea1eea0260d6d6497b37a0fa9d3e62edb4d60259539bd3fee00112124411a97635d9724079515c966c44b5a0b6486b3952b31589a6742f78b23c8de8b3bc4a5c8a2c33dcfb3de6782683c6e1a0b5ba7054feee11e7859745223d3005ce57d864b00d66cbc7e8b9113c9eaf0e0ca09d2843f397cc725861c041e6a30d75a2313d646f4d719cb0382ee87506a78ef7a0798fa7598f67cec727d9e8b99d70f1c1a61966132d50c114b47bb7d1a88568fea06f742c5f8ccb5d59587727ee5ec377d03d4fc5951c6aaa2767b0cc334091b16da04e397de628f18b80e15e8a74a892d79bf6898d458609eb778e8012500c265214a0078b454dcd32f2df61e6189fb5af7d9569e23d4df701633c249c9fcd498ff5d7a0e4807596835090b6ea3b97df7fb62fbda860f0d1fe9b7323a792d3b4e16aa480a0ad5683950d2cc549b0f31f2f68c3334f190fc12a9370b7fb6a909135cfd23c2ea08f67b84a3871708c33df034b7157c888a1d697ca8852affc1ec7a11b5310f8a5a0f72e8b7fedf99666abc04c5c947e16dee9c57ac6889b7d17691f1d402c6e21daa0cd77eeccb15fb12d67181d023454a6bf0a8fbc04e8d8823cab74eacf8473cedaa01bc92c0402211a726c3f7d1f549d03a56c893d07def2ad6543bcfe7550e523b280b90214f90211a08c2e0dd9f7a79beca3624e338b4b19a5dd03a7e72e0555befed4917c8264222da00424133d33854c472a37ae3d0f718e95d1fd6a83999fbc2f1e393683b24b1e56a07c4ac845aada2679411377283d0b158b503ca0ca931a1a0560e03880db6908baa089359d701f1afc3539d976d79f4fc65b2344b696772d04a2895c23be7095b2aaa08f789370c71d2d6716313b10e7f768c0a7356b4b69349b0cac0451a212a0eaa3a0dd415fcf2432d03b4df5fc51741a723883cdd4c1ca7e9a6088704d1fde97edaaa041a778c922be74848d844fdc7c5adb21be5ae2ebc73e4d0c8183e8f8245771f2a0f6c1f4f7e6b04bdbb2e7547798bba96d10939fbdc0082b9e4464a6a28286b57da05334e76c92b397601d285b14e9ed7969888908725cf70ce4c849865ec1ddb1f3a070b9413568e26c159480f14a7f953bc632037b2717318aecbdd25ac93f09e45da0e95dd1083e90693768cc58cef8bd3eccae4214624eb7dcc253abfbc8e710a643a0041c5de5098aa5623511e850fd6ec1ff1893ebb6a039210bd5c8eed4b5f44f08a02fc29c108b877e3c556c44fe635b9d6886bbda0e9b749027afe672b9b2409567a07b3819dba4dc5766fe24d7e38de68bcbd0f02227b6e58452a1c8404aecaf264fa0f82fdef1a6bf91ceb38a50943b8e8a713f6bf418ee9b3bbb1d45cfaf454d10d6a07abf6905cb4bae46ce37850204513c6c89c61cacad727f78a4ce8acfc615f57180b90214f90211a02f5b9f8fedaa587bb6adeeb2e85bd8fa5c45f0673364f6063b722dacb75f21f1a01a6a62218fffef115019f08b7cf454cf2846884710fcc647441d1309acf49553a0b070329176d1b1a5328fe51fb4a8201d2934d94b19910cf45f5a01b8180d9902a0e10c92dabd3d68ec8938af2f70665d2dcdfffdf53142a2ca72b5ce84a2d396cfa05e9d351eb4bc1da936639592d18b30aec1034c770ae6ac5a4bd0546ff66b7a16a0028addf16f902a6e469c6831bdfde5759b5e605e3818a1ea0eecdb1557a6082aa07abf736491bac3eba62f765bddd727cbf807b7afaa7864ccf41220fcf2fc92e3a0a5d2d0ec28e6d2b620c8e0017b2a6ee59a7c23b1b3b000c7a34843ce55b8fe06a05ee6b189e1fbf852868f563dc7940a5859a86b30e210200da194b6084d813d98a066124df058b44732381abec4073bfff15082b9a0546d9564d283a0856a446b19a0c13c7487b4ceb9a5669396e12973364481ad1e0325750a3c1eb5657877636da3a08bddda38ab2d407801b9f6ea1abcc13c1055011471322106d8223eb5b5a73102a010987b7c65d8535f27edd68d7dcd79f07e9f0cb141a2be1b3c09aed0c3dad4c1a0d686de1472f154bcd4ab98f6630f230eb95ce5bac5e3d1ce4a7a86ce8e8d2582a0744e94ac35039c919d02e2f7ba649e910a04c975ca2e1f1620df60d14b8d7b96a00f18151efc6617ad726cd95aa0e53541c095ec5e4a9ed88ea4086cac2015438a80b90174f90171a062ed9eb18925d37469a8f692e49f08c87a97713a1709d30aaf767e2fa3507509a03d7197a95858e03a331ae550dc8a9df352c3c8bb870cea02147da67f4e4027e480a0ce9e37fae2cd4793bec062fb274077703d20afa6b24e4fecc23e5bbb44e051caa044ebcba35b8a8adf39c0158af503005802f568a9cc680e026ac1e8a609a9086da02c3ac6ccd5054ea9f48d2d12ec55e39204c37e49ddd9f4997e02e792e3b0c013a0c240cfb95c9d1b2aa12ff24cd1c25d5afe325e1fa09b3ed6db4893f7559b3764a0903533fb24b27adbaaf72d9646e33169d3df639aafb1fe9e4b49a64f6211163480a0754bd99c4464551aad3b3b5fa0318e4c8b48503df12450592eebfbdeee7060ab8080a081eff945f61ad133dad875f14b658be99e674bbbfbfaa76a893ddc501f641869a06b077c94676831ddc043bb90dbe092937458e5e2c0430e5434e639c6292df5b2a0991eb64d0c27adac011f2ea988ed16abf61cff412c9029d34df2c18b56a2324b8080a2e19f20555728004c18a0769500f98c90f3ffbf698f219f5eef1b171cd7c4c6930601";
        
        const stateRootBatchHeader = {batchIndex: 85415, batchRoot: "0x68fbf1ee8289bb92ff06b0e5d9e1d884a82eed83b117762f0333606f8a81f7fd", batchSize: 971, prevTotalElements: 79991352, extraData: "0x00000000000000000000000000000000000000000000000000000000640c0457000000000000000000000000473300df21d047806a082244b417f96b32f13a33"};
        const stateRootProof = {index: 523, siblings: ["0x790b1a16e0703774d088ad62bb36d84613a94866be2d3fabaf59b275f37b4ee8","0xc29d8093265e6237645550a1f54aee8a663e992752c0cadd1f14dee383f46aac","0xafec6eb7ecfb11fdbc342b619e62f9bfa071bf326919a0294131555983b6ba38","0x8fefe4f681f1d78b57dd23ee8389ec3b82d54fae27ab6caf1e309bf5b1bc5bcd","0x3fb4c1f786f2126bf7560418785b257c58a662de17782c3802df9d84fbd484b7","0x79dbbd5cfd78c1f1c58c48387b5c8a4ff059a47b08c44d13c3fda58e5ff66b7c","0x0e7882a98e6ab4dce22ba4bd11be12b4ed6fa9a25b8fcab788f155e2cc7712ba","0x8fd3622d1e216c3119dc7cb066510686f502cb3b535ef3a921b5b57a7b2144ce","0x43bf159d1d49a5c3acf78b160aafe17952bf0a4d087bea180d4e2eaa631e9624","0xca7198bbf1c9ecb36b1453452e69e6ef8f81aafd0565376b7561007ad4880a20"]};
        
        await chainStorageContainer.connect(owner).setSavedHash(stateRootBatchHeader);
        
        const proof = {stateRoot: "0x4ef0dcbc219d1f98787632a5c9748ebc2c6a4ff335b35c7e782e46fc5e7a8879", stateRootBatchHeader: stateRootBatchHeader, stateRootProof: stateRootProof, stateTrieWitness: stateTrieWitness, storageTrieWitness: storageTrieWitness};
        const resultRelayMessage = (await (await l1CrossDomainMessenger.relayMessage(target, sender, message, messageNonce, proof)).wait()).gasUsed;

        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
        console.log("l1CrossDomainMessenger.relayMessage Length: " + message.length + " Consumed gas: " + resultRelayMessage);
        console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");
      });    

});