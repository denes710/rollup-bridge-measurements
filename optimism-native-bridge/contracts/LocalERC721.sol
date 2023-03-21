// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LocalERC721 is ERC721, Ownable {
    constructor() ERC721("LocalERC", "LER") {
    }

    function burn(uint256 _id) public onlyOwner {
        super._burn(_id);
    }

    function mint(address _to, uint256 _id) public onlyOwner {
        super._safeMint(_to, _id);
    }
}