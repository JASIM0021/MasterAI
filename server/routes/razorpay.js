const express = require('express');
const { verifyToken } = require('./auth');
const { createOrder, verifyPayment, verifyWebhookSignature } = require('../services/razorpayService');
const CreditPackage = require('../models/CreditPackage');
const Credit = require('../models/Credit');
const PaymentOrder = require('../models/PaymentOrder');

const router = express.Router();

// ==================== GET CREDIT PACKAGES ====================

/**
 * @route GET /api/razorpay/packages
 * @desc Get all active credit packages
 * @access Public
 */
router.get('/packages', async (req, res) => {
  try {
    const packages = await CreditPackage.find({ isActive: true })
      .sort({ 'displaySettings.sortOrder': 1, price: 1 });

    return res.status(200).json({
      success: true,
      packages,
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch credit packages',
      error: error.message,
    });
  }
});

// ==================== CREATE ORDER ====================

/**
 * @route POST /api/razorpay/create-order
 * @desc Create a Razorpay order for a credit package
 * @access Private
 */
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: 'packageId is required',
      });
    }

    // Find the credit package
    const creditPackage = await CreditPackage.findById(packageId);
    if (!creditPackage || !creditPackage.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Credit package not found or inactive',
      });
    }

    // Generate internal order receipt
    const receipt = `rzp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create Razorpay order
    const razorpayOrder = await createOrder({
      amount: creditPackage.price,
      currency: creditPackage.currency || 'INR',
      receipt,
      notes: {
        packageId: packageId.toString(),
        userId: userId.toString(),
        packageName: creditPackage.name,
      },
    });

    // Generate a unique internal orderId
    const internalOrderId = `ORDER_RZP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save PaymentOrder — payuData required fields filled with Razorpay context
    const paymentOrder = new PaymentOrder({
      orderId: internalOrderId,
      userId,
      packageId,
      amount: creditPackage.price,
      currency: creditPackage.currency || 'INR',
      creditsToAward: creditPackage.credits,
      bonusCredits: creditPackage.bonusCredits || 0,
      status: 'pending',
      // Store Razorpay-specific data in gatewayResponse
      gatewayResponse: {
        gateway: 'razorpay',
        razorpayOrderId: razorpayOrder.id,
        receipt,
      },
      // payuData required fields — used as placeholder for non-PayU gateways
      payuData: {
        txnid: razorpayOrder.id,
        hash: receipt,
        productinfo: creditPackage.name,
        firstname: req.user.name || req.user.email || 'Customer',
        email: req.user.email || 'customer@example.com',
        key: process.env.RAZORPAY_KEY_ID || 'razorpay',
      },
    });

    await paymentOrder.save();

    return res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      internalOrderId: internalOrderId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      packageName: creditPackage.name,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message,
    });
  }
});

// ==================== VERIFY PAYMENT ====================

/**
 * @route POST /api/razorpay/verify
 * @desc Verify Razorpay payment signature and award credits
 * @access Private
 */
