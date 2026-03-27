const { validateKey } = require('../services/apiKeyService');
const ApiKey = require('../model/ApiKey');
const { generateWebsiteContent } = require('../services/websiteBuilder/websiteBuilder');
const { default: axios } = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha1File(filePath) {
  console.log('filePath', filePath)
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha1').update(fileBuffer).digest('hex');
}

const { execSync } = require('child_process');
const apikeyController = async (req, res) => {
  const response = await validateKey(req?.query?.key);

  console.log('response', response);
  return res.status(response?.statusCode).json(response);
};

const registerDevice = async (req, res) => {
  try {
    const { key, deviceUuid } = req.body;

    if (!key || !deviceUuid) {
      return res.status(400).json({
        statusCode: 400,
        message: 'API key and device UUID are required',
      });
    }

    // Validate the API key first
    const keyValidation = await validateKey(key);
    if (keyValidation.statusCode !== 200) {
      return res.status(keyValidation.statusCode).json(keyValidation);
    }

    // Check if device is already registered with another key
    const existingDevice = await ApiKey.findOne({ key });

    console.log('existingDevice', existingDevice);

    if (existingDevice.deviceUuid) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Device is already registered with another API key',
      });
    }

    // Update the API key with the device UUID
    const updatedKey = await ApiKey.findOneAndUpdate(
      { key },
      { deviceUuid },
      { new: true },
    );

    return res.status(200).json({
      statusCode: 200,
      message: 'Device registered successfully',
      data: {
        key: updatedKey.key,
        deviceUuid: updatedKey.deviceUuid,
        expiresAt: updatedKey.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
    });
  }
};


const generateWebsiteContentController = async (req, res) => {
  try {
    let answers = await generateWebsiteContent(req.body.prompt);
      // answers = JSON.parse(answers);
    if (answers) {
      return res.status(200).json({
        response:answers ,
      });
    }
    console.log('result.response', result[0])

    return res.status(400).json({
      message: 'Incomplete result returned by model.',
      output: result,
    });
  } catch (error) {
    console.error('Error generating website content:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};



const NETLIFY_TOKEN = 'nfp_A2SHTP6yXmaCgU93CeM3pcKM53Adb4ie6bee';
const NETLIFY_TEAM_ID = 'jasim0021'; // optional
const YOUR_DOMAIN = 'bupsediagnosis.co.in'; // domain purchased on Hostinger
const teamName ="jasim0021"


function sha1File(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha1').update(fileBuffer).digest('hex');
  } catch (err) {
    console.error(`Error reading file for SHA1: ${filePath}`, err);
    throw err;
  }
}

async function deployWebsite(req, res) {
  try {
    const { html, subdomain } = req.body;
    const siteName = `${subdomain}-${Date.now()}-${Math.floor(
      Math.random() * 10000,
    )}`;
    const teamSlug = 'jasim0021';

    // Create temp directory in a more reliable location
    const tempDir = path.join(process.cwd(), 'temp-sites', siteName);
    console.log('tempDir', tempDir);

    // Ensure directory exists
    fs.mkdirSync(tempDir, { recursive: true });

    const indexPath = path.join(tempDir, 'index.html');
    console.log('indexPath', indexPath);
    fs.writeFileSync(indexPath, html, 'utf8');

    // Step 1: Create the site
    const siteResp = await axios.post(
      `https://api.netlify.com/api/v1/sites`,
      {
        name: siteName,
        account_slug: teamSlug,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('siteResp', siteResp.data);
    const siteId = siteResp.data.id;

    // Step 2: Generate SHA map
    const fileSha = sha1File(indexPath);
    const filesMap = {
      'index.html': fileSha,
    };

    const deployStart = await axios.post(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        files: filesMap,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('deployStart', deployStart.data);

    const requiredFiles = deployStart.data.required || [];
    console.log('requiredFiles', requiredFiles);

    // Step 3: Upload required files
    for (const filePath of requiredFiles) {
      const fullPath = path.join(tempDir, filePath);
      console.log('Uploading file:', fullPath);

      try {
        const content = fs.readFileSync(fullPath);
        await axios.put(deployStart.data.upload_url + filePath, content, {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        });
        console.log('Successfully uploaded:', filePath);
      } catch (err) {
        console.error('Error uploading file:', filePath, err);
        throw err;
      }
    }

    // Step 4: Set custom domain
    try {
      const customDomain = `${subdomain}.bupsediagnosis.co.in`;
      await axios.patch(
        `https://api.netlify.com/api/v1/sites/${siteId}`,
        {
          custom_domain: customDomain,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );
      console.log('Domain update successful');
    } catch (error) {
      console.error(
        'Error updating domain:',
        error.response?.data || error.message,
      );
      // Don't fail the deployment if domain setup fails
    }

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });

    return res.json({
      success: true,
      siteId,
      siteName,
      deployUrl:
        deployStart.data.deploy_ssl_url || `https://${siteName}.netlify.app`,
    });
  } catch (err) {
    console.error('Full deployment error:', err);
    return res.status(500).json({
      success: false,
      error: 'Deployment failed',
      details: err.response?.data || err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}
module.exports = {
  apikeyController,
  registerDevice,
  generateWebsiteContentController,
  deployWebsite,
};
