// Vercel Serverless API Proxy Function
// Dynamically proxies all /api/* requests to process.env.VITE_BACKEND_URL or process.env.BACKEND_URL

export default async function handler(req, res) {
  const backendTarget = (
    process.env.VITE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    'http://ec2-3-231-204-13.compute-1.amazonaws.com:8080'
  ).replace(/\/+$/, '');

  const reqUrl = req.url || '';
  const targetUrl = `${backendTarget}${reqUrl.startsWith('/') ? reqUrl : '/' + reqUrl}`;

  try {
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'host' && lowerKey !== 'connection' && lowerKey !== 'content-length') {
        headers[key] = value;
      }
    }

    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        fetchOptions.body = req.body;
      } else if (req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }
    }

    const backendResponse = await fetch(targetUrl, fetchOptions);

    res.status(backendResponse.status);

    backendResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'content-encoding' && lowerKey !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    const responseData = await backendResponse.arrayBuffer();
    res.send(Buffer.from(responseData));
  } catch (error) {
    console.error('Vercel API Proxy Error:', error);
    res.status(502).json({
      error: 'Failed to connect to backend server',
      backend_url: backendTarget,
      details: error.message || String(error),
    });
  }
}
