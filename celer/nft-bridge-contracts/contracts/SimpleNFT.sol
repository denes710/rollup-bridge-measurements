// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract SimpleNFT is ERC721URIStorage {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {
    }

    function mint(
        address to,
        uint256 id,
        string memory uri
    ) external {
        _mint(to, id);
        _setTokenURI(id, uri);
    }

    function burn(uint256 id) external {
        _burn(id);
    }
}