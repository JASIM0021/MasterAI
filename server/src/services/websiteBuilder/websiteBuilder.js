const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../../config/config");
const  OpenAI  =  require('openai');

const websiteResponse = {
  type: 'object',
  properties: {
    response: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          html: {
            type: 'string',
          },
          css: {
            type: 'string',
          },
          js: {
            type: 'string',
          },
        },
        required: ['html', 'css', 'js'],
      },
    },
  },
  required: ['response'],
};


const generateWebsiteContent = async (prompt) => {
  return useGpt(prompt)
}


const useGimini = async (prompt) => {
   const genAI = new GoogleGenerativeAI(config.apiKey);

   let systemPrompt = `You are an expert web developer who can generate website drafts from text prompts.
  Based on the following prompt, generate:
  1. The HTML body content. If JavaScript is needed for basic interactions or animations, embed it directly within <script> tags in this HTML. This HTML will form the content of the <body> tag.
  2. The CSS styles for this HTML. The CSS should be self-contained and style only the elements present in the HTML.

  Prompt: ${prompt}

  Provide the HTML (htmlBodyWithScripts) and CSS (css) and js as separate, distinct outputs according to the output schema.
  The website should be responsive, modern, and visually appealing and css are connected with style.css and script.js as well.
  Ensure the HTML is well-structured and the CSS is clean.
  `;

   const models = ['gemini-2.0-'];
   let lastError = null;

   for (const modelName of models) {
     try {
       let model = genAI.getGenerativeModel({
         model: modelName,
         generationConfig: {
           temperature: 0,
           topP: 1,
           topK: 64,
           maxOutputTokens: 8192,
           responseMimeType: 'application/json',
           responseSchema: websiteResponse,
         },
       });
       const result = await model.generateContent([{ text: systemPrompt }]);
       return result.response.text();
     } catch (error) {
       console.log(`Failed with model ${modelName}:`, error.message);
       lastError = error;
       continue;
     }
   }

   throw new Error(`All models failed. Last error: ${lastError.message}`);
}

const useGpt = async (prompt) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
const response = await openai.responses.create({
  model: 'gpt-4o',
  input: [
    {
      role: 'system',
      content: [
        {
          type: 'input_text',
          text: 'You are an expert web developer who can generate website drafts from text prompts.\n  Based on the following prompt, generate:\n  1. The HTML body content. If JavaScript is needed for basic interactions or animations, embed it directly within <script> tags in this HTML. This HTML will form the content of the <body> tag.\n  2. The CSS styles for this HTML. The CSS should be self-contained and style only the elements present in the HTML.\n\n  Prompt: ${prompt}\n\n  Provide the HTML (htmlBodyWithScripts) and CSS (CSS), as well as JS, as separate, distinct outputs according to the output schema.\n  The website should be responsive, modern, and visually appealing and css are connected with style.css and script.js as well.\n  Ensure the HTML is well-structured and the CSS is clean.\n . Use standard HTML, tailwind css, and JavaScript.',
        },
      ],
    },
   

  
  
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: prompt,
        },
      ],
    },
  ],
  text: {
    format: {
      type: 'json_schema',
      name: 'web_resources',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          html: {
            type: 'string',
            description: 'The HTML content as a string.',
          },
          css: {
            type: 'string',
            description: 'The CSS styles as a string.',
          },
          js: {
            type: 'string',
            description: 'The JavaScript code as a string.',
          },
        },
        required: ['html', 'css', 'js'],
        additionalProperties: false,
      },
    },
  },
  reasoning: {},
  tools: [],
  temperature: 1,
  max_output_tokens: 5000,
  top_p: 1,
  store: true,
});
  
  try {
   return JSON.parse(response.output_text);
  } catch (error) {
    return response;
  //  return useGimini(prompt)
  }

}


  module.exports = {
    generateWebsiteContent,
  };