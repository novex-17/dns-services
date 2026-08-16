export default async function handler(req, res) {
  // CORS Headers for the API
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ 
      error: 'Vercel KV not configured. Please create a KV database in the Vercel Storage tab.' 
    });
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${url}/get/dns_tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      let tasks = [];
      if (data.result) {
        tasks = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      }
      return res.status(200).json({ tasks });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { tasks } = req.body;
      const response = await fetch(`${url}/set/dns_tasks`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(JSON.stringify(tasks))
      });
      
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Vercel KV Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
