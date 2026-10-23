/**
 * YatraLocal - Vercel-compatible Serverless Function (/api/plan.js)
 * 
 * Adapts the Netlify function handler to the Vercel (req, res) standard.
 */

const { handler: netlifyHandler } = require('../netlify/functions/plan.js');

module.exports = async function handler(req, res) {
  // Normalize event for the underlying handler
  const event = {
    httpMethod: req.method,
    headers: req.headers || {},
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}),
    queryStringParameters: req.query || {}
  };

  const context = {};

  try {
    const result = await netlifyHandler(event, context);
    
    // Set headers
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, val]) => {
        res.setHeader(key, val);
      });
    }

    res.status(result.statusCode || 200);

    // Send payload
    try {
      const parsedBody = JSON.parse(result.body);
      res.json(parsedBody);
    } catch {
      res.send(result.body);
    }
  } catch (err) {
    res.status(500).json({
      error: 'SERVERLESS_INVOCATION_FAILED',
      message: err.message,
      isSimulated: true
    });
  }
};
