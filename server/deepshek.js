import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey:process.env.OPEN_AI_API_KEY
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
          text: 'create fully functional website of user protfolio',
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
  console.log('response', JSON.parse(response.output_text));
} catch (error) {
console.log('response', response);
  
}