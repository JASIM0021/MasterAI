const fs = require('fs');
const {
  uploadFileToGoogleAI,
  generateMCQAnswers,
  deleteFileFromGoogleAI,
  deleteAllLocalFiles,
  generateCustom,
} = require('../services/googleAIService.js');

const path = require('path');
const Type = require('../Type/index.js');
const ApiKey = require('../model/ApiKey.js');

const processFileUpload = async (req, res) => {
  try {
    const { path, mimetype, originalname } = req?.file;

    // console.log(' path, mimetype, originalname', path, mimetype, originalname);
    // Upload the file to Google Generative AI
    const uploadResponse = await uploadFileToGoogleAI(
      path,
      mimetype,
      originalname,
    );

    console.log('Upload complete');

    // Generate MCQ answers using the uploaded file
    let answers = await generateMCQAnswers(
      uploadResponse.file.uri,
      uploadResponse.file.mimeType,
    );

    deleteAllLocalFiles();
    // Attempt to parse the nested JSON string, if present
    try {
      answers = JSON.parse(answers);
    } catch (error) {
      console.log('error', error);
      // If parsing fails, assume it's already a valid JSON object and proceed
    }
    // Respond with the generated content
    res.json({ response: answers });
  } catch (error) {
    // Handle errors
    console.log('error', error);
    res.status(500).json({ error: error.message });
  }
};
// const processVideoUpload = async (req, res) => {
//   try {
//     const { path, mimetype, originalname } = req.file;

//     console.log('video uploded', path, mimetype, originalname);
//     // Upload the file to Google Generative AI
//     const uploadResponse = await uploadFileToGoogleAI(
//       path,
//       mimetype,
//       originalname,
//     );

//     console.log('uploadResponse', uploadResponse);
//     // Generate MCQ answers using the uploaded file
//     let answers = await generateMCQAnswers(
//       uploadResponse.file.uri,
//       uploadResponse.file.mimeType,
//     );

//     console.log('answers', answers);
//     // Attempt to parse the nested JSON string, if present
//     try {
//       answers = JSON.parse(answers);
//     } catch (error) {
//       // If parsing fails, assume it's already a valid JSON object and proceed
//     }

//     // Respond with the generated content

//     // console.log('answers', answers)
//     res.json({ response: answers });
//   } catch (error) {
//     // Handle errors
//     res.status(500).json({ error: error.message });
//   }
// };

const generateCaption = async (req, res) => {
  if (req?.file) {
    try {
      const { path, mimetype, originalname } = req?.file;

      // console.log(' path, mimetype, originalname', path, mimetype, originalname);
      // Upload the file to Google Generative AI
      const uploadResponse = await uploadFileToGoogleAI(
        path,
        mimetype,
        originalname,
      );

      // Generate MCQ answers using the uploaded file
      let answers = await generateMCQAnswers(
        uploadResponse.file.uri,
        uploadResponse.file.mimeType,
        Type.CAPTION,
        req?.body,
      );

      deleteAllLocalFiles();
      // Attempt to parse the nested JSON string, if present
      try {
        answers = JSON.parse(answers);
      } catch (error) {
        console.log('error', error);
        // If parsing fails, assume it's already a valid JSON object and proceed
      }
      // Respond with the generated content
      res.json({ response: answers });
    } catch (error) {
      // Handle errors
      console.log('error', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: 'No file provided' });
  }
};

const generateLinkdinPost = async (req, res) => {
  if (req?.file) {
    try {
      const { path, mimetype, originalname } = req?.file;

      // console.log(' path, mimetype, originalname', path, mimetype, originalname);
      // Upload the file to Google Generative AI
      const uploadResponse = await uploadFileToGoogleAI(
        path,
        mimetype,
        originalname,
      );

      console.log('Upload complete');

      // Generate MCQ answers using the uploaded file
      let answers = await generateMCQAnswers(
        uploadResponse.file.uri,
        uploadResponse.file.mimeType,
        Type.FACEBOOK,
        req?.body,
      );

      deleteAllLocalFiles();
      // Attempt to parse the nested JSON string, if present
      try {
        answers = JSON.parse(answers);
      } catch (error) {
        console.log('error', error);
        // If parsing fails, assume it's already a valid JSON object and proceed
      }
      // Respond with the generated content
      res.json({ response: answers });
    } catch (error) {
      // Handle errors
      console.log('error', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: 'No file provided' });
  }
};

