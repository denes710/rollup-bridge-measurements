// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import {IHub} from "../interfaces/IHub.sol";

import {MerkleProofHelper} from "./MerkleProofHelper.sol";

import {DstSpokeBridge} from "../DstSpokeBridge.sol";

contract SimpleGatewayDstSpokeBrdige is DstSpokeBridge, MerkleProofHelper {
    constructor(
        address _hub,
        uint256 _transferPerBlock,
        uint256 _transFee
    ) DstSpokeBridge(_hub, _transferPerBlock, _transFee) {
    }

    function calculateTransactionHashes(uint256 blockId) public {
        super.calculateHashes(localBlocks[blockId].transactions);
    }

    function _sendMessage(bytes memory _data) internal override {
        IHub(HUB).processMessage(_data);
    }

    function _getCrossMessageSender() internal override returns (address) {
        return _msgSender();
    }
}