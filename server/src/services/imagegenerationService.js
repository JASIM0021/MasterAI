const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const { uploadFileToGoogleAI } = require('./googleAIService');
// Multer setup for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Setup Gemini API
const apiKey = process.env.GOOGLE_API_KEY; // Ensure the Gemini API key is set in your environment variables
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Function to upload file to Gemini
async function uploadToGemini(filePath, mimeType) {
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType,
    displayName: path.basename(filePath),
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}

async function generateImage(filePath, promptText, req) {
  const { path, mimetype, originalname } = req?.file;

  // console.log(' path, mimetype, originalname', path, mimetype, originalname);
  // Upload the file to Google Generative AI
  const uploadResponse = await uploadFileToGoogleAI(
    path,
    mimetype,
    originalname,
  );

  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json', // Expecting image output
  };

  let model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp-image-generation',
    // Set the `responseMimeType` to output JSON
    // Pass the schema object to the `responseSchema` field
    generationConfig: generationConfig,
  });

  const result = await model.generateContent([
    {
      fileData: {
        mimeType: uploadResponse.file.mimeType,
        fileUri: uploadResponse.file.uri,
      },
    },
    { text: promptText },
  ]);
  console.log('result.response;', result.response.text());
  return result.response;
}

const imageedit = async (req, res) => {
  if (!req?.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const imagePath = req.file.path; // Path to the uploaded file
    const promptText = req.body.prompt; // Prompt for the image

    // Generate the edited image
    const editedImagePath = await generateImage(imagePath, promptText, req);

    // Send the edited image as a response
    res.sendFile(editedImagePath, err => {
      if (err) {
        res.status(500).send({ error: 'Error sending file' });
      }
      // Clean up the uploaded and edited files
      fs.unlinkSync(imagePath); // Delete the original uploaded file
      fs.unlinkSync(editedImagePath); // Delete the generated image
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error generating image' });
  }
};

module.exports = {
  imageedit,
};
