const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {
  let MultiSigWallet, wallet, signers, otherAccount;
  let signer1, signer2, signer3;
  let threshold = 2;

  beforeEach(async function () {
    [signer1, signer2, signer3, otherAccount] = await ethers.getSigners();
    signers = [signer1.address, signer2.address, signer3.address];

    MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    wallet = await MultiSigWallet.deploy(signers.slice(0, 3), threshold);
    await wallet.waitForDeployment();
  });

  it("should deploy with correct signers and threshold", async function () {
    expect(await wallet.threshold()).to.equal(threshold);

    const result = await wallet.getSigners();
    expect(result).to.include.members(signers.slice(0, 3));
  });

  it("should allow a signer to propose a transaction", async function () {
    const tx = await wallet.connect(signer1).proposeTransaction(
      otherAccount.address,
      ethers.parseEther("1"),
      "0x"
    );
    await tx.wait();

    const status = await wallet.getWalletStatus();
    expect(status.totalTransactions).to.equal(1);
  });

  it("should allow multiple signers to approve and execute transaction", async function () {
    // Propose
    const tx = await wallet.connect(signer1).proposeTransaction(
      otherAccount.address,
      0,
      "0x"
    );
    await tx.wait();

    // Approve
    await wallet.connect(signer1).approveTransaction(0);
    await wallet.connect(signer2).approveTransaction(0);

    // Execute
    const execTx = await wallet.connect(signer3).executeTransaction(0);
    await execTx.wait();

    const transaction = await wallet.getTransaction(0);
    expect(transaction.executed).to.be.true;
  });

  it("should revert if non-signer tries to approve", async function () {
    await wallet.connect(signer1).proposeTransaction(
      otherAccount.address,
      0,
      "0x"
    );

    await expect(
      wallet.connect(otherAccount).approveTransaction(0)
    ).to.be.revertedWith("MultiSig: caller is not a signer");
  });

  it("should revert if duplicate approval is attempted", async function () {
    await wallet.connect(signer1).proposeTransaction(
      otherAccount.address,
      0,
      "0x"
    );

    await wallet.connect(signer1).approveTransaction(0);
    await expect(
      wallet.connect(signer1).approveTransaction(0)
    ).to.be.revertedWith("MultiSig: transaction already approved");
  });

  it("should allow adding a new signer", async function () {
    await wallet.connect(signer1).addSigner(otherAccount.address);
    const newSigners = await wallet.getSigners();
    expect(newSigners).to.include(otherAccount.address);
  });

  it("should allow removing a signer", async function () {
    await wallet.connect(signer1).removeSigner(signer3.address);
    const updatedSigners = await wallet.getSigners();
    expect(updatedSigners).to.not.include(signer3.address);
  });

  it("should update the threshold", async function () {
    await wallet.connect(signer2).updateThreshold(1);
    expect(await wallet.threshold()).to.equal(1);
  });

  it("should return correct wallet status", async function () {
    await wallet.connect(signer1).proposeTransaction(
      otherAccount.address,
      0,
      "0x"
    );
    const status = await wallet.getWalletStatus();
    expect(status.totalSigners).to.equal(3);
    expect(status.totalTransactions).to.equal(1);
    expect(status.pendingTransactions).to.equal(1);
  });
});
