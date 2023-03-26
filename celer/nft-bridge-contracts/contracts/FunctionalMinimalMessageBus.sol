// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.8.0;

import "./interfaces/IMessageBus.sol";

contract MinimalMessageBus is IMessageBus {
    uint256 public feeBase;
    uint256 public feePerByte;

    event Message(address indexed sender, address receiver, uint256 dstChainId, bytes message, uint256 fee);

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

    function calcFee(bytes calldata _message) public view returns (uint256) {
        return feeBase + _message.length * feePerByte;
    }

    function sendMessage(
        address _receiver,
        uint256 _dstChainId,
        bytes calldata _message
    ) external payable {
        _sendMessage(_dstChainId, _message);
        emit Message(msg.sender, _receiver, _dstChainId, _message, msg.value);
    }

    function _sendMessage(uint256 _dstChainId, bytes calldata _message) private {
        require(_dstChainId != block.chainid, "Invalid chainId");
        uint256 minFee = calcFee(_message);
        require(msg.value >= minFee, "Insufficient fee");
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