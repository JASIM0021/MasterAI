// import the Genkit and Google AI plugin libraries
const { googleAI, gemini20ProExp0205 } = require('@genkit-ai/googleai');
const { genkit } = require('genkit');

const dotenv = require('dotenv').config();

// configure a Genkit instance
const ai = genkit({
  plugins: [googleAI()],
  model: gemini20ProExp0205, // set default model
});

const helloFlow = ai.defineFlow('helloFlow', async name => {
  // make a generation request
  const res = await ai.generate(`i need to generate image`);
  console.log(res);
});

helloFlow('Chris');
