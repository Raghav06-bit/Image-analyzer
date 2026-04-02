require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies (up to 15MB for base64 images)
app.use(express.json({ limit: '15mb' }));

// Security & permissions headers (required for camera access on deployed sites)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self)');
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API key from environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ─── Analyze endpoint ───
app.post('/api/analyze', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server API key not configured' });
  }

  const { base64Data, mimeType, model } = req.body;

  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const selectedModel = model || 'gemini-2.0-flash-lite';

  const prompt = `Analyze this image and provide a detailed description. Respond in this exact JSON format only, with no markdown formatting or code fences:

{
  "identification": "The main subject of the image in 2-5 words",
  "category": "One of: Animal, Vehicle, Food, Nature, Person, Architecture, Art, Technology, Sports, Chart/Diagram, Object, Other",
  "emoji": "A single emoji that best represents the main subject",
  "description": "A detailed 2-3 sentence description of what you see in the image, including colors, composition, and notable details",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Be accurate and specific. If it's a chart, describe the chart type and data. If it's a vehicle, identify the specific type. Be precise.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errData?.error?.message || `Gemini API error: ${response.status}`
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    res.json({ text });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✨ Vizion server running at http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set! Create a .env file or set the environment variable.');
  }
});
