const express = require('express');
const paymentController = require('../src/controllers/paymentController');
const { verifyToken } = require('./auth');
const rateLimit = require('express-rate-limit');
const webhookRetryService = require('../services/webhookRetryService');

const router = express.Router();

// Rate limiting for payment endpoints
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow more webhook calls for PayU callbacks
  message: {
    success: false,
    message: 'Too many webhook requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== CREDIT PACKAGES ====================

/**
 * @route GET /api/payments/packages
 * @desc Get available credit packages
 * @access Private
 */
router.get('/packages', verifyToken, paymentController.getCreditPackages);

// ==================== PAYMENT INITIATION ====================

/**
 * @route POST /api/payments/initiate
 * @desc Initiate payment for credit purchase
 * @access Private
 */
router.post('/initiate', verifyToken, paymentRateLimit, paymentController.initiatePayment);

/**
 * @route GET /api/payments/form/:orderId
 * @desc Generate payment form for direct PayU integration
 * @access Private
 */
router.get('/form/:orderId', verifyToken, paymentController.generatePaymentForm);

// ==================== PAYU WEBHOOKS ====================

/**
 * @route POST /api/payments/success
 * @desc Handle PayU payment success callback with retry mechanism
 * @access Public (PayU webhook)
 */
router.post('/success', webhookRateLimit, async (req, res) => {
  try {
    await paymentController.handlePaymentSuccess(req, res);
  } catch (error) {
    console.error('❌ Webhook success handler failed:', error.message);

    // Extract order ID for retry
    const txnid = req.body.txnid;
    if (txnid) {
      try {
        const PaymentOrder = require('../models/PaymentOrder');
        const paymentOrder = await PaymentOrder.findByTxnId(txnid);
        if (paymentOrder && !paymentOrder.webhookProcessed) {
          await webhookRetryService.scheduleRetry(paymentOrder.orderId, 'success', req.body);
          console.log(`🔄 Scheduled retry for failed success webhook: ${paymentOrder.orderId}`);
        }
      } catch (retryError) {
        console.error('❌ Failed to schedule webhook retry:', retryError.message);
      }
    }

    // Return error response
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed, scheduled for retry'
    });
  }
});

/**
 * @route POST /api/payments/failure
 * @desc Handle PayU payment failure callback with retry mechanism
 * @access Public (PayU webhook)
 */
router.post('/failure', webhookRateLimit, async (req, res) => {
  try {
    await paymentController.handlePaymentFailure(req, res);
  } catch (error) {
    console.error('❌ Webhook failure handler failed:', error.message);

    // Extract order ID for retry
    const txnid = req.body.txnid;
    if (txnid) {
      try {
        const PaymentOrder = require('../models/PaymentOrder');
        const paymentOrder = await PaymentOrder.findByTxnId(txnid);
        if (paymentOrder && !paymentOrder.webhookProcessed) {
          await webhookRetryService.scheduleRetry(paymentOrder.orderId, 'failure', req.body);
          console.log(`🔄 Scheduled retry for failed failure webhook: ${paymentOrder.orderId}`);
        }
      } catch (retryError) {
        console.error('❌ Failed to schedule webhook retry:', retryError.message);
      }
    }

    // Return error response
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed, scheduled for retry'
    });
  }
});

/**
 * @route POST /api/payments/cancel
 * @desc Handle PayU payment cancel callback with retry mechanism
 * @access Public (PayU webhook)
 */
router.post('/cancel', webhookRateLimit, async (req, res) => {
  try {
    await paymentController.handlePaymentCancel(req, res);
  } catch (error) {
    console.error('❌ Webhook cancel handler failed:', error.message);

    // Extract order ID for retry
    const txnid = req.body.txnid;
    if (txnid) {
      try {
        const PaymentOrder = require('../models/PaymentOrder');
        const paymentOrder = await PaymentOrder.findByTxnId(txnid);
        if (paymentOrder && !paymentOrder.webhookProcessed) {
          await webhookRetryService.scheduleRetry(paymentOrder.orderId, 'cancel', req.body);
          console.log(`🔄 Scheduled retry for failed cancel webhook: ${paymentOrder.orderId}`);
        }
      } catch (retryError) {
        console.error('❌ Failed to schedule webhook retry:', retryError.message);
      }
    }

    // Return error response
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed, scheduled for retry'
    });
  }
});

// ==================== PAYMENT STATUS & HISTORY ====================

/**
 * @route GET /api/payments/status/:orderId
 * @desc Get payment status by order ID
 * @access Private
 */
router.get('/status/:orderId', verifyToken, paymentController.getPaymentStatus);

/**
 * @route GET /api/payments/history
 * @desc Get user's payment history
 * @access Private
 */
router.get('/history', verifyToken, paymentController.getPaymentHistory);

// ==================== CREDIT MANAGEMENT ====================

/**
 * @route GET /api/payments/credits/balance
 * @desc Get current user's credit balance
 * @access Private
 */
