const PaymentOrder = require('../models/PaymentOrder');
const payuService = require('../src/services/payuService');

class WebhookRetryService {
  constructor() {
    this.retryQueue = new Map(); // orderId -> retry info
    this.maxRetries = 3;
    this.retryIntervals = [5000, 15000, 60000]; // 5s, 15s, 1m
    this.cleanupInterval = 3600000; // 1 hour

    // Start cleanup process
    this.startCleanupProcess();
  }

  /**
   * Schedule a webhook for retry
   */
  async scheduleRetry(orderId, webhookType, webhookData, attempt = 1) {
    try {
      if (attempt > this.maxRetries) {
        console.error(`🚨 Max retries exceeded for webhook ${orderId}:`, {
          type: webhookType,
          attempts: attempt
        });

        // Mark as failed and require manual intervention
        await this.markWebhookAsFailed(orderId, webhookData);
        return;
      }

      const retryInfo = {
        orderId,
        webhookType,
        webhookData,
        attempt,
        scheduledAt: new Date(),
        nextRetryAt: new Date(Date.now() + this.retryIntervals[attempt - 1])
      };

      this.retryQueue.set(orderId, retryInfo);

      console.log(`🔄 Scheduled webhook retry ${attempt}/${this.maxRetries} for ${orderId}:`, {
        type: webhookType,
        nextRetryAt: retryInfo.nextRetryAt.toISOString()
      });

      // Schedule the actual retry
      setTimeout(() => {
        this.processRetry(orderId);
      }, this.retryIntervals[attempt - 1]);

    } catch (error) {
      console.error(`❌ Error scheduling webhook retry for ${orderId}:`, error);
    }
  }

  /**
   * Process a scheduled retry
   */
  async processRetry(orderId) {
    try {
      const retryInfo = this.retryQueue.get(orderId);
      if (!retryInfo) {
        console.warn(`⚠️ Retry info not found for ${orderId}`);
        return;
      }

      console.log(`🔄 Processing retry ${retryInfo.attempt}/${this.maxRetries} for ${orderId}:`, {
        type: retryInfo.webhookType
      });

      // Check if the webhook has already been processed
      const paymentOrder = await PaymentOrder.findOne({ orderId });
      if (paymentOrder && paymentOrder.webhookProcessed) {
        console.log(`✅ Webhook already processed for ${orderId}, removing from retry queue`);
        this.retryQueue.delete(orderId);
        return;
      }

      // Process the webhook based on type
      const success = await this.processWebhook(retryInfo);

      if (success) {
        console.log(`✅ Webhook retry successful for ${orderId} on attempt ${retryInfo.attempt}`);
        this.retryQueue.delete(orderId);
      } else {
        // Schedule next retry
        await this.scheduleRetry(
          orderId,
          retryInfo.webhookType,
          retryInfo.webhookData,
          retryInfo.attempt + 1
        );
      }

    } catch (error) {
      console.error(`❌ Error processing webhook retry for ${orderId}:`, error);

      // Try to schedule next retry
      const retryInfo = this.retryQueue.get(orderId);
      if (retryInfo) {
        await this.scheduleRetry(
          orderId,
          retryInfo.webhookType,
          retryInfo.webhookData,
          retryInfo.attempt + 1
        );
      }
    }
  }

  /**
   * Process the actual webhook
   */
  async processWebhook(retryInfo) {
    try {
      const { webhookType, webhookData } = retryInfo;

      // Import the payment controller to use its methods
      const PaymentController = require('../src/controllers/paymentController');
      const paymentController = new PaymentController();

      // Create mock request/response objects
      const mockReq = {
        body: webhookData,
        headers: {},
        method: 'POST'
      };

      let responseReceived = false;
      let responseSuccess = false;

      const mockRes = {
        status: (code) => ({
          json: (data) => {
            responseReceived = true;
            responseSuccess = code >= 200 && code < 300;
            console.log(`🔄 Retry webhook response for ${retryInfo.orderId}:`, {
              status: code,
              success: responseSuccess,
              data
            });
            return { json: () => {}, status: () => {} };
          }
        }),
        json: (data) => {
          responseReceived = true;
          responseSuccess = data.success || false;
          console.log(`🔄 Retry webhook response for ${retryInfo.orderId}:`, {
            success: responseSuccess,
            data
          });
          return { json: () => {}, status: () => {} };
        }
      };

      // Call the appropriate handler based on webhook type
      switch (webhookType) {
        case 'success':
          await paymentController.handlePaymentSuccess(mockReq, mockRes);
          break;
        case 'failure':
          await paymentController.handlePaymentFailure(mockReq, mockRes);
          break;
        case 'cancel':
          await paymentController.handlePaymentCancel(mockReq, mockRes);
          break;
        default:
          throw new Error(`Unknown webhook type: ${webhookType}`);
      }

      return responseSuccess;

    } catch (error) {
      console.error(`❌ Error processing webhook retry:`, error);
      return false;
    }
  }

