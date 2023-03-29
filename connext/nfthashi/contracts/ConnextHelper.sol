// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract ConnextHelper {
  uint256 public calldataLen;

  function xcall(
    uint32,
    address,
    address,
    address,
    uint256,
    uint256,
    bytes calldata data
  ) public payable returns (bytes32) {
    calldataLen = data.length;
    return "FAKE_DATA";
  }

  function domain() public view returns (uint256) {
    return 1;
  }
}