// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract ConnextHelper {
  uint256 public totalSupply;
  string private _tokenURI;

  function xcall(
    uint32,
    address,
    address,
    address,
    uint256,
    uint256,
    bytes calldata
  ) public payable returns (bytes32) {
    return "fasdfasdfasdfasdfasdf";
  }

  function domain() public view returns (uint256) {
    return 1;
  }
}