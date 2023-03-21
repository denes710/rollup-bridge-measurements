// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import { L1ERC721Bridge } from "@eth-optimism/contracts-bedrock/contracts/L1/L1ERC721Bridge.sol";

contract L1Bridge is L1ERC721Bridge {
    /**
     * @custom:semver 1.0.0
     *
     * @param _messenger   Address of the CrossDomainMessenger on this network.
     * @param _otherBridge Address of the ERC721 bridge on the other network.
     */
    constructor(address _messenger, address _otherBridge)
        L1ERC721Bridge(_messenger, _otherBridge)
    {}
}