  /**
   * Mark webhook as permanently failed
   */
  async markWebhookAsFailed(orderId, webhookData) {
    try {
      const paymentOrder = await PaymentOrder.findOne({ orderId });
      if (paymentOrder) {
        await paymentOrder.updateStatus('webhook_failed', {
          webhookFailureReason: 'Max retries exceeded',
          failedWebhookData: webhookData,
          manualInterventionRequired: true
        });

        console.error(`🚨 MANUAL INTERVENTION REQUIRED - Webhook failed permanently:`, {
          orderId,
          userId: paymentOrder.userId,
          amount: paymentOrder.amount,
          originalStatus: paymentOrder.status
        });
      }

      this.retryQueue.delete(orderId);
    } catch (error) {
      console.error(`❌ Error marking webhook as failed for ${orderId}:`, error);
    }
  }

  /**
   * Check for pending webhook processing and add to retry queue
   */
  async initializePendingWebhooks() {
    try {
      console.log('🔍 Checking for pending webhooks...');

      // Find payment orders that might need webhook retry
      const pendingOrders = await PaymentOrder.find({
        $and: [
          { webhookProcessed: { $ne: true } },
          { status: { $in: ['processing', 'pending'] } },
          { createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Last 24 hours
        ]
      }).sort({ createdAt: -1 });

      console.log(`📋 Found ${pendingOrders.length} potentially pending webhooks`);

      for (const order of pendingOrders) {
        // Check if order is old enough to warrant a retry
        const orderAge = Date.now() - order.createdAt.getTime();
        const minAgeForRetry = 5 * 60 * 1000; // 5 minutes

        if (orderAge > minAgeForRetry) {
          console.log(`🔄 Adding pending order to retry queue:`, {
            orderId: order.orderId,
            status: order.status,
            age: Math.round(orderAge / 1000 / 60) + ' minutes'
          });

          // Try to determine webhook type based on expected status
          const webhookType = 'success'; // Default to success for pending orders

          // Create mock webhook data
          const webhookData = {
            txnid: order.payuData?.txnid,
            status: 'success',
            amount: order.amount.toString(),
            productinfo: order.payuData?.productinfo,
            firstname: order.payuData?.firstname,
            email: order.payuData?.email,
            key: order.payuData?.key,
            hash: order.payuData?.hash,
            mihpayid: 'RETRY_' + Date.now(),
            mode: 'RETRY'
          };

          await this.scheduleRetry(order.orderId, webhookType, webhookData, 1);
        }
      }

    } catch (error) {
      console.error('❌ Error initializing pending webhooks:', error);
    }
  }

  /**
   * Get retry queue status
   */
  getRetryStatus() {
    const status = {
      queueSize: this.retryQueue.size,
      items: []
    };

    for (const [orderId, retryInfo] of this.retryQueue) {
      status.items.push({
        orderId,
        webhookType: retryInfo.webhookType,
        attempt: retryInfo.attempt,
        maxRetries: this.maxRetries,
        scheduledAt: retryInfo.scheduledAt,
        nextRetryAt: retryInfo.nextRetryAt
      });
    }

    return status;
  }

  /**
   * Clean up old retry entries
   */
  startCleanupProcess() {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const [orderId, retryInfo] of this.retryQueue) {
        const age = now - retryInfo.scheduledAt.getTime();
        if (age > maxAge) {
          console.log(`🧹 Cleaning up old retry entry for ${orderId}`);
          this.retryQueue.delete(orderId);
        }
      }
    }, this.cleanupInterval);
  }

  /**
   * Stop the service
   */
  stop() {
    this.retryQueue.clear();
    console.log('🛑 Webhook retry service stopped');
  }
}

// Create singleton instance
const webhookRetryService = new WebhookRetryService();

// Initialize pending webhooks on startup
setTimeout(() => {
  webhookRetryService.initializePendingWebhooks();
}, 5000); // Wait 5 seconds after startup

module.exports = webhookRetryService;