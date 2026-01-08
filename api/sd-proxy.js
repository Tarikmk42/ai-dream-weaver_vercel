import fetch from 'node-fetch';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { prompt } = req.body || {};
    
    // Log request (без паролей/токенов)
    console.log('SD Proxy:', prompt?.substring(0, 100));
    
    // Проверяем наличие переменных окружения для реального API
    const SD_API_URL = process.env.SD_API_URL;
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    
    // Если есть настройки для реального API
    if (SD_API_URL) {
      // Реальный запрос к Stable Diffusion
      const response = await fetch(`${SD_API_URL}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt}, fantasy art, dream world, detailed`,
          negative_prompt: "blurry, ugly, text, watermark",
          steps: 20,
          width: 512,
          height: 384,
          cfg_scale: 7
        })
      });
      
      if (!response.ok) throw new Error(`SD API error: ${response.status}`);
      
      const data = await response.json();
      return res.status(200).json(data);
    }
    // Или используем Replicate
    else if (REPLICATE_API_TOKEN) {
      const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
          input: {
            prompt: prompt,
            width: 512,
            height: 384
          }
        })
      });
      
      const replicateData = await replicateResponse.json();
      return res.status(200).json({
        images: [replicateData.id], // В реальном случае нужно дождаться генерации
        info: "Using Replicate API"
      });
    }
    // Fallback: mock изображение
    else {
      const svg = `
        <svg width="512" height="384" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#4a6fff;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#8a2fff;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)"/>
          <text x="256" y="192" font-family="Arial" font-size="20" fill="white" text-anchor="middle">
            ${prompt?.substring(0, 50) || 'AI Dream Weaver'}
          </text>
          <text x="256" y="350" font-family="Arial" font-size="14" fill="white" text-anchor="middle" opacity="0.7">
            Production Server | Configure SD_API_URL or REPLICATE_API_TOKEN
          </text>
        </svg>
      `;
      
      return res.status(200).json({
        images: [Buffer.from(svg).toString('base64')],
        parameters: { prompt },
        info: "Mock response - configure API in Vercel environment variables"
      });
    }
    
  } catch (error) {
    console.error('SD Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
