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
    const { messages, model = 'local-model' } = req.body || {};
    const lastMessage = messages?.[messages.length - 1]?.content || '';
    
    console.log('LLM Proxy:', lastMessage.substring(0, 100));
    
    // Проверяем наличие API ключей
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const LLM_API_URL = process.env.LLM_API_URL;
    
    // Используем OpenAI если есть ключ
    if (OPENAI_API_KEY) {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!openaiResponse.ok) throw new Error(`OpenAI error: ${openaiResponse.status}`);
      
      const data = await openaiResponse.json();
      return res.status(200).json(data);
    }
    // Или используем локальный LM Studio
    else if (LLM_API_URL) {
      const lmResponse = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!lmResponse.ok) throw new Error(`LM Studio error: ${lmResponse.status}`);
      
      const data = await lmResponse.json();
      return res.status(200).json(data);
    }
    // Fallback: генерация ответа
    else {
      const response = generateStoryResponse(lastMessage);
      
      return res.status(200).json({
        choices: [{
          message: {
            content: response,
            role: 'assistant'
          }
        }],
        usage: {
          prompt_tokens: lastMessage.length,
          completion_tokens: response.length,
          total_tokens: lastMessage.length + response.length
        },
        note: "Mock response - configure OPENAI_API_KEY or LLM_API_URL in Vercel"
      });
    }
    
  } catch (error) {
    console.error('LLM Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

function generateStoryResponse(prompt) {
  const storyParts = [
    "Вы находитесь в загадочном мире снов. ",
    "Вокруг вас плывут образы из забытых воспоминаний. ",
    "Воздух наполнен магической энергией. ",
    "Перед вами открывается вид на фантастический пейзаж. ",
    "Вы чувствуете древнюю силу этого места. "
  ];
  
  const questions = [
    "Что вы хотите сделать?",
    "Как вы поступите?",
    "Каковы ваши дальнейшие действия?",
    "Что будете исследовать первым делом?"
  ];
  
  const options = [
    "1. Исследовать таинственный лес",
    "2. Подняться на древнюю башню",
    "3. Искать подсказки на земле",
    "4. Прислушаться к голосам ветра",
    "5. Проверить свой инвентарь",
    "6. Искать магические артефакты",
    "7. Найти источник воды",
    "8. Разжечь костер для отдыха"
  ];
  
  const story = storyParts[Math.floor(Math.random() * storyParts.length)];
  const question = questions[Math.floor(Math.random() * questions.length)];
  
  // Выбираем 3 уникальные опции
  const shuffled = [...options].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 4);
  
  return `${story}Вы сказали: "${prompt.substring(0, 80)}". ${question}\n\n${selected.join('\n')}`;
}
