import fetch from 'node-fetch';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { messages, temperature = 0.7, max_tokens = 300 } = req.body;
    
    // Вариант 1: Используем OpenAI API (если ключ настроен)
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          temperature,
          max_tokens,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI API error:', error);
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      return res.status(200).json(data);
    }
    
    // Вариант 2: Используем бесплатный API (например, OpenRouter или Hugging Face)
    const HF_API_KEY = process.env.HF_API_KEY;
    if (HF_API_KEY) {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:',
            parameters: {
              max_length: max_tokens,
              temperature: temperature,
              return_full_text: false,
            },
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Hugging Face API error:', error);
        throw new Error(`Hugging Face API error: ${response.status}`);
      }
      
      const data = await response.json();
      return res.status(200).json({
        choices: [{
          message: {
            content: data[0]?.generated_text || 'Нет ответа от модели.'
          }
        }]
      });
    }
    
    // Вариант 3: Локальный fallback ответ
    const lastMessage = messages[messages.length - 1]?.content || '';
    const fallbackResponses = [
      `В мире снов вы видите: "${lastMessage.substring(0, 50)}...". Вы чувствуете магию вокруг. Что вы хотите сделать?`,
      `"${lastMessage.substring(0, 40)}..." - интересный выбор. Вы можете: 1. Исследовать дальше 2. Осмотреться 3. Искать подсказки`,
      `В ответ на ваше действие "${lastMessage.substring(0, 30)}..." мир снов отвечает загадкой. Продолжайте ваше путешествие!`
    ];
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    return res.status(200).json({
      choices: [{
        message: {
          content: randomResponse
        }
      }]
    });
    
  } catch (error) {
    console.error('LLM Proxy error:', error);
    
    // Всегда возвращаем валидный ответ даже при ошибке
    return res.status(200).json({
      choices: [{
        message: {
          content: `Я временно недоступен (ошибка: ${error.message}). Но игра продолжается! Вы можете: 1. Исследовать мир 2. Проверить инвентарь 3. Отдохнуть`
        }
      }]
    });
  }
}
