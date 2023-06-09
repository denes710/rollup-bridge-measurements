// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

library LibLocalTransaction {
    using Counters for Counters.Counter;

    // TODO undo for adding transaction, fee for this is necessary
    struct LocalTransaction {
        uint256 tokenId;
        address maker;
        address receiver;
        // always the address of a smart contract on the src side
        address localErc721Contract; // it is not relevant on the dst side
        // always the address of a smart contract on the dest side
        address remoteErc721Contract;
    }

    struct LocalBlock {
        mapping (uint256 => bytes32) transactions;
        Counters.Counter length;
    }
}