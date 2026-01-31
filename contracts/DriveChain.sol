// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract DriveChain {
    address public owner;

    uint256 public constant PENALTY_COST = 0.1 ether;
    uint256 public constant REWARD_AMOUNT = 0.1 ether;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public penalties;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function reportPenalty(address user, uint256 count) external onlyOwner {
        penalties[user] = count;
    }

    function settle(address user) external onlyOwner {
        uint256 count = penalties[user];
        if (count > 0) {
            uint256 totalCost = count * PENALTY_COST;
            if (balances[user] >= totalCost)
                balances[user] -= totalCost;
            else
                balances[user] = 0;
        } else {
            balances[user] += REWARD_AMOUNT;
        }
        penalties[user] = 0;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "not enough");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}
