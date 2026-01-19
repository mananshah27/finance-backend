const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const Category = require("../models/Category");
const auth = require("../middleware/auth");

// Create Transaction
router.post("/", auth, async (req, res) => {
  try {
    const { amount, type, categoryId, description, accountId } = req.body;

    // Validation
    if (!amount || !type || !categoryId || !accountId) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "Amount must be greater than 0",
      });
    }

    // Check if account belongs to user
    const account = await Account.findOne({
      _id: accountId,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(403).json({
        message: "Unauthorized account access",
      });
    }

    // Check if category belongs to user
    const category = await Category.findOne({
      _id: categoryId,
      userId: req.user._id,
    });

    if (!category) {
      return res.status(404).json({
        message: "Invalid category",
      });
    }

    // Check if category type matches transaction type
    if (category.type !== type) {
      return res.status(400).json({
        message: `Category type (${category.type}) doesn't match transaction type (${type})`,
      });
    }

    // For expense, check balance
    if (type === "expense" && account.balance < amount) {
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }

    // Start transaction session for atomic operations
    const session = await Transaction.startSession();
    session.startTransaction();

    try {
      // Update account balance
      if (type === "income") {
        account.balance += parseFloat(amount);
      } else {
        account.balance -= parseFloat(amount);
      }

      await account.save({ session });

      // Create transaction
      const transaction = new Transaction({
        amount: parseFloat(amount),
        type,
        categoryId,
        accountId,
        userId: req.user._id,
        description,
      });

      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        message: "Transaction added successfully",
        transaction,
        updatedBalance: account.balance,
      });
    } catch (error) {
      // Rollback transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).json({
      message: "Error adding transaction",
    });
  }
});

// Get Transactions with Filters
router.get("/", auth, async (req, res) => {
  try {
    const { accountId, type, categoryId, startDate, endDate } = req.query;

    // Build filter
    const filter = { userId: req.user._id };

    // Account filter
    if (accountId) {
      // Check if account belongs to user
      const account = await Account.findOne({
        _id: accountId,
        userId: req.user._id,
      });

      if (!account) {
        return res.status(403).json({
          message: "Unauthorized account access",
        });
      }

      filter.accountId = accountId;
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Category filter
    if (categoryId) {
      // Check if category belongs to user
      const category = await Category.findOne({
        _id: categoryId,
        userId: req.user._id,
      });

      if (category) {
        filter.categoryId = categoryId;
      }
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Get transactions with related data
    const transactions = await Transaction.find(filter)
      .populate("categoryId", "name type _id")
      .populate("accountId", "name type")
      .sort({ createdAt: -1 });

    // Transform the populated category data
    const transformedTransactions = transactions.map((transaction) => {
      const transactionObj = transaction.toObject();

      if (transactionObj.categoryId) {
        transactionObj.categoryId = {
          _id: transactionObj.categoryId._id,
          id: transactionObj.categoryId._id,
          categoryId: transactionObj.categoryId._id,
          name: transactionObj.categoryId.name,
          type: transactionObj.categoryId.type,
        };
      }

      return transactionObj;
    });

    if (transactions.length === 0) {
      return res.status(404).json({
        message: "No transactions found",
      });
    }

    res.json({
      message: "Transactions loaded successfully",
      transactions,
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      message: "Error fetching transactions",
    });
  }
});

// Get Single Transaction
router.get("/:id", auth, async (req, res) => {
  try {
    const { accountId } = req.query;

    if (!accountId) {
      return res.status(400).json({
        message: "Account ID is required",
      });
    }

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
      accountId,
    }).populate("categoryId", "name type");

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    res.json(transaction);
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({
      message: "Error fetching transaction",
    });
  }
});

// Update Transaction (Only category can be updated)
router.put("/:id", auth, async (req, res) => {
  try {
    const { categoryId, accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        message: "Account ID is required",
      });
    }

    const updates = {};

    if (categoryId) {
      // Check if new category belongs to user
      const category = await Category.findOne({
        _id: categoryId,
        userId: req.user._id,
      });

      if (!category) {
        return res.status(404).json({
          message: "Invalid category",
        });
      }

      updates.categoryId = categoryId;
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
        accountId,
      },
      updates,
      { new: true, runValidators: true },
    );

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    res.json({
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    console.error("Update transaction error:", error);
    res.status(500).json({
      message: "Error updating transaction",
    });
  }
});

// Delete Transaction
router.delete("/:id", auth, async (req, res) => {
  try {
    const { accountId } = req.query;

    if (!accountId) {
      return res.status(400).json({
        message: "Account ID is required",
      });
    }

    const session = await Transaction.startSession();
    session.startTransaction();

    try {
      // Find transaction
      const transaction = await Transaction.findOne({
        _id: req.params.id,
        userId: req.user._id,
        accountId,
      });

      if (!transaction) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          message: "Transaction not found",
        });
      }

      // Find account
      const account = await Account.findOne({
        _id: accountId,
        userId: req.user._id,
      });

      if (!account) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          message: "Unauthorized account access",
        });
      }

      // Adjust account balance (reverse the transaction)
      if (transaction.type === "income") {
        account.balance -= transaction.amount;
      } else {
        account.balance += transaction.amount;
      }

      await account.save({ session });

      // Delete transaction
      await Transaction.findByIdAndDelete(transaction._id, { session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      res.json({
        message: "Transaction deleted successfully",
        updatedBalance: account.balance,
      });
    } catch (error) {
      // Rollback transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({
      message: "Error deleting transaction",
    });
  }
});

module.exports = router;
