const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo',
  secure: true
});

/**
 * Upload base64 image data to Cloudinary
 * @param {string} base64Data - Base64 encoded image data
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadBase64Image = async (base64Data, options = {}) => {
  try {
    console.log('☁️ Uploading image to Cloudinary...');

    const uploadOptions = {
      resource_type: 'image',
      folder: 'automation-posts',
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      format: 'jpg',
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };

    // Ensure base64 data has proper format
    const base64DataUrl = base64Data.startsWith('data:')
      ? base64Data
      : `data:image/jpeg;base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(base64DataUrl, uploadOptions);

    console.log('✅ Image uploaded to Cloudinary successfully');
    console.log(`📎 URL: ${result.secure_url}`);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      uploaded_at: new Date(result.created_at)
    };

  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error);
    throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
  }
};

/**
 * Upload image from URL to Cloudinary
 * @param {string} imageUrl - URL of the image to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadImageFromUrl = async (imageUrl, options = {}) => {
  try {
    console.log('☁️ Uploading image from URL to Cloudinary...');

    const uploadOptions = {
      resource_type: 'image',
      folder: 'automation-posts',
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };

    const result = await cloudinary.uploader.upload(imageUrl, uploadOptions);

    console.log('✅ Image uploaded to Cloudinary successfully');
    console.log(`📎 URL: ${result.secure_url}`);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      uploaded_at: new Date(result.created_at)
    };

  } catch (error) {
    console.error('❌ Cloudinary upload from URL failed:', error);
    throw new Error(`Failed to upload image from URL to Cloudinary: ${error.message}`);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<Object>} Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    console.log(`🗑️ Deleting image from Cloudinary: ${publicId}`);

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      console.log('✅ Image deleted successfully');
    } else {
      console.log('⚠️ Image deletion result:', result.result);
    }

    return result;
  } catch (error) {
    console.error('❌ Failed to delete image from Cloudinary:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - Public ID of the image
 * @param {Object} transformations - Cloudinary transformations
 * @returns {string} Optimized image URL
 */
const getOptimizedImageUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: 'auto',
    fetch_format: 'auto',
    ...transformations
  };

  return cloudinary.url(publicId, defaultTransformations);
};

module.exports = {
  uploadBase64Image,
  uploadImageFromUrl,
  deleteImage,
  getOptimizedImageUrl,
  cloudinary
};