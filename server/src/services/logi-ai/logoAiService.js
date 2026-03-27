const NodeCache  = require('node-cache');
const { default: OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { v4: uuidv4 } = require('uuid');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

const enhancePromptWithGPT = async (originalPrompt, industry, style) => {
  const cacheKey = `enhance_${originalPrompt}_${industry}_${style}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const systemPrompt = `You are a professional logo design expert. Enhance the user's logo prompt to be more specific, creative, and suitable for AI image generation. Consider the industry and style preferences if provided.

Guidelines:
- Be specific about visual elements, colors, typography, and composition
- Include professional design terminology
- Consider brand psychology and target audience
- Make it suitable for DALL-E image generation
- Keep it concise but detailed (under 200 words)
- Focus on visual elements that work well in logo format

Industry: ${industry || 'Not specified'}
Style: ${style || 'Not specified'}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Original prompt: "${originalPrompt}"` },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const enhanced = completion.choices[0].message.content.trim();
    cache.set(cacheKey, enhanced);

    return enhanced;
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    throw new Error('Failed to enhance prompt');
  }
};


const generateLogoWithDALLE = async prompt => {
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Professional logo design: ${prompt}. Clean, modern, scalable vector-style logo on transparent or white background. High contrast, suitable for business use.`,
      size: '1024x1024',
      quality: 'hd',
      n: 1,
    });

    return response.data[0].url;
  } catch (error) {
    console.error('Error generating logo:', error);
    throw new Error('Failed to generate logo');
  }
};

const downloadAndOptimizeImage = async (imageUrl, logoId, format = 'png') => {
  try {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    let optimizedBuffer;
    const outputPath = path.join(uploadsDir, `${logoId}.${format}`);

    if (format === 'png') {
      optimizedBuffer = await sharp(imageBuffer)
        .png({ quality: 90, compressionLevel: 6 })
        .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .toBuffer();
    } else if (format === 'jpg' || format === 'jpeg') {
      optimizedBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 90 })
        .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255 },
        })
        .toBuffer();
    } else {
      optimizedBuffer = imageBuffer;
    }

    fs.writeFileSync(outputPath, optimizedBuffer);
    return outputPath;
  } catch (error) {
    console.error('Error downloading/optimizing image:', error);
    throw new Error('Failed to process image');
  }
};



const EnhancePrompt = async (req, res) => {
  try {
    const { prompt, industry, style } = req.body;

    const enhanced = await enhancePromptWithGPT(prompt, industry, style);

    res.json({
      original: prompt,
      enhanced,
      industry,
      style,
    });
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    res.status(500).json({ error: 'Failed to enhance prompt' });
  }
};
const GenerateLogs = async (req, res) => {
  try {
    const { prompt, count = 4 } = req.body;
    console.log('prompt, count ', prompt, count);
    const logoPromises = [];
    // Generate multiple logos with slight variations
    for (let i = 0; i < count; i++) {
      const variation = i > 0 ? ` (variation ${i + 1})` : '';
      logoPromises.push(generateLogoWithDALLE(prompt + variation));
    }

    const imageUrls = await Promise.all(logoPromises);
    const generatedLogos = [];

    // for (let i = 0; i < imageUrls.length; i++) {
    //   const logoId = uuidv4();
    //   const logoData = {
    //     id: logoId,
    //     imageUrl: imageUrls[i],
    //     prompt,
    //     createdAt: new Date(),
    //     format: 'png',
    //   };
    //   // Save to MongoDB
    //   const logoDoc = new Logo(logoData);
    //   await logoDoc.save();
    //   generatedLogos.push(logoData);
    //   // Download and optimize image in the background
    //   downloadAndOptimizeImage(imageUrls[i], logoId, 'png').catch(
    //     console.error,
    //   );
    // }

    res.json({ logos: imageUrls });
  } catch (error) {
    console.error('Logo generation error:', error);
    res.status(500).json({ error: 'Failed to generate logos' });
  }
};


 module.exports = {
   EnhancePrompt,
   GenerateLogs,
 };