const generateFacebookPost = async (req, res) => {
  if (req?.file) {
    try {
      const { path, mimetype, originalname } = req?.file;

      // console.log(' path, mimetype, originalname', path, mimetype, originalname);
      // Upload the file to Google Generative AI
      const uploadResponse = await uploadFileToGoogleAI(
        path,
        mimetype,
        originalname,
      );

      console.log('Upload complete');

      // Generate MCQ answers using the uploaded file
      let answers = await generateMCQAnswers(
        uploadResponse.file.uri,
        uploadResponse.file.mimeType,
        Type.FACEBOOK,
      );

      deleteAllLocalFiles();
      // Attempt to parse the nested JSON string, if present
      try {
        answers = JSON.parse(answers);
      } catch (error) {
        console.log('error', error);
        // If parsing fails, assume it's already a valid JSON object and proceed
      }
      // Respond with the generated content
      res.json({ response: answers });
    } catch (error) {
      // Handle errors
      console.log('error', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: 'No file provided' });
  }
};

const feelingAnalizer = async (req, res, type) => {
  if (req?.file) {
    try {
      const { path, mimetype, originalname } = req?.file;

      const { situation, background } = req.body;
      // console.log(' path, mimetype, originalname', path, mimetype, originalname);
      // Upload the file to Google Generative AI
      const uploadResponse = await uploadFileToGoogleAI(
        path,
        mimetype,
        originalname,
      );

      console.log('Upload complete', uploadResponse);

      // Generate MCQ answers using the uploaded file
      let answers = await generateMCQAnswers(
        uploadResponse.file.uri,
        uploadResponse.file.mimeType,
        type,
        req?.body,
      );

      // Attempt to parse the nested JSON string, if present
      try {
        answers = JSON.parse(answers);
      } catch (error) {
        console.log('error', error);
        // If parsing fails, assume it's already a valid JSON object and proceed
      }
      // Respond with the generated content
      res.json({ response: answers });
    } catch (error) {
      // Handle errors
      console.log('error', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: 'No file provided' });
  }
};

const generateQuote = async (req, res, type) => {
  if (!req?.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const { path, mimetype, originalname } = req?.file;

    const { situation, background } = req.body;
    // console.log(' path, mimetype, originalname', path, mimetype, originalname);
    // Upload the file to Google Generative AI
    const uploadResponse = await uploadFileToGoogleAI(
      path,
      mimetype,
      originalname,
    );

    console.log('Upload complete');

    // Generate MCQ answers using the uploaded file
    let answers = await generateMCQAnswers(
      uploadResponse.file.uri,
      uploadResponse.file.mimeType,
      type,
      req?.body,
    );

    // Attempt to parse the nested JSON string, if present
    try {
      answers = JSON.parse(answers);
    } catch (error) {
      console.log('error', error);
      // If parsing fails, assume it's already a valid JSON object and proceed
    }
    // Respond with the generated content
    res.json({ response: answers });
  } catch (error) {
    // Handle errors
    console.log('error', error);
    res.status(500).json({ error: error.message });
  }
};

const genrateCustom = async (req, res, type) => {
  // ceck file valodation
  if (!req?.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    let answers = await generateCustom(type, req?.body);

    // Attempt to parse the nested JSON string, if present
    try {
      answers = JSON.parse(answers);
    } catch (error) {
      console.log('error', error);
      // If parsing fails, assume it's already a valid JSON object and proceed
    }
    // Respond with the generated content
    res.json({ response: answers });
  } catch (error) {
    // Handle errors
    console.log('error', error);
    res.status(500).json({ error: error.message });
  }
};

const generatePrompt = async (req, res, type) => {
  // ceck file valodation

  try {
    let answers = await generateCustom(type, req?.query);

    // Attempt to parse the nested JSON string, if present
    try {
      answers = JSON.parse(answers);
    } catch (error) {
      console.log('error', error);
      // If parsing fails, assume it's already a valid JSON object and proceed
    }
    // Respond with the generated content
    res.json({ response: answers });
  } catch (error) {
    // Handle errors
    console.log('error', error);
    res.status(500).json({ error: error.message });
  }
};

const generateCode = async (req, res, type) => {
  // ceck file valodation

  try {
    let answers = await generateCustom(type, req.body);

    // Attempt to parse the nested JSON string, if present
    try {
      answers = JSON.parse(answers);
    } catch (error) {
      console.log('error', error);
      // If parsing fails, assume it's already a valid JSON object and proceed
    }
    console.log('req.apiKey ', req.apiKey);
    const apiKey = await ApiKey.findOne({ key: req?.apiKey?.key });
    console.log('apiKey', apiKey);
    // Update last used and increment count
    apiKey.lastUsed = new Date();
    apiKey.usageCount += 1;
    await apiKey.save();
    // Respond with the generated content
    res.json({ response: answers });
  } catch (error) {
    // Handle errors
    console.log('error', error);
    res.status(500).json({ error: error.message });
  }
};

// Preprocessing function for the text prompt (adjust according to your model's needs)
function preprocessPrompt(prompt) {
  // Simple text preprocessing
  return prompt.toLowerCase().trim();
}
module.exports = {
  processFileUpload,
  generateCaption,
  generateLinkdinPost,
  generateFacebookPost,
  feelingAnalizer,
  generateQuote,
  genrateCustom,
  generatePrompt,
  generateCode,
};
