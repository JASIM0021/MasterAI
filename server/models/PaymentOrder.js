const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema({
  // Unique order ID for PayU
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // User who made the purchase
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Credit package purchased
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreditPackage',
    required: true
  },

  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    required: true,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR'] // Add more currencies as needed
  },

  // Credits to be awarded
  creditsToAward: {
    type: Number,
    required: true,
    min: 0
  },

  bonusCredits: {
    type: Number,
    default: 0,
    min: 0
  },

  // PayU specific fields
  payuData: {
    txnid: {
      type: String,
      required: true,
      unique: true
    },

    hash: {
      type: String,
      required: true
    },

    productinfo: {
      type: String,
      required: true
    },

    firstname: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      default: null
    },

    // PayU response fields
    mihpayid: {
      type: String,
      default: null
    },

    mode: {
      type: String,
      default: null
    },

    status: {
      type: String,
      default: 'pending'
    },

    unmappedstatus: {
      type: String,
      default: null
    },

    key: {
      type: String,
      required: true
    },

    payuMoneyId: {
      type: String,
      default: null
    },

    discount: {
      type: String,
      default: '0.00'
    },

    net_amount_debit: {
      type: String,
      default: null
    },

    addedon: {
      type: String,
      default: null
    },

    payment_source: {
      type: String,
      default: null
    },

    bank_ref_num: {
      type: String,
      default: null
    },

    bankcode: {
      type: String,
      default: null
    },

    error: {
      type: String,
      default: null
    },

    error_Message: {
      type: String,
      default: null
    },

    cardnum: {
      type: String,
      default: null
    },

    cardhash: {
      type: String,
      default: null
    }
  },

  // Order status
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },

  // Payment gateway response
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Webhook processing
  webhookProcessed: {
    type: Boolean,
    default: false
  },

  webhookProcessedAt: {
    type: Date,
    default: null
  },

  // Credits awarded status
  creditsAwarded: {
    type: Boolean,
    default: false
  },

  creditsAwardedAt: {
    type: Date,
    default: null
  },

  // Transaction reference for credits
  creditTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreditTransaction',
    default: null
  },

  // Failure details
  failureReason: {
    type: String,
    default: null
  },

  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Payment expiry (orders expire after 24 hours)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from creation
  }
});

// Update the updatedAt field before saving
paymentOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check if order is expired
paymentOrderSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Instance method to update status
paymentOrderSchema.methods.updateStatus = async function(newStatus, additionalData = {}) {
  this.status = newStatus;

  if (additionalData.gatewayResponse) {
    this.gatewayResponse = { ...this.gatewayResponse, ...additionalData.gatewayResponse };
  }

  if (additionalData.payuData) {
    this.payuData = { ...this.payuData, ...additionalData.payuData };
  }

  if (newStatus === 'failed' && additionalData.failureReason) {
    this.failureReason = additionalData.failureReason;
  }

  this.updatedAt = Date.now();
  return this.save();
};

// Instance method to mark webhook as processed
paymentOrderSchema.methods.markWebhookProcessed = async function() {
  this.webhookProcessed = true;
  this.webhookProcessedAt = new Date();
  return this.save();
};

// Instance method to award credits
paymentOrderSchema.methods.awardCredits = async function() {
  if (this.creditsAwarded) {
    throw new Error('Credits already awarded for this order');
  }

  const Credit = require('./Credit');
  const CreditTransaction = require('./CreditTransaction');

  // Get user credits
  const userCredits = await Credit.findOrCreateForUser(this.userId);

  // Calculate total credits (base + bonus)
  const totalCredits = this.creditsToAward + this.bonusCredits;

  // Update user's global credits
  if (!userCredits.globalCredits) {
    userCredits.globalCredits = { balance: 0, totalPurchased: 0 };
  }

  userCredits.globalCredits.balance += totalCredits;
  userCredits.globalCredits.totalPurchased += totalCredits;
  await userCredits.save();

  // Log the transaction
  const transaction = await CreditTransaction.logTransaction({
    userId: this.userId,
    type: 'purchase',
    amount: totalCredits,
    description: `Credit purchase - ${this.creditsToAward} credits + ${this.bonusCredits} bonus`,
    metadata: {
      packageDetails: {
        packageId: this.packageId,
        bonusCredits: this.bonusCredits
      },
      source: 'payu_payment'
    }
  });

  // Update order status
  this.creditsAwarded = true;
  this.creditsAwardedAt = new Date();
  this.creditTransactionId = transaction._id;

  return this.save();
};

// Static method to create a new payment order
paymentOrderSchema.statics.createOrder = async function(orderData) {
  const { userId, packageId, amount, currency, creditsToAward, bonusCredits, payuData } = orderData;

  // Generate unique order ID
  const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const order = new this({
    orderId,
    userId,
    packageId,
    amount,
    currency,
    creditsToAward,
    bonusCredits,
    payuData,
    status: 'pending'
  });

  return order.save();
};

// Static method to find order by PayU transaction ID
paymentOrderSchema.statics.findByTxnId = async function(txnid) {
  return this.findOne({ 'payuData.txnid': txnid });
};

// Static method to find expired orders
paymentOrderSchema.statics.findExpiredOrders = async function() {
  return this.find({
    status: 'pending',
    expiresAt: { $lt: new Date() }
  });
};

// Static method to get user's payment history
paymentOrderSchema.statics.getUserPaymentHistory = async function(userId, options = {}) {
  const { page = 1, limit = 20, status = null } = options;

  const query = { userId };
  if (status) query.status = status;

  const orders = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('packageId', 'name credits price description')
    .populate('creditTransactionId', 'amount createdAt');

  const totalOrders = await this.countDocuments(query);

  return {
    orders,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      hasNext: page * limit < totalOrders,
      hasPrev: page > 1
    }
  };
};

// Indexes for better query performance
paymentOrderSchema.index({ userId: 1, createdAt: -1 });
paymentOrderSchema.index({ status: 1 });
paymentOrderSchema.index({ 'payuData.txnid': 1 });
paymentOrderSchema.index({ webhookProcessed: 1 });
paymentOrderSchema.index({ expiresAt: 1 });
paymentOrderSchema.index({ creditsAwarded: 1 });

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);