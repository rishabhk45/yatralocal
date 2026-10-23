/**
 * YatraLocal - Real Emergency Safety SOS Serverless Function (/netlify/functions/sos)
 * 
 * Powered by official Twilio Node.js SDK (SMS + WhatsApp).
 * Features:
 * 1. Payload size guard (max 2 KB).
 * 2. In-memory IP rate limiter (10 requests/minute per client).
 * 3. E.164 phone number validation and phone number masking (+91 98*** **210).
 * 4. Coordinate boundary checks (lat [-90,90], lng [-180,180]).
 * 5. SMS & WhatsApp dispatch via client.messages.create.
 * 6. Detailed error code logging & human diagnostic messages (21608, 63016, 21408, 20003) without leaking secrets.
 * 7. Live 6-hour tracking session store for /track.html?id=TOKEN.
 */

const crypto = require('crypto');
let twilio = null;
try {
  twilio = require('twilio');
} catch (e) {
  console.warn('[SOS Server] Twilio package load notice:', e.message);
}

// In-memory 6-hour live tracking beacon store: token -> { travellerName, coords, timestamp, expiresAt, status }
const trackingStore = new Map();

// IP rate limiter (10 requests / min)
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

// Phone number mask for privacy (+91 98*** **210)
function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '***';
  const clean = phone.trim();
  if (clean.length <= 6) return '***' + clean.slice(-2);
  const start = clean.slice(0, 5);
  const end = clean.slice(-3);
  return `${start}*** **${end}`;
}

// Validate E.164 format
function isValidE164(phone) {
  if (typeof phone !== 'string') return false;
  return /^\+[1-9]\d{7,14}$/.test(phone.trim());
}

// Format IST timestamp
function formatIST(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date) + ' IST';
  } catch (_) {
    return date.toISOString();
  }
}

