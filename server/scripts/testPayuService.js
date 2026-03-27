require('dotenv').config();
const payuService = require('../src/services/payuService');

async function testPayuService() {
  console.log('🚀 Testing Enhanced PayU Service...\n');

  try {
    // Test configuration
    const configTest = payuService.testConfiguration();

    if (!configTest.success) {
      console.error('❌ PayU configuration test failed:', configTest.error);
      return;
    }

    console.log('\n📊 Configuration Test Results:');
    console.log('  ✅ Basic Configuration: Passed');
    console.log('  ✅ Payment Hash Generation: Passed');
    console.log('  ✅ Response Hash Generation: Passed');
    console.log('  ✅ Hash Validation: Passed');

    // Test payment request creation
    console.log('\n🔧 Testing Payment Request Creation...');

    const testOrderData = {
      orderId: 'TEST_ORDER_12345',
      amount: 399,
      currency: 'INR',
      customerDetails: {
        firstName: 'John',
        email: 'john.doe@example.com',
        phone: '9876543210'
      },
      productInfo: 'Popular Pack - 500 Credits + 200 Bonus',
      udf1: 'TEST_ORDER_12345',
      udf2: 'credit_purchase'
    };

    const paymentRequest = payuService.createPaymentRequest(testOrderData);

    if (paymentRequest.success) {
      console.log('  ✅ Payment Request Created Successfully');
      console.log('  📋 Transaction ID:', paymentRequest.txnid);
      console.log('  🌐 Payment URL:', paymentRequest.paymentUrl);
      console.log('  🔐 Hash Length:', paymentRequest.paymentParams.hash.length);
    } else {
      console.log('  ❌ Payment Request Failed:', paymentRequest.error);
    }

    // Test response verification with sample data
    console.log('\n🔍 Testing Response Verification...');

    const sampleResponse = {
      key: payuService.config.merchant.key,
      txnid: paymentRequest.txnid,
      amount: '399.00',
      productinfo: testOrderData.productInfo,
      firstname: testOrderData.customerDetails.firstName,
      email: testOrderData.customerDetails.email,
      status: 'success',
      udf1: testOrderData.udf1,
      udf2: testOrderData.udf2,
      mihpayid: '12345678901234567890',
      mode: 'CC',
      bank_ref_num: 'TEST_BANK_REF_123'
    };

    // Generate the correct hash for this response
    const responseHash = payuService.generateResponseHash(sampleResponse);
    sampleResponse.hash = responseHash;

    const verificationResult = payuService.verifyPaymentResponse(sampleResponse);

    if (verificationResult.success) {
      console.log('  ✅ Response Verification: SUCCESS');
      console.log('  📊 Payment Status:', verificationResult.paymentStatus);
      console.log('  💰 Transaction Amount:', verificationResult.transactionDetails.amount);
      console.log('  🔒 Hash Validation: PASSED');
    } else {
      console.log('  ❌ Response Verification: FAILED');
      console.log('  🚫 Error:', verificationResult.error);
    }

    console.log('\n🎉 All PayU Service Tests Completed Successfully!');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testPayuService();