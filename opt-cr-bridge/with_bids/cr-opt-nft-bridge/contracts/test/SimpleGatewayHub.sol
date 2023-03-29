// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import {IHub} from "../interfaces/IHub.sol";
import {ISpokeBridge} from "../interfaces/ISpokeBridge.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleGatewayHub is IHub, Ownable {
    mapping(address => address) public bridgeToBrdige;
    uint256 messageLen;

    function processMessage(bytes memory _data) public override {
        require(bridgeToBrdige[_msgSender()] != address(0), "Hub: contract has no pair!");

        // ISpokeBridge(bridgeToBrdige[_msgSender()]).receiveProof(_data);
    }

    function addSpokeBridge(address _srcContract, address _dstContract) public override onlyOwner {
        require(bridgeToBrdige[_srcContract] == address(0), "Hub: src contract already has a pair!");
        require(bridgeToBrdige[_dstContract] == address(0), "Hub: dst contract already has a pair!");

        bridgeToBrdige[_srcContract] = _dstContract;
        bridgeToBrdige[_dstContract] = _srcContract;
    }

    function getMessage(bool _isOutgoingBid) public view returns (bytes memory) {
        uint256 value = 1;

        if (_isOutgoingBid) {
            bytes memory data = abi.encode(
                value,
                bytes32("ASD"),
                address(this),
                value
            );

            data = abi.encode(data, true);
            return data;
        } else {

            bytes memory data = abi.encode(
                value,
                bytes32("ASD"),
                address(this),
                value,
                address(this)
            );

            data = abi.encode(data, false);
            return data;
        }
    }
}