// Translate Twilio error codes into helpful diagnostic guidance
function translateTwilioErrorCode(code, rawMsg) {
  const c = Number(code);
  switch (c) {
    case 21608:
      return 'Twilio Trial Account: Destination number must be verified in your Twilio Console first.';
    case 63016:
    case 21211:
      return 'WhatsApp Sandbox: Recipient must send "join <sandbox-code>" to +1 415 523 8886 first.';
    case 21408:
      return 'Geo Permissions: International SMS to India (+91) must be enabled in Twilio Console ➔ Messaging ➔ Geographic Permissions.';
    case 20003:
      return 'Twilio Authentication Failed: Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.';
    case 21614:
      return 'Destination phone number cannot receive SMS messages.';
    default:
      return rawMsg || `Twilio error code ${code}`;
  }
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

  // 1. Abuse Protection: Max Payload 2 KB
  if (event.body && Buffer.byteLength(event.body, 'utf8') > 2048) {
    return {
      statusCode: 413,
      headers,
      body: JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: 'Request exceeds 2 KB limit.' })
    };
  }

  // 2. Abuse Protection: IP Rate Limit
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
        message: `Rate limit reached. Try again in ${rateCheck.resetInSeconds}s.`
      })
    };
  }

  // 3. Handle GET /track.html data query
  if (event.httpMethod === 'GET') {
    const query = event.queryStringParameters || {};
    const token = query.token || query.id;
    if (!token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'TOKEN_REQUIRED' }) };
    }
    const session = trackingStore.get(token);
    if (!session || Date.now() > session.expiresAt) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'TOKEN_EXPIRED', message: 'Tracking link has expired (6-hour limit).' })
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        travellerName: session.travellerName,
        coords: session.coords,
        accuracy: session.accuracy,
        lastUpdated: session.lastUpdated,
        status: session.status,
        timestampIST: formatIST(new Date(session.lastUpdated))
      })
    };
  }

  // 4. Handle POST SOS Trigger or Location Update
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'INVALID_JSON' }) };
  }

  // Handle live location coordinate update
  if (body.action === 'update_location' && body.token) {
    const session = trackingStore.get(body.token);
    if (session) {
      if (typeof body.lat === 'number' && typeof body.lng === 'number') {
        session.coords = { lat: body.lat, lng: body.lng };
        session.accuracy = typeof body.accuracy === 'number' ? body.accuracy : 15;
      }
      if (body.status === 'SAFE') {
        session.status = 'SAFE';
      }
      session.lastUpdated = Date.now();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, status: session.status }) };
    }
  }

  // Validate contacts: max 3
  const rawContacts = Array.isArray(body.contacts) ? body.contacts : [];
  if (rawContacts.length === 0 || rawContacts.length > 3) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'INVALID_CONTACTS',
        message: 'Must provide between 1 and 3 emergency contacts.'
      })
    };
  }

  // Validate phone numbers strictly in E.164
  const validatedContacts = [];
  for (const c of rawContacts) {
    const phone = (c.phone || c || '').trim();
    if (!isValidE164(phone)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'INVALID_PHONE_FORMAT',
          message: `Phone number "${phone}" is not in valid E.164 format (e.g. +919876543210).`
        })
      };
    }
    validatedContacts.push({
      name: c.name || 'Emergency Contact',
      phone
    });
  }

  // Validate Latitude & Longitude if provided
  let lat = null;
  let lng = null;
  let hasValidCoords = false;
  if (typeof body.lat === 'number' && typeof body.lng === 'number') {
    if (body.lat < -90 || body.lat > 90 || body.lng < -180 || body.lng > 180) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_COORDINATES', message: 'Coordinates out of bounds.' })
      };
    }
    lat = body.lat;
    lng = body.lng;
    hasValidCoords = true;
  }

  const accuracy = Math.round(Number(body.accuracy) || 20);
  const travellerName = (body.travellerName || 'A YatraLocal Traveller').trim().slice(0, 50);
  const channel = (body.channel || 'sms').toLowerCase(); // 'sms' | 'whatsapp'
  const timeIST = formatIST();

  // Construct Maps Link & Message
  const mapsLink = hasValidCoords
    ? `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`
    : 'Location not available';

  const messageText = `SOS from ${travellerName}. Last known location: ${mapsLink} (accuracy ~${accuracy} m, ${timeIST}). This is a prototype alert; if this is an emergency, call 112.`;

  // Create 6-hour tracking token
  const token = crypto.randomBytes(12).toString('hex');
  trackingStore.set(token, {
    travellerName,
    coords: hasValidCoords ? { lat, lng } : null,
    accuracy,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    expiresAt: Date.now() + (6 * 60 * 60 * 1000), // 6 hours
    status: 'ACTIVE'
  });

  // Twilio Client & Credentials
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM || process.env.TWILIO_FROM;
  const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  const results = [];
  let isTwilioConfigured = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (channel === 'whatsapp' || TWILIO_SMS_FROM));

  if (isTwilioConfigured && twilio) {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    for (const contact of validatedContacts) {
      const masked = maskPhoneNumber(contact.phone);
      try {
        let msgRes;
        if (channel === 'whatsapp') {
          const fromWhatsapp = TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
            ? TWILIO_WHATSAPP_FROM
            : `whatsapp:${TWILIO_WHATSAPP_FROM}`;
          const toWhatsapp = contact.phone.startsWith('whatsapp:')
            ? contact.phone
            : `whatsapp:${contact.phone}`;

          msgRes = await client.messages.create({
            from: fromWhatsapp,
            to: toWhatsapp,
            body: messageText
          });
        } else {
          msgRes = await client.messages.create({
            from: TWILIO_SMS_FROM,
            to: contact.phone,
            body: messageText
          });
        }

        console.info(`[SOS Twilio] Delivered ${channel} to ${masked} (SID: ${msgRes.sid})`);
        results.push({
          to: masked,
          channel,
          status: 'sent',
          sid: msgRes.sid,
          dateCreated: msgRes.dateCreated
        });
      } catch (err) {
        console.error(`[SOS Twilio] Error sending to ${masked} [Code ${err.code}]:`, err.message);
        results.push({
          to: masked,
          channel,
          status: 'failed',
          errorCode: err.code || null,
          errorMessage: translateTwilioErrorCode(err.code, err.message)
        });
      }
    }
  } else {
    // If Twilio not configured in environment, return honest simulated status
    for (const contact of validatedContacts) {
      results.push({
        to: maskPhoneNumber(contact.phone),
        channel,
        status: 'unconfigured',
        errorCode: 'TWILIO_NOT_CONFIGURED',
        errorMessage: 'Twilio credentials not configured on server. Use direct phone fallback.'
      });
    }
  }

  const allSent = results.length > 0 && results.every(r => r.status === 'sent');
  const anySent = results.some(r => r.status === 'sent');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: anySent,
      isRealSend: isTwilioConfigured,
      channel,
      messageText,
      mapsLink,
      trackingToken: token,
      trackingUrl: `/track.html?id=${token}`,
      timeIST,
      accuracy,
      results
    })
  };
};
