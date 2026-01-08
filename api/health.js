export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const health = {
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      sd_proxy: process.env.REPLICATE_API_TOKEN ? 'configured' : 'fallback',
      llm_proxy: process.env.OPENAI_API_KEY || process.env.HF_API_KEY ? 'configured' : 'fallback'
    },
    node_version: process.version
  };
  
  return res.status(200).json(health);
}
