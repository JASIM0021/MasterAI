const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');

class PayUService {
  constructor() {
    // PayU Configuration (should be in environment variables)
    this.config = {
      merchant: {
        key: process.env.PAYU_MERCHANT_KEY || '',
        salt: process.env.PAYU_MERCHANT_SALT || '',
        id: process.env.PAYU_MERCHANT_ID || ''
      },
      urls: {
        test: 'https://test.payu.in/_payment',
        production: 'https://secure.payu.in/_payment'
      },
      environment: process.env.PAYU_ENVIRONMENT || 'test', // 'test' or 'production'
      successUrl: process.env.PAYU_SUCCESS_URL || 'http://localhost:3000/api/payments/success',
      failureUrl: process.env.PAYU_FAILURE_URL || 'http://localhost:3000/api/payments/failure',
      cancelUrl: process.env.PAYU_CANCEL_URL || 'http://localhost:3000/api/payments/cancel'
    };

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate PayU configuration
   */
  validateConfig() {
    if (!this.config.merchant.key) {
      console.warn('PayU Merchant Key not configured. Set PAYU_MERCHANT_KEY environment variable.');
    }
    if (!this.config.merchant.salt) {
      console.warn('PayU Merchant Salt not configured. Set PAYU_MERCHANT_SALT environment variable.');
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `TXN_${timestamp}_${random}`;
  }

  /**
   * Generate PayU hash for payment request
   * Hash Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
   */
  generatePaymentHash(paymentData) {
    try {
      // Validate required parameters
      const requiredFields = ['txnid', 'amount', 'productinfo', 'firstname', 'email'];
      for (const field of requiredFields) {
        if (!paymentData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate merchant configuration
      if (!this.config.merchant.key || !this.config.merchant.salt) {
        throw new Error('PayU merchant key and salt must be configured');
      }

      const {
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1 = '',
        udf2 = '',
        udf3 = '',
        udf4 = '',
        udf5 = ''
      } = paymentData;

      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }

      // Sanitize inputs to prevent injection
      const sanitizedData = {
        key: String(this.config.merchant.key).trim(),
        txnid: String(txnid).trim(),
        amount: numAmount.toFixed(2),
        productinfo: String(productinfo).trim(),
        firstname: String(firstname).trim(),
        email: String(email).toLowerCase().trim(),
        udf1: String(udf1).trim(),
        udf2: String(udf2).trim(),
        udf3: String(udf3).trim(),
        udf4: String(udf4).trim(),
        udf5: String(udf5).trim()
      };

      const hashString = [
        sanitizedData.key,
        sanitizedData.txnid,
        sanitizedData.amount,
        sanitizedData.productinfo,
        sanitizedData.firstname,
        sanitizedData.email,
        sanitizedData.udf1,
        sanitizedData.udf2,
        sanitizedData.udf3,
        sanitizedData.udf4,
        sanitizedData.udf5,
        '', '', '', '', '', // Empty values for udf6-udf10
        this.config.merchant.salt
      ].join('|');

      const hash = crypto.createHash('sha512').update(hashString).digest('hex');

      // Log hash generation for debugging (without sensitive data)
      console.log('🔐 PayU Hash Generated:', {
        txnid: sanitizedData.txnid,
        amount: sanitizedData.amount,
        hashLength: hash.length,
        environment: this.config.environment
      });

      return hash;
    } catch (error) {
      console.error('❌ PayU Hash Generation Error:', error.message);
      throw new Error(`Hash generation failed: ${error.message}`);
    }
  }

  /**
   * Generate PayU hash for payment response verification
   * Hash Formula: sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
   */
  generateResponseHash(responseData) {
    try {
      // Validate required parameters for response hash
      const requiredFields = ['status', 'txnid', 'amount', 'productinfo', 'firstname', 'email'];
      for (const field of requiredFields) {
        if (responseData[field] === undefined || responseData[field] === null) {
          throw new Error(`Missing required response field: ${field}`);
        }
      }

      // Validate merchant configuration
      if (!this.config.merchant.key || !this.config.merchant.salt) {
        throw new Error('PayU merchant key and salt must be configured');
      }

      const {
        status,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1 = '',
        udf2 = '',
        udf3 = '',
        udf4 = '',
        udf5 = ''
      } = responseData;

      // Sanitize response data
      const sanitizedData = {
        salt: String(this.config.merchant.salt).trim(),
        status: String(status).trim(),
        txnid: String(txnid).trim(),
        amount: String(amount).trim(),
        productinfo: String(productinfo).trim(),
        firstname: String(firstname).trim(),
        email: String(email).toLowerCase().trim(),
        udf1: String(udf1).trim(),
        udf2: String(udf2).trim(),
        udf3: String(udf3).trim(),
        udf4: String(udf4).trim(),
        udf5: String(udf5).trim(),
        key: String(this.config.merchant.key).trim()
      };

      const hashString = [
        sanitizedData.salt,
        sanitizedData.status,
        '', '', '', '', '', // Empty values for udf10-udf6
        sanitizedData.udf5,
        sanitizedData.udf4,
        sanitizedData.udf3,
        sanitizedData.udf2,
        sanitizedData.udf1,
        sanitizedData.email,
        sanitizedData.firstname,
        sanitizedData.productinfo,
        sanitizedData.amount,
        sanitizedData.txnid,
        sanitizedData.key
      ].join('|');

      const hash = crypto.createHash('sha512').update(hashString).digest('hex');

      // Log hash verification for debugging (without sensitive data)
      console.log('🔍 PayU Response Hash Generated:', {
        txnid: sanitizedData.txnid,
        status: sanitizedData.status,
        amount: sanitizedData.amount,
        hashLength: hash.length,
        environment: this.config.environment
      });

      return hash;
    } catch (error) {
      console.error('❌ PayU Response Hash Generation Error:', error.message);
      throw new Error(`Response hash generation failed: ${error.message}`);
    }
  }

  /**
   * Validate payment response hash
   */
  validateResponseHash(responseData, receivedHash) {
    try {
      if (!receivedHash) {
        console.error('❌ PayU Hash Validation: No hash received');
        return false;
      }

      if (typeof receivedHash !== 'string' || receivedHash.length !== 128) {
        console.error('❌ PayU Hash Validation: Invalid hash format (expected 128 char SHA512)');
        return false;
      }

      const calculatedHash = this.generateResponseHash(responseData);
      const isValid = calculatedHash === receivedHash;

      if (isValid) {
        console.log('✅ PayU Hash Validation: SUCCESS', {
          txnid: responseData.txnid,
          status: responseData.status,
          environment: this.config.environment
        });
      } else {
        console.error('❌ PayU Hash Validation: FAILED', {
          txnid: responseData.txnid,
          status: responseData.status,
          expectedLength: calculatedHash.length,
          receivedLength: receivedHash.length,
          environment: this.config.environment
        });
      }

      return isValid;
    } catch (error) {
      console.error('❌ PayU Hash Validation Error:', error.message);
      return false;
    }
  }

  /**
   * Create payment parameters for PayU
   */
  createPaymentParams(orderData) {
    const {
      orderId,
      amount,
      currency,
      customerDetails,
      productInfo,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5
    } = orderData;

    // Generate transaction ID
    const txnid = this.generateTransactionId();

    // Validate required fields
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (!customerDetails.email || !validator.isEmail(customerDetails.email)) {
      throw new Error('Invalid email address');
    }

    if (!customerDetails.firstName || customerDetails.firstName.trim().length === 0) {
      throw new Error('Customer first name is required');
    }

    // Clean and validate phone number (optional)
    let phone = customerDetails.phone || '';
    if (phone && !validator.isMobilePhone(phone, 'any')) {
      phone = ''; // Clear invalid phone numbers
    }

    const paymentData = {
      key: this.config.merchant.key,
      txnid,
      amount: parseFloat(amount).toFixed(2),
      productinfo: productInfo || `Credit Purchase - Order ${orderId}`,
      firstname: customerDetails.firstName.trim(),
      email: customerDetails.email.toLowerCase().trim(),
      phone: phone,
      currency: currency || 'INR',
      udf1: udf1 || orderId, // Store order ID in UDF1
      udf2: udf2 || 'credit_purchase',
      udf3: udf3 || '',
      udf4: udf4 || '',
      udf5: udf5 || '',
      surl: this.config.successUrl,
      furl: this.config.failureUrl,
      curl: this.config.cancelUrl,
      service_provider: 'payu_paisa'
    };

    // Generate hash
    paymentData.hash = this.generatePaymentHash(paymentData);

    return paymentData;
  }

  /**
   * Get PayU payment URL
   */
  getPaymentUrl() {
    return this.config.environment === 'production'
      ? this.config.urls.production
      : this.config.urls.test;
  }

  /**
   * Create complete payment request data
   */
  createPaymentRequest(orderData) {
    try {
      const paymentParams = this.createPaymentParams(orderData);
      const paymentUrl = this.getPaymentUrl();

      return {
        success: true,
        paymentUrl,
        paymentParams,
        txnid: paymentParams.txnid,
        environment: this.config.environment
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify payment response from PayU
   */
  verifyPaymentResponse(responseData) {
    try {
      const {
        key,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        status,
        hash: receivedHash,
        mihpayid,
        mode,
        unmappedstatus,
        error,
        error_Message,
        net_amount_debit,
        discount,
        addedon,
        payment_source,
        bank_ref_num,
        bankcode,
        cardnum,
        cardhash
      } = responseData;

      // Enhanced validation for required fields
      const requiredFields = { txnid, amount, status, firstname, email };
      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([field]) => field);

      if (missingFields.length > 0) {
        const error = `Missing required response parameters: ${missingFields.join(', ')}`;
        console.error('❌ PayU Response Validation:', error);
        return {
          success: false,
          error,
          missingFields
        };
      }

      // Validate merchant key
      if (key !== this.config.merchant.key) {
        const error = 'Invalid merchant key in response';
        console.error('❌ PayU Response Validation:', error);
        return {
          success: false,
          error,
          securityIssue: true
        };
      }

      // Validate amount format
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        const error = 'Invalid amount in response';
        console.error('❌ PayU Response Validation:', error);
        return {
          success: false,
          error,
          invalidAmount: amount
        };
      }

      // Validate transaction ID format
      if (typeof txnid !== 'string' || txnid.length < 10) {
        const error = 'Invalid transaction ID format';
        console.error('❌ PayU Response Validation:', error);
        return {
          success: false,
          error,
          invalidTxnid: txnid
        };
      }

      // Verify hash with enhanced security
      const hashValidationData = {
        status: String(status).trim(),
        txnid: String(txnid).trim(),
        amount: numAmount.toFixed(2),
        productinfo: String(productinfo || '').trim(),
        firstname: String(firstname).trim(),
        email: String(email).toLowerCase().trim(),
        udf1: String(responseData.udf1 || '').trim(),
        udf2: String(responseData.udf2 || '').trim(),
        udf3: String(responseData.udf3 || '').trim(),
        udf4: String(responseData.udf4 || '').trim(),
        udf5: String(responseData.udf5 || '').trim()
      };

      const isHashValid = this.validateResponseHash(hashValidationData, receivedHash);

      if (!isHashValid) {
        const error = 'Hash validation failed - possible tampering detected';
        console.error('❌ PayU Response Validation:', error, {
          txnid: hashValidationData.txnid,
          status: hashValidationData.status,
          environment: this.config.environment
        });
        return {
          success: false,
          error,
          securityIssue: true,
          txnid: hashValidationData.txnid
        };
      }

      // Determine payment status
      const isPaymentSuccessful = status.toLowerCase() === 'success';
      const isPaymentFailed = status.toLowerCase() === 'failure';
      const isPaymentPending = status.toLowerCase() === 'pending';

      return {
        success: true,
        paymentStatus: status.toLowerCase(),
        isPaymentSuccessful,
        isPaymentFailed,
        isPaymentPending,
        transactionDetails: {
          txnid,
          mihpayid,
          amount: parseFloat(amount),
          mode,
          status,
          unmappedstatus,
          net_amount_debit: net_amount_debit ? parseFloat(net_amount_debit) : null,
          discount: discount ? parseFloat(discount) : 0,
          addedon,
          payment_source,
          bank_ref_num,
          bankcode,
          cardnum: cardnum ? `****${cardnum.slice(-4)}` : null, // Mask card number for security
          error,
          error_Message
        },
        customerDetails: {
          firstname,
          email,
          udf1: responseData.udf1,
          udf2: responseData.udf2,
          udf3: responseData.udf3,
          udf4: responseData.udf4,
          udf5: responseData.udf5
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Payment verification failed: ${error.message}`
      };
    }
  }

  /**
   * Check if PayU is properly configured
   */
  isConfigured() {
    return !!(this.config.merchant.key && this.config.merchant.salt);
  }

  /**
   * Get configuration status
   */
  getConfigStatus() {
    return {
      isConfigured: this.isConfigured(),
      environment: this.config.environment,
      merchantKeyConfigured: !!this.config.merchant.key,
      merchantSaltConfigured: !!this.config.merchant.salt,
      merchantIdConfigured: !!this.config.merchant.id,
      paymentUrl: this.getPaymentUrl(),
      successUrl: this.config.successUrl,
      failureUrl: this.config.failureUrl,
      cancelUrl: this.config.cancelUrl
    };
  }

  /**
   * Test PayU configuration and hash generation
   */
  testConfiguration() {
    try {
      console.log('🧪 Testing PayU Configuration...');

      // Test basic configuration
      const configStatus = this.getConfigStatus();
      console.log('📋 Configuration Status:', configStatus);

      if (!configStatus.isConfigured) {
        throw new Error('PayU is not properly configured');
      }

      // Test hash generation with sample data
      const testPaymentData = {
        txnid: 'TEST_TXN_123456789',
        amount: '100.00',
        productinfo: 'Test Credit Purchase',
        firstname: 'Test',
        email: 'test@example.com',
        udf1: 'test_order_123'
      };

      console.log('🔐 Testing Payment Hash Generation...');
      const paymentHash = this.generatePaymentHash(testPaymentData);
      console.log('✅ Payment Hash Generated Successfully:', {
        length: paymentHash.length,
        isValidFormat: paymentHash.length === 128
      });

      // Test response hash generation
      const testResponseData = {
        status: 'success',
        txnid: testPaymentData.txnid,
        amount: testPaymentData.amount,
        productinfo: testPaymentData.productinfo,
        firstname: testPaymentData.firstname,
        email: testPaymentData.email,
        udf1: testPaymentData.udf1
      };

      console.log('🔍 Testing Response Hash Generation...');
      const responseHash = this.generateResponseHash(testResponseData);
      console.log('✅ Response Hash Generated Successfully:', {
        length: responseHash.length,
        isValidFormat: responseHash.length === 128
      });

      // Test hash validation
      console.log('🔒 Testing Hash Validation...');
      const isValid = this.validateResponseHash(testResponseData, responseHash);
      console.log('✅ Hash Validation Test:', isValid ? 'PASSED' : 'FAILED');

      console.log('🎉 PayU Configuration Test Completed Successfully!');

      return {
        success: true,
        configStatus,
        tests: {
          paymentHashGeneration: true,
          responseHashGeneration: true,
          hashValidation: isValid
        }
      };
    } catch (error) {
      console.error('❌ PayU Configuration Test Failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate payment form HTML (for direct form submission)
   */
  generatePaymentForm(paymentParams, autoSubmit = true) {
    const paymentUrl = this.getPaymentUrl();

    let formFields = '';
    Object.keys(paymentParams).forEach(key => {
      if (paymentParams[key] !== null && paymentParams[key] !== undefined) {
        formFields += `<input type="hidden" name="${key}" value="${paymentParams[key]}" />`;
      }
    });

    const autoSubmitScript = autoSubmit ? `
      <script>
        document.getElementById('payuForm').submit();
      </script>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redirecting to PayU...</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <h2>Redirecting to PayU Payment Gateway...</h2>
          <div class="loader"></div>
          <p>Please wait while we redirect you to the payment page.</p>

          <form id="payuForm" method="post" action="${paymentUrl}">
            ${formFields}
            ${!autoSubmit ? '<input type="submit" value="Pay Now" />' : ''}
          </form>

          ${autoSubmitScript}
        </body>
      </html>
    `;
  }
}

module.exports = new PayUService();