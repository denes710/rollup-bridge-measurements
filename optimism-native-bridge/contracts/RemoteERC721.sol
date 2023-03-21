// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import { OptimismMintableERC721 } from "@eth-optimism/contracts-bedrock/contracts/universal/OptimismMintableERC721.sol";

contract RemoteERC721 is OptimismMintableERC721 {
    constructor(
        address _bridge,
        address _remoteToken
    ) OptimismMintableERC721(_bridge, 5, _remoteToken, "RemoteERC", "RER") {
    }
}