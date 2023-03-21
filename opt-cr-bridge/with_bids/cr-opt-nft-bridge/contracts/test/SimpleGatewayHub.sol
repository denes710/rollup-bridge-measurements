// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import {IHub} from "../interfaces/IHub.sol";
import {ISpokeBridge} from "../interfaces/ISpokeBridge.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleGatewayHub is IHub, Ownable {
    mapping(address => address) public bridgeToBrdige;

    function processMessage(bytes memory _data) public override {
        require(bridgeToBrdige[_msgSender()] != address(0), "Hub: contract has no pair!");

        ISpokeBridge(bridgeToBrdige[_msgSender()]).receiveProof(_data);
    }

    function addSpokeBridge(address _srcContract, address _dstContract) public override onlyOwner {
        require(bridgeToBrdige[_srcContract] == address(0), "Hub: src contract already has a pair!");
        require(bridgeToBrdige[_dstContract] == address(0), "Hub: dst contract already has a pair!");

        bridgeToBrdige[_srcContract] = _dstContract;
        bridgeToBrdige[_dstContract] = _srcContract;
    }

    function getMessage(bool _isOutgoingBid) public view returns (bytes memory) {
        if (_isOutgoingBid) {
            bytes memory data = abi.encode(
                1,
                1,
                address(0),
                1,
                address(0),
                address(0)
            );

            data = abi.encode(data, true);
            return data;
        } else {

            bytes memory data = abi.encode(
                1,
                2,
                address(0),
                2,
                address(0),
                address(0),
                address(0)
            );

            data = abi.encode(data, false);

            return data;
        }
    }
}