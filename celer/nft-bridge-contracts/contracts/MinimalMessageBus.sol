// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.8.0;

import "./interfaces/IMessageBus.sol";

contract MinimalMessageBus is IMessageBus {
    function liquidityBridge() external override view returns (address) {
        require(false, "MinimalMessageBus: liquidityBridge is not implemented!");
        return address(0);
    }

    function pegBridge() external override view returns (address){
        require(false, "MinimalMessageBus: pegBridge is not implemented!");
        return address(0);
    }

    function pegBridgeV2() external override view returns (address){
        require(false, "MinimalMessageBus: pegBridgeV2 is not implemented!");
        return address(0);
    }

    function pegVault() external override view returns (address){
        require(false, "MinimalMessageBus: pegVault is not implemented!");
        return address(0);
    }

    function pegVaultV2() external override view returns (address){
        require(false, "MinimalMessageBus: pegVaultV2 is not implemented!");
        return address(0);
    }

    function calcFee(bytes calldata) external override view returns (uint256) {
        return 0;
    }

    function sendMessage(
        address,
        uint256,
        bytes calldata
    ) external override payable {
    }

    function sendMessageWithTransfer(
        address,
        uint256,
        address,
        bytes32,
        bytes calldata
    ) external override payable {
        require(false, "MinimalMessageBus: sendMessageWithTransfer is not implemented!");
    }

    function withdrawFee(
        address,
        uint256,
        bytes[] calldata,
        address[] calldata,
        uint256[] calldata
    ) external override {
        require(false, "MinimalMessageBus: withdrawFee is not implemented!");
    }

    function executeMessageWithTransfer(
        bytes calldata,
        MsgDataTypes.TransferInfo calldata,
        bytes[] calldata,
        address[] calldata,
        uint256[] calldata
    ) external override payable {
        require(false, "MinimalMessageBus: executeMessageWithTransfer is not implemented!");
    }

    function executeMessageWithTransferRefund(
        bytes calldata, // the same message associated with the original transfer
        MsgDataTypes.TransferInfo calldata,
        bytes[] calldata,
        address[] calldata,
        uint256[] calldata
    ) external override payable {
        require(false, "MinimalMessageBus: executeMessageWithTransferRefund is not implemented!");
    }

    function executeMessage(
        bytes calldata,
        MsgDataTypes.RouteInfo calldata,
        bytes[] calldata,
        address[] calldata,
        uint256[] calldata
    ) external override payable {
        require(false, "MinimalMessageBus: executeMessage is not implemented!");
    }

    // from NFTBridge.sol
    struct NFTMsg {
        address user; // receiver of minted or withdrawn NFT
        address nft; // NFT contract on mint/withdraw chain
        uint256 id; // token ID
        string uri; // tokenURI from source NFT
    }

    function getEncodedData(address _user, address _nft, uint256 _id, string memory _uri) external pure returns (bytes memory) {
        bytes memory message = abi.encode(NFTMsg(_user, _nft, _id, _uri));
        return message;
    }
}