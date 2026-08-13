import http from 'http';
import https from 'https';

export default function handler(req, res) {
  const backendTarget = (
    process.env.VITE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    'http://ec2-100-61-173-22.compute-1.amazonaws.com:8080'
  ).replace(/\/+$/, '');

  let targetParsed;
  try {
    targetParsed = new URL(backendTarget);
  } catch (e) {
    targetParsed = new URL(`http://${backendTarget}`);
  }

  const reqUrl = req.url || '';
  const pathAndQuery = reqUrl.startsWith('/') ? reqUrl : '/' + reqUrl;

  const transport = targetParsed.protocol === 'https:' ? https : http;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  const options = {
    hostname: targetParsed.hostname,
    port: targetParsed.port || (targetParsed.protocol === 'https:' ? 443 : 80),
    path: pathAndQuery,
    method: req.method,
    headers: headers,
  };

  const proxyReq = transport.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Vercel API Proxy Error:', err);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Failed to connect to backend server',
        backend_url: backendTarget,
        details: err.message,
      });
    }
  });

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}
