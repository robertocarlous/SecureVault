// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MultiSigWallet
 * @dev MPC-inspired multi-signature wallet for cNGN transactions
 * @notice This contract implements threshold signature functionality for enterprise-grade security
 */
contract MultiSigWallet {
    // Events
    event TransactionProposed(
        uint256 indexed transactionId,
        address indexed proposer,
        address to,
        uint256 value,
        bytes data
    );

    event TransactionApproved(
        uint256 indexed transactionId,
        address indexed approver
    );

    event TransactionExecuted(
        uint256 indexed transactionId,
        address indexed executor
    );

    event SignerAdded(address indexed signer, address indexed addedBy);
    event SignerRemoved(address indexed signer, address indexed removedBy);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // Structs
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    // State variables
    mapping(address => bool) public isSigner;
    mapping(uint256 => Transaction) public transactions;
    address[] public signers;
    uint256 public threshold;
    uint256 public transactionCount;
    uint256 public nonce;

    // Modifiers
    modifier onlySigner() {
        require(isSigner[msg.sender], "MultiSig: caller is not a signer");
        _;
    }

    modifier transactionExists(uint256 transactionId) {
        require(
            transactionId < transactionCount,
            "MultiSig: transaction does not exist"
        );
        _;
    }

    modifier notExecuted(uint256 transactionId) {
        require(
            !transactions[transactionId].executed,
            "MultiSig: transaction already executed"
        );
        _;
    }

    modifier notApproved(uint256 transactionId) {
        require(
            !transactions[transactionId].approvals[msg.sender],
            "MultiSig: transaction already approved"
        );
        _;
    }

    // Constructor
    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length > 0, "MultiSig: no signers provided");
        require(
            _threshold > 0 && _threshold <= _signers.length,
            "MultiSig: invalid threshold"
        );

        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "MultiSig: invalid signer address");
            require(!isSigner[signer], "MultiSig: duplicate signer");

            isSigner[signer] = true;
            signers.push(signer);
        }

        threshold = _threshold;
    }

    // External functions

    /**
     * @dev Propose a new transaction
     * @param to Target address for the transaction
     * @param value Amount of ETH to send
     * @param data Transaction data (for cNGN transfers)
     */
    function proposeTransaction(
        address to,
        uint256 value,
        bytes calldata data
    ) external onlySigner returns (uint256 transactionId) {
        require(to != address(0), "MultiSig: invalid target address");

        transactionId = transactionCount;
        Transaction storage transaction = transactions[transactionId];
        transaction.to = to;
        transaction.value = value;
        transaction.data = data;
        transaction.executed = false;
        transaction.approvalCount = 0;

        transactionCount++;

        emit TransactionProposed(transactionId, msg.sender, to, value, data);
    }

    /**
     * @dev Approve a pending transaction
     * @param transactionId ID of the transaction to approve
     */
    function approveTransaction(
        uint256 transactionId
    )
        external
        onlySigner
        transactionExists(transactionId)
        notExecuted(transactionId)
        notApproved(transactionId)
    {
        Transaction storage transaction = transactions[transactionId];
        transaction.approvals[msg.sender] = true;
        transaction.approvalCount++;

        emit TransactionApproved(transactionId, msg.sender);
    }

    /**
     * @dev Execute a transaction when threshold is met
     * @param transactionId ID of the transaction to execute
     */
    function executeTransaction(
        uint256 transactionId
    )
        external
        onlySigner
        transactionExists(transactionId)
        notExecuted(transactionId)
    {
        Transaction storage transaction = transactions[transactionId];
        require(
            transaction.approvalCount >= threshold,
            "MultiSig: insufficient approvals"
        );

        transaction.executed = true;

        // Execute the transaction
        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "MultiSig: transaction execution failed");

        emit TransactionExecuted(transactionId, msg.sender);
    }

    /**
     * @dev Add a new signer (requires threshold approval)
     * @param newSigner Address of the new signer
     */
    function addSigner(address newSigner) external onlySigner {
        require(newSigner != address(0), "MultiSig: invalid signer address");
        require(!isSigner[newSigner], "MultiSig: signer already exists");

        isSigner[newSigner] = true;
        signers.push(newSigner);

        emit SignerAdded(newSigner, msg.sender);
    }

    /**
     * @dev Remove a signer (requires threshold approval)
     * @param signerToRemove Address of the signer to remove
     */
    function removeSigner(address signerToRemove) external onlySigner {
        require(isSigner[signerToRemove], "MultiSig: signer does not exist");
        require(
            signers.length - 1 >= threshold,
            "MultiSig: cannot remove signer, threshold would be violated"
        );

        isSigner[signerToRemove] = false;

        // Remove from signers array
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signerToRemove) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }

        emit SignerRemoved(signerToRemove, msg.sender);
    }

    /**
     * @dev Update the threshold (requires threshold approval)
     * @param newThreshold New threshold value
     */
    function updateThreshold(uint256 newThreshold) external onlySigner {
        require(
            newThreshold > 0 && newThreshold <= signers.length,
            "MultiSig: invalid threshold"
        );

        uint256 oldThreshold = threshold;
        threshold = newThreshold;

        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    // View functions

    /**
     * @dev Get transaction details
     * @param transactionId ID of the transaction
     */
    function getTransaction(
        uint256 transactionId
    )
        external
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 approvalCount
        )
    {
        require(
            transactionId < transactionCount,
            "MultiSig: transaction does not exist"
        );
        Transaction storage transaction = transactions[transactionId];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.approvalCount
        );
    }

    /**
     * @dev Check if a signer has approved a transaction
     * @param transactionId ID of the transaction
     * @param signer Address of the signer
     */
    function hasApproved(
        uint256 transactionId,
        address signer
    ) external view returns (bool) {
        require(
            transactionId < transactionCount,
            "MultiSig: transaction does not exist"
        );
        return transactions[transactionId].approvals[signer];
    }

    /**
     * @dev Get all signers
     */
    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    /**
     * @dev Get wallet status
     */
    function getWalletStatus()
        external
        view
        returns (
            uint256 totalSigners,
            uint256 currentThreshold,
            uint256 totalTransactions,
            uint256 pendingTransactions
        )
    {
        uint256 pending = 0;
        for (uint256 i = 0; i < transactionCount; i++) {
            if (!transactions[i].executed) {
                pending++;
            }
        }

        return (signers.length, threshold, transactionCount, pending);
    }

    // Receive function to accept ETH
    receive() external payable {}
}
