import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 10000);
const LOCAL_CALLBACK_URL = process.env.LOCAL_CALLBACK_URL || 'http://localhost:8795/api/ml/callback';
const COLLI_BRIDGE_KEY = process.env.COLLI_BRIDGE_KEY || '';
const ML_APPLICATION_ID = String(process.env.ML_APPLICATION_ID || '');
const MAX_EVENTS = Math.max(100, Number(process.env.MAX_EVENTS || 500));
const EVENT_TTL_MS = Math.max(3600000, Number(process.env.EVENT_TTL_HOURS || 72) * 3600000);

let sequence = 0;
const events = [];

function headers(res, status, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  });
}
function json(res, status, data) { headers(res, status); res.end(JSON.stringify(data)); }
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || '')); const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}
function authorized(req, url) {
  const key = req.headers['x-colli-key'] || url.searchParams.get('key') || '';
  return Boolean(COLLI_BRIDGE_KEY && safeEqual(key, COLLI_BRIDGE_KEY));
}
function cleanup() {
  const cutoff = Date.now() - EVENT_TTL_MS;
  while (events.length && (events[0].receivedAtMs < cutoff || events.length > MAX_EVENTS)) events.shift();
}
function storePayload(payload, req) {
  if (!payload || typeof payload !== 'object') return;
  if (ML_APPLICATION_ID && String(payload.application_id || '') !== ML_APPLICATION_ID) return;
  sequence += 1;
  events.push({
    id: sequence,
    topic: String(payload.topic || 'mercadolivre'),
    resource: payload.resource || null,
    payload,
    receivedAt: new Date().toISOString(),
    receivedAtMs: Date.now(),
    sourceIp: req.socket.remoteAddress || null
  });
  cleanup();
}
function collectAfterResponse(req) {
  const chunks = []; let size = 0;
  req.on('data', chunk => {
    size += chunk.length;
    if (size <= 1024 * 1024) chunks.push(chunk);
  });
  req.on('end', () => {
    if (!chunks.length || size > 1024 * 1024) return;
    try { storePayload(JSON.parse(Buffer.concat(chunks).toString('utf8')), req); }
    catch (error) { console.error('Notificação inválida:', error.message); }
  });
  req.on('error', error => console.error('Erro ao receber notificação:', error.message));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;

  if (p === '/' || p === '/api/health') {
    return json(res, 200, { ok: true, service: 'colli-bridge', version: '1.0.0', queuedEvents: events.length, time: new Date().toISOString() });
  }

  if (p === '/api/ml/callback' && req.method === 'GET') {
    const target = new URL(LOCAL_CALLBACK_URL);
    for (const key of ['code', 'state', 'error', 'error_description']) {
      const value = url.searchParams.get(key); if (value) target.searchParams.set(key, value);
    }
    if (![...target.searchParams.keys()].length) return json(res, 200, { ok: true, route: 'oauth-callback', localCallback: LOCAL_CALLBACK_URL });
    res.writeHead(302, {
      location: target.toString(),
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer'
    });
    return res.end('Redirecionando para o Colli Marketplace Manager...');
  }

  if (p === '/api/ml/notifications' && req.method === 'GET') {
    return json(res, 200, { ok: true, route: 'mercadolivre-notifications', accepts: 'POST', authenticationRequiredForPost: false });
  }

  if (p === '/api/ml/notifications' && req.method === 'POST') {
    // O Mercado Livre precisa receber HTTP 200 rapidamente. A chave privada não é exigida nesta rota pública.
    json(res, 200, { ok: true });
    collectAfterResponse(req);
    return;
  }

  if (p === '/api/ml/events' && req.method === 'GET') {
    if (!authorized(req, url)) return json(res, 401, { ok: false, error: 'Chave do bridge inválida.' });
    cleanup();
    const after = Math.max(0, Number(url.searchParams.get('after') || 0));
    const selected = events.filter(event => event.id > after).slice(0, 100).map(({ receivedAtMs, sourceIp, ...event }) => event);
    const cursor = selected.length ? selected[selected.length - 1].id : after;
    return json(res, 200, { ok: true, events: selected, cursor, latest: sequence });
  }

  return json(res, 404, { ok: false, error: 'Rota não encontrada.' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Colli Bridge 1.0.0 online na porta ${PORT}`);
  console.log(`Callback local: ${LOCAL_CALLBACK_URL}`);
  console.log(`Fila protegida: ${COLLI_BRIDGE_KEY ? 'sim' : 'NÃO — configure COLLI_BRIDGE_KEY'}`);
});
