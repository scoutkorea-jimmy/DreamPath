// DreamPath Worker — serves /api/* and falls through to static assets.

const CONTENT_KEY = 'dp_content_v1';
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: 'internal', message: String(err && err.message || err) }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // ── Content ──────────────────────────────────────────────────────────────
  if (path === '/api/content') {
    if (method === 'GET') {
      const raw = await env.CONTENT_KV.get(CONTENT_KEY);
      return new Response(raw || '{}', { headers: JSON_HEADERS });
    }
    if (method === 'PUT' || method === 'POST') {
      if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
      const body = await request.text();
      try { JSON.parse(body); } catch { return json({ error: 'invalid_json' }, 400); }
      await env.CONTENT_KV.put(CONTENT_KEY, body);
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
      await env.CONTENT_KV.delete(CONTENT_KEY);
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Applications ─────────────────────────────────────────────────────────
  if (path === '/api/applications') {
    if (method === 'POST') return submitApplication(request, env);
    if (method === 'GET') {
      if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
      return listApplications(env, url);
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  const m = path.match(/^\/api\/applications\/([A-Za-z0-9_-]+)$/);
  if (m) {
    const id = m[1];
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM applications WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
      if (!row) return json({ error: 'not_found' }, 404);
      return json(row);
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  if (path === '/api/health') return json({ ok: true, ts: Date.now() });

  return json({ error: 'not_found' }, 404);
}

// ── Auth ───────────────────────────────────────────────────────────────────
function isAdmin(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const provided = auth.slice(7);
  return safeEqual(provided, token);
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ── Applications ───────────────────────────────────────────────────────────
const APP_FIELDS = [
  'name','email','country','birthdate',
  'prior_school','prior_major','prior_gpa','transcript_note',
  'essay_title','essay_body',
  'nso','recommender_name','recommender_role','recommender_email','recommender_letter',
  'track','partial_tier','program','payment_method','card_last4','lang'
];

async function submitApplication(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'invalid_json' }, 400); }

  const errors = validateApplication(body);
  if (errors.length) return json({ error: 'validation', fields: errors }, 400);

  const id = 'DP-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
  const submitted_at = new Date().toISOString();
  const status = body.track === 'general' ? 'submitted' : 'paid';
  const amount = computeAmount(body.track, body.partial_tier);

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);

  const cols = ['id','submitted_at','status','amount','ip','user_agent', ...APP_FIELDS];
  const values = [id, submitted_at, status, amount, ip, ua, ...APP_FIELDS.map(k => str(body[k]))];

  const placeholders = cols.map(() => '?').join(',');
  const sql = `INSERT INTO applications (${cols.join(',')}) VALUES (${placeholders})`;
  await env.DB.prepare(sql).bind(...values).run();

  return json({ id, submitted_at, status, amount });
}

async function listApplications(env, url) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 500);
  const track = url.searchParams.get('track');
  let sql = 'SELECT * FROM applications';
  const binds = [];
  if (track && track !== 'all') { sql += ' WHERE track = ?'; binds.push(track); }
  sql += ' ORDER BY submitted_at DESC LIMIT ?';
  binds.push(limit);
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ items: results || [], count: (results || []).length });
}

function validateApplication(b) {
  const e = [];
  if (!b || typeof b !== 'object') { e.push('body'); return e; }
  if (!nonEmpty(b.name)) e.push('name');
  if (!isEmail(b.email)) e.push('email');
  if (!nonEmpty(b.essay_title)) e.push('essay_title');
  if (!nonEmpty(b.essay_body) || String(b.essay_body).length < 50) e.push('essay_body');
  if (!nonEmpty(b.nso)) e.push('nso');
  if (!nonEmpty(b.recommender_name)) e.push('recommender_name');
  if (!isEmail(b.recommender_email)) e.push('recommender_email');
  if (!nonEmpty(b.track) || !['full','partial','general'].includes(b.track)) e.push('track');
  if (b.track && b.track !== 'general') {
    if (!b.card_last4 || String(b.card_last4).length !== 4) e.push('card_last4');
  }
  return e;
}

function computeAmount(track, tier) {
  if (track === 'full') return 10;
  if (track === 'partial') return tier === '70' ? 7 : tier === '50' ? 5 : 3;
  return 0;
}

// ── helpers ────────────────────────────────────────────────────────────────
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}
function str(v) { return v == null ? null : String(v); }
function nonEmpty(v) { return typeof v === 'string' && v.trim().length > 0; }
function isEmail(v) { return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function randomSuffix(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, b => (b % 36).toString(36)).join('').toUpperCase();
}
