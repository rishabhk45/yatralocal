/**
 * YatraLocal - Vercel-compatible SOS Serverless Function (/api/sos.js)
 */

const { handler: netlifyHandler } = require('../netlify/functions/sos.js');

module.exports = async function handler(req, res) {
  const event = {
    httpMethod: req.method,
    headers: req.headers || {},
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
    queryStringParameters: req.query || {}
  };

  const context = {};

  try {
    const result = await netlifyHandler(event, context);
    if (result.headers) {
      Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
    }
    res.status(result.statusCode || 200);
    try {
      res.json(JSON.parse(result.body));
    } catch {
      res.send(result.body);
    }
  } catch (err) {
    res.status(500).json({ error: 'SERVERLESS_ERROR', message: err.message });
  }
};
