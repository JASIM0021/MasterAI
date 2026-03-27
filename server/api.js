const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');
const mime = require('mime-types');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = 3000;

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname +
        '-' +
        Date.now() +
        '.' +
        file.originalname.split('.').pop(),
    );
  },
});

const upload = multer({ storage: storage });

async function uploadToGemini(path, mimeType) {
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp-image-generation',
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseModalities: ['image', 'text'],
  responseMimeType: 'text/plain',
};

app.post('/editImage', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No image file uploaded.');
    }

    const imagePath = req.file.path;
    const mimeType = mime.lookup(imagePath);
    const uploadedFile = await uploadToGemini(imagePath, mimeType);

    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).send('Prompt is required.');
    }

    const parts = [
      {
        inlineData: {
          mimeType: mimeType,
          data: fs.readFileSync(imagePath, 'base64'),
        },
      },
      { text: prompt }, // Corrected prompt format
    ];

    const result = await model.generateContent({
      contents: [{ parts }],
      generationConfig,
    });

    const response = await result.response;

    const textResponse = response.text();
    const imageParts = response.candidates[0].content.parts.filter(
      part => part.inlineData,
    );

    if (imageParts.length > 0) {
      const imageData = imageParts[0].inlineData.data;
      const imageMimeType = imageParts[0].inlineData.mimeType;

      const base64Image = `data:${imageMimeType};base64,${imageData}`;
      res.json({ image: base64Image, text: textResponse });
    } else {
      res.json({ text: textResponse });
    }

    fs.unlinkSync(imagePath);
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).send('Error processing image.');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