router.post('/verify', verifyToken, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, packageId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'razorpayOrderId, razorpayPaymentId, and razorpaySignature are required',
      });
    }

    // Verify the payment signature
    const isValid = verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: invalid signature',
      });
    }

    // Find the PaymentOrder using the Razorpay order ID stored in gatewayResponse
    const paymentOrder = await PaymentOrder.findOne({
      'gatewayResponse.razorpayOrderId': razorpayOrderId,
      userId,
    });

    if (!paymentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Payment order not found',
      });
    }

    // Guard: prevent double credit award
    if (paymentOrder.creditsAwarded) {
      const credits = await Credit.findOrCreateForUser(userId);
      return res.status(200).json({
        success: true,
        message: 'Credits were already awarded for this order',
        balance: credits.globalCredits.balance,
      });
    }

    // Find the credit package
    const creditPackage = await CreditPackage.findById(paymentOrder.packageId);
    if (!creditPackage) {
      return res.status(404).json({
        success: false,
        message: 'Credit package not found',
      });
    }

    const totalCredits = paymentOrder.creditsToAward + (paymentOrder.bonusCredits || 0);
    const description = `Razorpay purchase - ${paymentOrder.creditsToAward} credits + ${paymentOrder.bonusCredits || 0} bonus (${creditPackage.name})`;

    // Award credits using the instance method addGlobalCredits
    const userCredits = await Credit.findOrCreateForUser(userId);
    await userCredits.addGlobalCredits(totalCredits, 'purchase');

    // Update payment order to completed
    paymentOrder.status = 'success';
    paymentOrder.creditsAwarded = true;
    paymentOrder.creditsAwardedAt = new Date();
    paymentOrder.gatewayResponse = {
      ...paymentOrder.gatewayResponse,
      razorpayPaymentId,
      razorpaySignature,
      verifiedAt: new Date().toISOString(),
    };
    await paymentOrder.save();

    // Record purchase stats on the package
    try {
      await creditPackage.recordPurchase(paymentOrder.amount);
    } catch (statsError) {
      console.warn('Failed to record purchase stats:', statsError.message);
    }

    // Fetch updated balance
    const updatedCredits = await Credit.findOne({ userId });
    const newBalance = updatedCredits ? updatedCredits.globalCredits.balance : userCredits.globalCredits.balance;

    return res.status(200).json({
      success: true,
      message: `Payment verified. ${totalCredits} credits added to your account.`,
      creditsAwarded: totalCredits,
      balance: newBalance,
      description,
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
    });
  }
});

// ==================== WEBHOOK ====================

/**
 * @route POST /api/razorpay/webhook
 * @desc Handle Razorpay webhook events
 * @access Public (verified via signature)
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature' });
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(req.body, signature);
    if (!isValid) {
      console.warn('Invalid Razorpay webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventType = event.event;

    console.log(`Razorpay webhook received: ${eventType}`);

    // Handle payment.captured event
    if (eventType === 'payment.captured') {
      const payment = event.payload && event.payload.payment && event.payload.payment.entity;

      if (!payment) {
        return res.status(200).json({ success: true, message: 'No payment entity in payload' });
      }

      const razorpayOrderId = payment.order_id;

      if (!razorpayOrderId) {
        return res.status(200).json({ success: true, message: 'No order_id in payment' });
      }

      // Find the PaymentOrder by the Razorpay order ID
      const paymentOrder = await PaymentOrder.findOne({
        'gatewayResponse.razorpayOrderId': razorpayOrderId,
      });

      if (!paymentOrder) {
        console.warn(`Webhook: PaymentOrder not found for razorpayOrderId=${razorpayOrderId}`);
        return res.status(200).json({ success: true, message: 'Order not found, ignoring' });
      }

      // Skip if credits already awarded (idempotency)
      if (paymentOrder.creditsAwarded) {
        console.log(`Webhook: Credits already awarded for order ${paymentOrder.orderId}`);
        await paymentOrder.markWebhookProcessed();
        return res.status(200).json({ success: true, message: 'Credits already awarded' });
      }

      const userId = paymentOrder.userId;
      const totalCredits = paymentOrder.creditsToAward + (paymentOrder.bonusCredits || 0);

      // Award credits
      const userCredits = await Credit.findOrCreateForUser(userId);
      await userCredits.addGlobalCredits(totalCredits, 'purchase');

      // Update payment order
      paymentOrder.status = 'success';
      paymentOrder.creditsAwarded = true;
      paymentOrder.creditsAwardedAt = new Date();
      paymentOrder.webhookProcessed = true;
      paymentOrder.webhookProcessedAt = new Date();
      paymentOrder.gatewayResponse = {
        ...paymentOrder.gatewayResponse,
        webhookPaymentId: payment.id,
        webhookCapturedAt: new Date().toISOString(),
      };
      await paymentOrder.save();

      // Record package stats
      try {
        const creditPackage = await CreditPackage.findById(paymentOrder.packageId);
        if (creditPackage) {
          await creditPackage.recordPurchase(paymentOrder.amount);
        }
      } catch (statsError) {
        console.warn('Webhook: Failed to record purchase stats:', statsError.message);
      }

      console.log(`Webhook: Awarded ${totalCredits} credits to user ${userId}`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    // Return 200 to prevent Razorpay from retrying on server errors
    return res.status(200).json({ success: true, message: 'Webhook received' });
  }
});

module.exports = router;
