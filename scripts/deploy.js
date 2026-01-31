import hre from "hardhat";

async function main() {
    // Use the exact contract name from Solidity
    const DriveChain = await hre.ethers.getContractFactory("DriveChain");

    // Deploy contract
    const contract = await DriveChain.deploy();

    // Wait for deployment (v3 syntax)
    await contract.waitForDeployment();

    console.log("DriveChain deployed at:", contract.target);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
