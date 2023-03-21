// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import { CrossDomainMessenger } from "@eth-optimism/contracts-bedrock/contracts/universal/CrossDomainMessenger.sol";

contract MinimalMessenger is CrossDomainMessenger {
    constructor()
        CrossDomainMessenger(address(0))
    {}

    function _sendMessage(
        address,
        uint64,
        uint256,
        bytes memory
    ) internal override {}

    /**
     * @inheritdoc CrossDomainMessenger
     */
    function _isOtherMessenger() internal pure override returns (bool) {
        return true;
    }

    /**
     * @inheritdoc CrossDomainMessenger
     */
    function _isUnsafeTarget(address) internal pure override returns (bool) {
        return false;
    }

    function setXDomainMessageSender(address _newXDomainMessageSender) external {
        xDomainMsgSender = _newXDomainMessageSender;
    }
}