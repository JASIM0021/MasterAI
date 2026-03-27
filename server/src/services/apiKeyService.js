// services/apiKeyService.js

const ApiKey = require('../model/ApiKey');

class ApiKeyService {
  async createKey(body) {
    const { name, duration = 1, durationType = 'M', scopes = ['basic'] } = body;
    const expiresAt = new Date();
    console.log('durationType', durationType);

    switch (durationType) {
      case 'M':
        expiresAt.setMonth(expiresAt.getMonth() + duration);
        break;
      case 'W':
        expiresAt.setDate(expiresAt.getDate() + duration * 7);
        break;
      case 'D':
        expiresAt.setDate(expiresAt.getDate() + duration);
        break;
      case 'H':
        expiresAt.setHours(expiresAt.getHours() + duration);
        break;
      case 'm':
        expiresAt.setMinutes(expiresAt.getMinutes() + duration);
        break;
      default:
        throw new Error('Invalid duration type');
    }

    const key = ApiKey.generateKey();

    const apiKey = new ApiKey({
      key,
      name,
      expiresAt,
      scopes,
    });

    await apiKey.save();
    return apiKey;
  }

  async revokeKey(keyId) {
    return ApiKey.findByIdAndUpdate(keyId, { isActive: false }, { new: true });
  }

  async renewKey(keyId, durationMonths = 1) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    return ApiKey.findByIdAndUpdate(
      keyId,
      { expiresAt, isActive: true },
      { new: true },
    );
  }

  async validateKey(key) {
    const apiKey = await ApiKey.findOne({ key });

    if (!apiKey) {
      // throw new Error('Invalid API key');

      return {
        messssage: 'Invalid API key',
        statusCode: 401,
      };
    }

    if (!apiKey.isActive) {
      return {
        messssage: 'API key revoked',
        statusCode: 401,
      };
      // throw new Error('API key revoked');
    }

    if (apiKey.isExpired()) {
      return {
        messssage: 'API key expired',
        statusCode: 401,
      };
      throw new Error('API key expired');
    }

    // // Update last used and increment count
    apiKey.lastUsed = new Date();
    // apiKey.usageCount += 1;
    // await apiKey.save();

    return {
      messssage: 'Api key verified',
      apiKey,
      statusCode: 200,
    };
  }

  async getKeysForUser(userId) {
    return ApiKey.find({ owner: userId }).sort('-createdAt');
  }

  
}

module.exports = new ApiKeyService();
