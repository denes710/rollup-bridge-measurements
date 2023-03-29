// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity 0.8.17;

import {OptimismAmb} from "./messaging/interfaces/ambs/optimism/OptimismAmb.sol";
import {MerkleLib} from "./messaging/libraries/MerkleLib.sol";
import {Message} from "./messaging/libraries/Message.sol";

contract HelperOptimismAmb is OptimismAmb {
    address sender;
    uint256 messageLen;

    function sendMessage(
        address,
        bytes memory _message,
        uint32
    ) public {
        // messageLen = _message.length;
    }

    function lastMessageLen() public view returns (uint256) {
        return messageLen;
    }

    function setSender(address _sender) public {
        sender = _sender;
    }

    function xDomainMessageSender() public view returns (address) {
        return sender;
    }

    function calculateMessageRoot(
        bytes memory message,
        bytes32[32] memory _aggregatePath,
        uint256 _aggregateIndex
    ) public view returns (bytes32) {
        bytes32 _messageHash = keccak256(message);
        return MerkleLib.branchRoot(_messageHash, _aggregatePath, _aggregateIndex);
    }
    function calculateRoot(
        bytes32 _messageHash,
        bytes32[32] memory _aggregatePath,
        uint256 _aggregateIndex
    ) public view returns (bytes32) {
       return MerkleLib.branchRoot(_messageHash, _aggregatePath, _aggregateIndex);
    }

    function formatMessage(
        uint32 _originDomain,
        bytes32 _sender,
        uint32 _nonce,
        uint32 _destinationDomain,
        bytes32 _recipient,
        bytes memory _messageBody
    ) public view returns (bytes memory) {
        return Message.formatMessage(_originDomain, _sender, _nonce, _destinationDomain, _recipient, _messageBody);
    }
}
