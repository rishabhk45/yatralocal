/**
 * YatraLocal - Emergency Safety SOS Serverless Handler (/netlify/functions/sos)
 * 
 * Capabilities:
 * 1. Creates tracking sessions with short-lived tokens (expire in 6 hours).
 * 2. Dispatches real SMS alerts to emergency contacts via Twilio REST API (zero npm dependencies).
 * 3. Handles live geolocation updates from active travellers.
 * 4. Resolves read-only tracking data for family members without exposing private phone numbers.
 * 5. Provides explicit "TEST ALERT" delivery mode.
 * 6. Rate limits requests to prevent spam or billing abuse.
 * 7. Graceful zero-backend fallback response when Twilio is unconfigured.
 */

const crypto = require('crypto');

// In-memory token store: token -> { travellerName, coords, medicalNotes, status, createdAt, expiresAt, lastUpdated }
// In serverless environments, tokens persist across warm invocations; expires in 6 hours
const trackingStore = new Map();

// Rate limiter: IP -> { count, resetTime }
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, resetInSeconds: Math.ceil((entry.resetTime - now) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

// Purge expired tokens (>6 hours)
function purgeExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of trackingStore.entries()) {
    if (now > data.expiresAt) {
      trackingStore.delete(token);
    }
  }
}

// Sanitize user inputs
function sanitize(str, max = 200) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, max);
}

// Send real SMS via Twilio REST API
async function sendTwilioSms({ accountSid, authToken, from, to, body }) {
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('From', from);
  params.append('To', to);
  params.append('Body', body);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Twilio dispatch failed for ${to}:`, response.status, errorText);
    throw new Error(`Twilio error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Periodic cleanup of expired tokens
  purgeExpiredTokens();

  // Rate Limiting
  const clientIp = event.headers['client-ip'] || 
                   event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   '127.0.0.1';

  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many SOS requests. Please wait ${rateCheck.resetInSeconds} seconds.`
      })
    };
  }

  const query = event.queryStringParameters || {};
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (_) {}
  }

  const action = query.action || body.action || (event.httpMethod === 'GET' ? 'get' : 'create');

  // ACTION 1: GET Tracking Data (/netlify/functions/sos?action=get&token=XYZ)
  if (action === 'get') {
    const token = query.token || body.token;
    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'TOKEN_REQUIRED', message: 'Token query parameter is required.' })
      };
    }

    const session = trackingStore.get(token);
    if (!session) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'NOT_FOUND',
          status: 'EXPIRED',
          message: 'Tracking link has expired or is invalid.'
        })
      };
    }

    // Never return phone numbers or private contact details
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        token,
        status: session.status, // 'ACTIVE' or 'SAFE'
        travellerName: session.travellerName,
        coords: session.coords,
        medicalNotes: session.medicalNotes,
        createdAt: session.createdAt,
        lastUpdated: session.lastUpdated,
        expiresAt: session.expiresAt
      })
    };
  }

  // ACTION 2: UPDATE Location (/netlify/functions/sos with action: 'update')
  if (action === 'update') {
    const { token, coords } = body;
    if (!token || !coords) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_PAYLOAD', message: 'Token and coords are required.' })
      };
    }

    const session = trackingStore.get(token);
    if (!session) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'NOT_FOUND', message: 'Tracking session expired or invalid.' })
      };
    }

    if (session.status === 'SAFE') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, status: 'SAFE', message: 'Traveller is marked safe.' })
      };
    }

    session.coords = {
      lat: Number(coords.lat || coords.latitude),
      lng: Number(coords.lng || coords.longitude),
      accuracy: Number(coords.accuracy) || 20,
      address: sanitize(coords.address || '', 120)
    };
    session.lastUpdated = new Date().toISOString();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        status: 'ACTIVE',
        lastUpdated: session.lastUpdated
      })
    };
  }

  // ACTION 3: MARK SAFE (/netlify/functions/sos with action: 'safe')
  if (action === 'safe') {
    const { token } = body;
    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'TOKEN_REQUIRED' })
      };
    }

    const session = trackingStore.get(token);
    if (session) {
      session.status = 'SAFE';
      session.lastUpdated = new Date().toISOString();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, status: 'SAFE', message: 'Traveller marked safe.' })
    };
  }

  // ACTION 4: CREATE SOS Alert or TEST (/netlify/functions/sos with action: 'create' or 'test')
  if (action === 'create' || action === 'test') {
    const isTest = action === 'test' || Boolean(body.isTest);
    const travellerName = sanitize(body.travellerName || 'YatraLocal Traveller', 60);
    const medicalNotes = sanitize(body.medicalNotes || '', 150);
    const coords = body.coords || { lat: 32.2396, lng: 77.1887, address: 'Burwa, Manali, HP' };
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];

    // Generate random 24-character token
    const token = crypto.randomBytes(12).toString('hex');
    const now = Date.now();
    const expiresAt = now + 6 * 3600 * 1000; // 6-hour expiration

    const hostHeader = event.headers['host'] || 'localhost:4173';
    const protocol = hostHeader.includes('localhost') ? 'http' : 'https';
    const trackingUrl = `${protocol}://${hostHeader}/track.html?id=${token}`;
    const mapsUrl = `https://maps.google.com/?q=${coords.lat},${coords.lng}`;
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Store in-memory session (no phone numbers stored in session)
    trackingStore.set(token, {
      token,
      travellerName,
      medicalNotes,
      coords: {
        lat: Number(coords.lat),
        lng: Number(coords.lng),
        accuracy: Number(coords.accuracy) || 25,
        address: sanitize(coords.address || 'Burwa Village, Manali, HP', 100)
      },
      status: 'ACTIVE',
      isTest,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      expiresAt
    });

    // Check Twilio configuration
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM;

    const hasTwilio = Boolean(twilioSid && twilioAuth && twilioFrom);

    const alertPrefix = isTest ? '[TEST ALERT — NOT AN EMERGENCY]' : '🚨 EMERGENCY SOS ALERT';
    const alertMessage = `${alertPrefix}\nTraveller: ${travellerName}\nLive Map Track: ${trackingUrl}\nGoogle Maps: ${mapsUrl}\nTime: ${timestampStr}\nMedical: ${medicalNotes || 'None'}\nCall 112 if in danger.`;

    const dispatchResults = [];

    if (hasTwilio && contacts.length > 0) {
      for (const c of contacts) {
        if (!c.phone) continue;
        try {
          const res = await sendTwilioSms({
            accountSid: twilioSid,
            authToken: twilioAuth,
            from: twilioFrom,
            to: c.phone,
            body: alertMessage
          });
          dispatchResults.push({ phone: c.phone, success: true, sid: res.sid });
        } catch (err) {
          dispatchResults.push({ phone: c.phone, success: false, error: err.message });
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        token,
        trackingUrl,
        isTest,
        smsDispatched: hasTwilio && dispatchResults.some(r => r.success),
        twilioConfigured: hasTwilio,
        dispatchResults,
        expiresAt: new Date(expiresAt).toISOString(),
        alertText: alertMessage,
        message: hasTwilio
          ? (isTest ? 'Test alert dispatched via Twilio SMS.' : 'Emergency SOS alert dispatched to emergency contacts.')
          : 'Twilio unconfigured on server. Zero-backend fallback active: open prefilled SMS or WhatsApp links.'
      })
    };
  }

  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'UNKNOWN_ACTION', message: `Action "${action}" is not recognized.` })
  };
};

// Export store for testing
exports._trackingStore = trackingStore;
