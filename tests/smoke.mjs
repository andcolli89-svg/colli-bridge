import { spawn } from 'node:child_process';
const port = 18991;
const key = 'teste-chave-segura';
const child = spawn(process.execPath, ['server.mjs'], { cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: String(port), COLLI_BRIDGE_KEY: key, LOCAL_CALLBACK_URL: 'http://localhost:8795/api/ml/callback' }, stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  for (let i=0;i<40;i++) { try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) break; } catch {} await sleep(100); }
  const status = await fetch(`http://127.0.0.1:${port}/api/ml/notifications`).then(r=>r.json());
  if (!status.ok) throw new Error('GET de diagnóstico falhou');
  const webhook = await fetch(`http://127.0.0.1:${port}/api/ml/notifications`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({topic:'questions',resource:'/questions/1',application_id:123}) });
  if (!webhook.ok) throw new Error('Webhook não respondeu 200');
  await sleep(100);
  const denied = await fetch(`http://127.0.0.1:${port}/api/ml/events`);
  if (denied.status !== 401) throw new Error('Fila sem proteção');
  const feed = await fetch(`http://127.0.0.1:${port}/api/ml/events`, {headers:{'x-colli-key':key}}).then(r=>r.json());
  if (!feed.events?.length || feed.events[0].payload.topic !== 'questions') throw new Error('Evento não entrou na fila');
  const cb = await fetch(`http://127.0.0.1:${port}/api/ml/callback?code=abc&state=xyz`, {redirect:'manual'});
  if (cb.status !== 302 || !cb.headers.get('location')?.includes('code=abc')) throw new Error('Callback OAuth falhou');
  console.log('OK: health, callback, webhook público e fila privada validados.');
} finally { child.kill('SIGTERM'); }