router.get('/credits/balance', verifyToken, paymentController.getCreditBalance);

/**
 * @route POST /api/payments/credits/migrate
 * @desc Migrate user to global credit system
 * @access Private
 */
router.post('/credits/migrate', verifyToken, paymentController.migrateToGlobalCredits);

// ==================== ADMIN ENDPOINTS ====================

/**
 * @route GET /api/payments/admin/payu-config
 * @desc Get PayU configuration status (Admin only)
 * @access Private (Admin)
 */
router.get('/admin/payu-config', verifyToken, paymentController.getPayUConfig);

// ==================== FRONTEND REDIRECT HANDLERS ====================

/**
 * @route GET /api/payments/success
 * @desc Handle PayU success redirect (for frontend)
 * @access Public
 */
router.get('/success', (req, res) => {
  const { txnid, status, amount, productinfo, firstname, email, mihpayid } = req.query;

  // Generate frontend redirect URL with payment details
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const redirectUrl = `${frontendUrl}/payment/success?` + new URLSearchParams({
    txnid,
    status,
    amount,
    productinfo,
    firstname,
    email,
    mihpayid
  }).toString();

  res.redirect(redirectUrl);
});

/**
 * @route GET /api/payments/failure
 * @desc Handle PayU failure redirect (for frontend)
 * @access Public
 */
router.get('/failure', (req, res) => {
  const { txnid, status, error, error_Message } = req.query;

  // Generate frontend redirect URL with error details
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const redirectUrl = `${frontendUrl}/payment/failure?` + new URLSearchParams({
    txnid,
    status,
    error: error || 'Payment failed',
    error_Message: error_Message || 'Payment processing failed'
  }).toString();

  res.redirect(redirectUrl);
});

/**
 * @route GET /api/payments/cancel
 * @desc Handle PayU cancel redirect (for frontend)
 * @access Public
 */
router.get('/cancel', (req, res) => {
  const { txnid } = req.query;

  // Generate frontend redirect URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const redirectUrl = `${frontendUrl}/payment/cancel?` + new URLSearchParams({
    txnid,
    status: 'cancelled',
    message: 'Payment cancelled by user'
  }).toString();

  res.redirect(redirectUrl);
});

// ==================== ERROR HANDLING MIDDLEWARE ====================

// Global error handler for payment routes
router.use((error, req, res, next) => {
  console.error('Payment route error:', error);

  res.status(500).json({
    success: false,
    message: 'Payment processing error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

// ==================== WEBHOOK MONITORING ====================

/**
 * @route GET /api/payments/webhook/retry-status
 * @desc Get webhook retry queue status
 * @access Private (Admin only)
 */
router.get('/webhook/retry-status', verifyToken, (req, res) => {
  try {
    // Check if user is admin (you may want to implement proper admin middleware)
    if (req.user.role !== 'admin' && req.user.subscription?.plan !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const retryStatus = webhookRetryService.getRetryStatus();

    res.json({
      success: true,
      retryStatus: {
        ...retryStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Webhook retry status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook retry status'
    });
  }
});

/**
 * @route POST /api/payments/webhook/force-retry/:orderId
 * @desc Manually force webhook retry for a specific order
 * @access Private (Admin only)
 */
router.post('/webhook/force-retry/:orderId', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.subscription?.plan !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { orderId } = req.params;
    const { webhookType = 'success' } = req.body;

    const PaymentOrder = require('../models/PaymentOrder');
    const paymentOrder = await PaymentOrder.findOne({ orderId });

    if (!paymentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Payment order not found'
      });
    }

    // Create mock webhook data for retry
    const webhookData = {
      txnid: paymentOrder.payuData?.txnid || paymentOrder.orderId,
      status: webhookType === 'success' ? 'success' : (webhookType === 'failure' ? 'failure' : 'cancelled'),
      amount: paymentOrder.amount.toString(),
      productinfo: paymentOrder.payuData?.productinfo || 'Manual retry',
      firstname: paymentOrder.payuData?.firstname || 'Admin',
      email: paymentOrder.payuData?.email || 'admin@example.com',
      key: paymentOrder.payuData?.key,
      hash: paymentOrder.payuData?.hash,
      mihpayid: 'MANUAL_RETRY_' + Date.now(),
      mode: 'MANUAL_RETRY'
    };

    await webhookRetryService.scheduleRetry(orderId, webhookType, webhookData, 1);

    res.json({
      success: true,
      message: `Manual webhook retry scheduled for order ${orderId}`,
      webhookType,
      orderId
    });
  } catch (error) {
    console.error('Manual webhook retry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule manual webhook retry'
    });
  }
});

/**
 * @route GET /api/payments/analytics
 * @desc Get payment analytics and monitoring data
 * @access Private (Admin only)
 */
router.get('/analytics', verifyToken, paymentController.getPaymentAnalytics);

module.exports = router;