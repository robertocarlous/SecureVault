const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contract with address:", deployer.address);

    // Deploy the factory instead of the wallet
    const MultiSigFactory = await hre.ethers.getContractFactory("MultiSigFactory");

    // If the factory has no constructor params:
    const factory = await MultiSigFactory.deploy();

    await factory.waitForDeployment();

    console.log(`MultiSigFactory deployed at: ${factory.target}`);

    // Example: Use the factory to create a new MultiSigWallet instance
    const signers = [
        deployer.address,
        "0x1234567890123456789012345678901234567890",
        "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    ];
    const threshold = 2;

    let tx = await factory.createWallet(signers, threshold);
    let receipt = await tx.wait();

    console.log("New wallet created in transaction:", receipt.hash);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
