// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity 0.8.17;

import { StateCommitmentChain } from "@eth-optimism/contracts/L1/rollup/StateCommitmentChain.sol";

/**
 * @notice This contract manages a set of watchers. This is meant to be used as a shared resource that contracts can
 * inherit to make use of the same watcher set.
 */

contract HelperStateCommitmentChain is StateCommitmentChain {
    constructor(
        address _libAddressManager,
        uint256 _fraudProofWindow,
        uint256 _sequencerPublishWindow
    ) StateCommitmentChain(_libAddressManager, _fraudProofWindow, _sequencerPublishWindow) {

    }
}