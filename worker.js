// KoreaDreamPath Worker — handles /api/*, friendly URL rewrites,
// and falls through to static assets for everything else.

const CONTENT_KEY = 'dp_content_v1';
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

const SITE_INDEX  = '/ui_kits/website/index.html';
const SITE_ADMIN  = '/ui_kits/website/admin.html';

// Friendly URLs that should serve the public SPA shell.
// The SPA reads location.pathname on boot and shows the matching view.
const SPA_PATHS = new Set([
  '/', '/index.html',
  '/about', '/programs', '/apply',
  '/partners', '/stories', '/news', '/contact',
  '/team', '/scholarships', '/member', '/receipt',
  '/401', '/403', '/404', '/500', '/503', '/offline',
]);

// Friendly URLs for the admin shell.
const ADMIN_PATHS = new Set(['/admin', '/admin/', '/admin.html']);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        // Log every uncaught server error to D1 for the admin error console
        ctx.waitUntil(logError(env, {
          level: 'error', source: 'server',
          message: String(err && err.message || err),
          stack: err && err.stack ? String(err.stack).slice(0, 4000) : null,
          path: url.pathname, method: request.method,
          status: 500,
          ip: request.headers.get('cf-connecting-ip') || '',
          user_agent: (request.headers.get('user-agent') || '').slice(0, 500),
        }));
        return json({ error: 'internal', message: String(err && err.message || err) }, 500);
      }
    }

    // SEO endpoints
    if (url.pathname === '/sitemap.xml')  return sitemapXml(env, url);
    if (url.pathname === '/robots.txt')   return robotsTxt(url);

    // Friendly URL → real asset path. Use the same Request (preserves headers,
    // method) but with a rewritten URL.
    if (ADMIN_PATHS.has(url.pathname)) {
      return env.ASSETS.fetch(rewriteRequest(request, SITE_ADMIN));
    }
    if (SPA_PATHS.has(url.pathname) || url.pathname.startsWith('/program/')) {
      return env.ASSETS.fetch(rewriteRequest(request, SITE_INDEX));
    }

    return env.ASSETS.fetch(request);
  }
};

function rewriteRequest(request, newPath) {
  const u = new URL(request.url);
  u.pathname = newPath;
  return new Request(u.toString(), request);
}

// ── SEO: sitemap.xml + robots.txt ─────────────────────────────────────────
async function sitemapXml(env, url) {
  const origin = url.origin;
  const today = new Date().toISOString().slice(0, 10);

  // Static SPA paths (high-priority public pages)
  const STATIC = [
    { path: '/',          priority: 1.0, change: 'weekly' },
    { path: '/about',     priority: 0.8, change: 'monthly' },
    { path: '/programs',  priority: 0.9, change: 'weekly' },
    { path: '/news',      priority: 0.8, change: 'weekly' },
    { path: '/stories',   priority: 0.7, change: 'monthly' },
    { path: '/partners',  priority: 0.6, change: 'monthly' },
    { path: '/contact',   priority: 0.6, change: 'monthly' },
    { path: '/team',      priority: 0.5, change: 'monthly' },
    { path: '/apply',     priority: 0.9, change: 'monthly' },
  ];

  // Dynamic: each program detail page from KV content
  let programPaths = [];
  try {
    const raw = await env.CONTENT_KV.get('dp_content_v1');
    if (raw) {
      const c = JSON.parse(raw);
      if (Array.isArray(c.programs)) {
        programPaths = c.programs
          .filter(p => p && p.id)
          .map(p => ({ path: '/program/' + encodeURIComponent(p.id), priority: 0.7, change: 'monthly' }));
      }
    }
  } catch {}

  // Dynamic: each news post
  let newsPaths = [];
  try {
    const { results } = await env.DB.prepare('SELECT id FROM news_posts ORDER BY date DESC LIMIT 200').all();
    // (no per-post route yet; news lives under /news with anchor — leave for now)
  } catch {}

  const all = [...STATIC, ...programPaths, ...newsPaths];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    all.map(u =>
      '  <url>\n' +
      '    <loc>' + origin + u.path + '</loc>\n' +
      '    <lastmod>' + today + '</lastmod>\n' +
      '    <changefreq>' + u.change + '</changefreq>\n' +
      '    <priority>' + u.priority.toFixed(1) + '</priority>\n' +
      '  </url>'
    ).join('\n') +
    '\n</urlset>\n';

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}

function robotsTxt(url) {
  const origin = url.origin;
  const body =
    'User-agent: *\n' +
    'Allow: /\n' +
    'Disallow: /admin\n' +
    'Disallow: /api/\n' +
    'Disallow: /receipt\n' +
    'Disallow: /member\n' +
    '\n' +
    'Sitemap: ' + origin + '/sitemap.xml\n';
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}

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
    if (method === 'POST') {
      // Anonymous applies (visitor without an account) are still allowed,
      // matching the existing public Apply form. Authenticated applies are
      // gated by the role's pages.apply.apply permission so the operator can
      // shut off applications for a role without taking the public form down.
      const u = await currentUser(request, env);
      if (u) {
        const allowed = await canRole(env, u.role, 'apply', 'apply');
        if (!allowed) return json({ error: 'forbidden', detail: `${u.role} is not allowed to apply` }, 403);
      }
      return submitApplication(request, env);
    }
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

  // ── Auth ─────────────────────────────────────────────────────────────────
  if (path === '/api/auth/signup' && method === 'POST') return signup(request, env);
  if (path === '/api/auth/login'  && method === 'POST') return login(request, env);
  if (path === '/api/auth/logout' && method === 'POST') return logout(request, env);
  if (path === '/api/auth/me'     && method === 'GET')  return me(request, env);

  // ── Member profile ───────────────────────────────────────────────────────
  if (path === '/api/me/profile') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM member_profiles WHERE user_id = ?').bind(user.id).first();
      return json(row || {});
    }
    if (method === 'PUT' || method === 'POST') {
      // Edit-own gate. The operator can revoke profile editing for a role
      // without changing any UI by clearing pages.member.edit_own.
      const allowed = await canRole(env, user.role, 'member', 'edit_own');
      if (!allowed) return json({ error: 'forbidden', detail: `${user.role} is not allowed to edit own profile` }, 403);
      const body = await request.json().catch(() => ({}));
      return saveProfile(env, user.id, body);
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── My applications (logged-in members) ──────────────────────────────────
  if (path === '/api/me/applications' && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    const { results } = await env.DB.prepare(
      'SELECT id, submitted_at, status, amount, currency, track, program, paid_at, receipt_token FROM applications WHERE user_id = ? ORDER BY submitted_at DESC'
    ).bind(user.id).all();
    return json({ items: results || [] });
  }

  // ── Receipt lookup (paid applications) ───────────────────────────────────
  // Auth: either (a) admin token, (b) owner is logged in, or (c) URL has matching ?token=
  const receiptM = path.match(/^\/api\/applications\/([A-Za-z0-9_-]+)\/receipt$/);
  if (receiptM && method === 'GET') {
    const id = receiptM[1];
    const row = await env.DB.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'not_found' }, 404);
    if (row.status !== 'paid') return json({ error: 'not_paid' }, 400);

    const tokenParam = url.searchParams.get('token') || '';
    const isAdminAuth = isAdmin(request, env);
    const u = await currentUser(request, env);
    const isOwner = u && row.user_id && row.user_id === u.id;
    const tokenMatch = row.receipt_token && safeEqual(tokenParam, row.receipt_token);
    if (!isAdminAuth && !isOwner && !tokenMatch) return json({ error: 'unauthorized' }, 401);

    return json({
      id: row.id,
      issuer: { name: 'KoreaDreamPath', email: 'info@koreadreampath.com' },
      paid_at: row.paid_at,
      currency: row.currency || 'USD',
      amount: row.amount,
      track: row.track,
      program: row.program,
      payer: { name: row.name, email: row.email, country: row.country },
      payment: { method: row.payment_method || 'card', card_last4: row.card_last4 || null },
    });
  }

  // ── Recommendations (stub) ───────────────────────────────────────────────
  if (path === '/api/me/recommendations' && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    return json({ items: stubRecommendations(env), generated_at: new Date().toISOString() });
  }

  // ── News (server-side now) ───────────────────────────────────────────────
  if (path === '/api/news') {
    if (method === 'GET') return listNews(env);
    if (method === 'POST') {
      const user = await currentUser(request, env);
      if (!user) return json({ error: 'unauthorized' }, 401);
      return createNews(request, env, user);
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  const newsM = path.match(/^\/api\/news\/([A-Za-z0-9_-]+)$/);
  if (newsM) {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if (method === 'PUT')    return updateNews(request, env, user, newsM[1]);
    if (method === 'DELETE') return deleteNews(env, user, newsM[1]);
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Public read-only APIs (for external integrations) ───────────────────
  // CORS is intentionally permissive on these GETs only. Anything writable
  // remains restricted (admin token / session token).
  if (path === '/api/public/programs' && method === 'GET') {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    let programs = [];
    try { programs = (raw ? JSON.parse(raw).programs : []) || []; } catch {}
    return cors(json({ items: programs }));
  }
  if (path === '/api/public/categories' && method === 'GET') {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    let cats = [];
    try {
      const programs = (raw ? JSON.parse(raw).programs : []) || [];
      const seen = new Set();
      programs.forEach(p => {
        const c = p.category || (p.kicker ? p.kicker.split('·')[0].trim() : '');
        if (c && !seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); cats.push(c); }
      });
    } catch {}
    return cors(json({ items: cats }));
  }
  if (path === '/api/public/news' && method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);
    const { results } = await env.DB.prepare(
      'SELECT id, tag, tag_color, date, title_ko, title_en, body_ko, body_en, created_at FROM news_posts ORDER BY date DESC, created_at DESC LIMIT ?'
    ).bind(limit).all();
    return cors(json({ items: results || [] }));
  }
  if (path === '/api/public/partners' && method === 'GET') {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    let partners = [];
    try { partners = (raw ? JSON.parse(raw).partners : []) || []; } catch {}
    return cors(json({ items: partners }));
  }
  if (path === '/api/public/stories' && method === 'GET') {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    let stories = [];
    try { stories = (raw ? JSON.parse(raw).stories : []) || []; } catch {}
    return cors(json({ items: stories }));
  }
  if (path === '/api/public/programs' && method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
  if (path.startsWith('/api/public/') && method === 'OPTIONS') return cors(new Response(null, { status: 204 }));

  // ── Consents (GDPR audit trail) ──────────────────────────────────────────
  if (path === '/api/consents' && method === 'POST') return recordConsent(request, env);
  if (path === '/api/consents' && method === 'GET') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10) || 30, 365);
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
    const userId = url.searchParams.get('user_id');
    const email  = url.searchParams.get('email');
    let q, binds;
    if (userId) { q = 'SELECT * FROM consents WHERE user_id = ? ORDER BY ts DESC LIMIT 200'; binds = [userId]; }
    else if (email) { q = 'SELECT * FROM consents WHERE email = ? ORDER BY ts DESC LIMIT 200'; binds = [email]; }
    else { q = 'SELECT * FROM consents WHERE ts >= ? ORDER BY ts DESC LIMIT 500'; binds = [since]; }
    const { results } = await env.DB.prepare(q).bind(...binds).all();
    return json({ items: results || [] });
  }

  // ── Admin: member directory ──────────────────────────────────────────────
  // Lists every registered user with last-login (latest session.created_at) and
  // application count. Used by the admin Members → Member directory tab.
  if (path === '/api/admin/users' && method === 'GET') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    const limit  = Math.min(Math.max(parseInt(url.searchParams.get('limit')  || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const role = (url.searchParams.get('role') || '').trim();
    const where = [];
    const binds = [];
    if (q)    { where.push('(LOWER(u.email) LIKE ? OR LOWER(COALESCE(u.name,\'\')) LIKE ?)'); binds.push('%' + q + '%', '%' + q + '%'); }
    if (role) { where.push('u.role = ?'); binds.push(role); }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM users u ' + whereSql).bind(...binds).first();
    const sql =
      'SELECT u.id, u.email, u.name, u.role, u.created_at, u.updated_at,' +
      '       (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS last_login,' +
      '       (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) AS app_count ' +
      'FROM users u ' + whereSql + ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    const { results } = await env.DB.prepare(sql).bind(...binds, limit, offset).all();
    return json({ items: results || [], total: total?.n || 0, limit, offset });
  }
  // Admin: create a new member directly. Bypasses the public signup form so
  // the operator can pre-provision accounts (e.g. for a new admin teammate).
  if (path === '/api/admin/users' && method === 'POST') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const email    = String(body.email || '').trim().toLowerCase();
    const name     = String(body.name || '').trim();
    const role     = ['member','admin'].includes(body.role) ? body.role : 'member';
    const password = String(body.password || '');
    const note     = body.note ? String(body.note).slice(0, 500) : null;
    if (!isEmail(email)) return json({ error: 'invalid_email' }, 400);
    if (password.length < 8) return json({ error: 'password_too_short' }, 400);
    const dupe = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (dupe) return json({ error: 'email_taken' }, 409);
    const id   = 'U-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    const now  = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, password_salt, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, email, hash, salt, name || null, role, now, now).run();
    await env.DB.prepare(
      'INSERT INTO member_audits (user_id, ts, actor, action, field, old_value, new_value, note) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)'
    ).bind(id, now, 'admin', 'create', note).run();
    return json({ user: { id, email, name: name || null, role, created_at: now, updated_at: now } });
  }
  // Single member detail (basic profile + recent consents + audit log)
  const memM = path.match(/^\/api\/admin\/users\/([A-Za-z0-9_-]+)$/);
  if (memM && method === 'GET') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    const id = memM[1];
    const user = await env.DB.prepare(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?'
    ).bind(id).first();
    if (!user) return json({ error: 'not_found' }, 404);
    const lastLogin = await env.DB.prepare(
      'SELECT MAX(created_at) AS last_login FROM sessions WHERE user_id = ?'
    ).bind(id).first();
    const profile = await env.DB.prepare('SELECT * FROM member_profiles WHERE user_id = ?').bind(id).first().catch(() => null);
    const { results: consents } = await env.DB.prepare(
      'SELECT * FROM consents WHERE user_id = ? OR email = ? ORDER BY ts DESC LIMIT 100'
    ).bind(id, user.email).all();
    const { results: audits } = await env.DB.prepare(
      'SELECT * FROM member_audits WHERE user_id = ? ORDER BY ts DESC LIMIT 200'
    ).bind(id).all().catch(() => ({ results: [] }));
    return json({
      user: { ...user, last_login: lastLogin?.last_login || null },
      profile: profile || null,
      consents: consents || [],
      audits: audits || [],
    });
  }
  // PATCH /api/admin/users/:id — update name / role / email; optional password reset.
  // Each changed column writes one member_audits row for the trail.
  if (memM && method === 'PATCH') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    const id = memM[1];
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const cur = await env.DB.prepare('SELECT id, email, name, role FROM users WHERE id = ?').bind(id).first();
    if (!cur) return json({ error: 'not_found' }, 404);
    const now = new Date().toISOString();
    const note = body.note ? String(body.note).slice(0, 500) : null;
    const sets = [];
    const binds = [];
    const audits = [];  // [{ field, old, new }]
    if (typeof body.name === 'string' && body.name !== (cur.name || '')) {
      const v = body.name.trim() || null;
      sets.push('name = ?'); binds.push(v);
      audits.push({ field: 'name', old: cur.name, new: v });
    }
    if (typeof body.role === 'string' && ['member','admin'].includes(body.role) && body.role !== cur.role) {
      sets.push('role = ?'); binds.push(body.role);
      audits.push({ field: 'role', old: cur.role, new: body.role });
    }
    if (typeof body.email === 'string') {
      const e = body.email.trim().toLowerCase();
      if (e && e !== cur.email) {
        if (!isEmail(e)) return json({ error: 'invalid_email' }, 400);
        const dupe = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(e, id).first();
        if (dupe) return json({ error: 'email_taken' }, 409);
        sets.push('email = ?'); binds.push(e);
        audits.push({ field: 'email', old: cur.email, new: e });
      }
    }
    let passwordReset = false;
    if (typeof body.password === 'string' && body.password) {
      if (body.password.length < 8) return json({ error: 'password_too_short' }, 400);
      const salt = randomHex(16);
      const hash = await hashPassword(body.password, salt);
      sets.push('password_hash = ?', 'password_salt = ?'); binds.push(hash, salt);
      passwordReset = true;
    }
    if (!sets.length && !passwordReset) return json({ ok: true, changed: 0 });
    sets.push('updated_at = ?'); binds.push(now);
    binds.push(id);
    await env.DB.prepare('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?').bind(...binds).run();
    for (const a of audits) {
      await env.DB.prepare(
        'INSERT INTO member_audits (user_id, ts, actor, action, field, old_value, new_value, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, now, 'admin', 'update', a.field, a.old || null, a.new || null, note).run();
    }
    if (passwordReset) {
      await env.DB.prepare(
        'INSERT INTO member_audits (user_id, ts, actor, action, field, old_value, new_value, note) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)'
      ).bind(id, now, 'admin', 'password_reset', note).run();
      // Invalidate every session for this user so the new password takes effect immediately.
      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
    }
    return json({ ok: true, changed: audits.length + (passwordReset ? 1 : 0) });
  }
  if (memM && method === 'DELETE') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    const id = memM[1];
    const cur = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(id).first();
    if (!cur) return json({ error: 'not_found' }, 404);
    const now = new Date().toISOString();
    // Audit FIRST while user_id still references a real row, then delete.
    await env.DB.prepare(
      'INSERT INTO member_audits (user_id, ts, actor, action, field, old_value, new_value, note) VALUES (?, ?, ?, ?, NULL, ?, NULL, NULL)'
    ).bind(id, now, 'admin', 'delete', cur.email).run();
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  // ── Errors (client report + admin list) ──────────────────────────────────
  if (path === '/api/errors') {
    if (method === 'POST') return reportClientError(request, env);
    if (method === 'GET') {
      if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1000);
      const level    = url.searchParams.get('level');
      const source   = url.searchParams.get('source');
      const resolved = url.searchParams.get('resolved');  // '0' | '1' | '' (all)
      let sql = 'SELECT * FROM error_logs WHERE 1=1';
      const binds = [];
      if (level)    { sql += ' AND level = ?';    binds.push(level); }
      if (source)   { sql += ' AND source = ?';   binds.push(source); }
      if (resolved === '0') sql += ' AND COALESCE(resolved, 0) = 0';
      if (resolved === '1') sql += ' AND COALESCE(resolved, 0) = 1';
      sql += ' ORDER BY ts DESC LIMIT ?';
      binds.push(limit);
      const { results } = await env.DB.prepare(sql).bind(...binds).all();
      return json({ items: results || [] });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  if (path === '/api/errors/clear' && method === 'POST') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    await env.DB.prepare('DELETE FROM error_logs').run();
    return json({ ok: true });
  }
  // PATCH /api/errors/:id — toggle resolved + optional note. Body shape:
  //   { resolved: true|false, note?: string }
  // Used by the admin Errors → Error logs tab to mark fixes without leaving
  // the dashboard. Resolved rows still appear unless filtered out.
  const errResM = path.match(/^\/api\/errors\/(\d+)$/);
  if (errResM && method === 'PATCH') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    const id = parseInt(errResM[1], 10);
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const resolved = body.resolved ? 1 : 0;
    const now = resolved ? new Date().toISOString() : null;
    const note = body.note ? String(body.note).slice(0, 500) : null;
    await env.DB.prepare(
      'UPDATE error_logs SET resolved = ?, resolved_at = ?, resolved_note = ? WHERE id = ?'
    ).bind(resolved, now, note, id).run();
    return json({ ok: true });
  }

  // ── GDPR self-service (logged-in user) ───────────────────────────────────
  if (path === '/api/me' && method === 'DELETE') return deleteMyAccount(request, env);
  if (path === '/api/me/export' && method === 'GET') return exportMyData(request, env);

  // ── Analytics ────────────────────────────────────────────────────────────
  if (path === '/api/analytics' && method === 'POST') {
    return ingestEvents(request, env);
  }
  if (path === '/api/analytics/summary' && method === 'GET') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    return analyticsSummary(env, url);
  }
  if (path === '/api/analytics/journeys' && method === 'GET') {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    return analyticsJourneys(env, url);
  }

  // ── Program details (long-form body per program) ────────────────────────
  const pdM = path.match(/^\/api\/programs\/([A-Za-z0-9_-]+)\/details$/);
  if (pdM) {
    const id = pdM[1];
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM program_details WHERE program_id = ?').bind(id).first();
      return json(row || { program_id: id });
    }
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    if (method === 'PUT' || method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body) return json({ error: 'invalid_json' }, 400);
      const cols = ['program_id','overview_ko','overview_en','curriculum_ko','curriculum_en',
                    'outcomes_ko','outcomes_en','prerequisites_ko','prerequisites_en',
                    'duration','format','language_required','start_date','cohort_size',
                    'certification','instructor_name','instructor_title',
                    'instructor_bio_ko','instructor_bio_en',
                    'cost_full','cost_currency','updated_at','updated_by'];
      const values = [id,
                      str(body.overview_ko), str(body.overview_en),
                      str(body.curriculum_ko), str(body.curriculum_en),
                      str(body.outcomes_ko), str(body.outcomes_en),
                      str(body.prerequisites_ko), str(body.prerequisites_en),
                      str(body.duration), str(body.format), str(body.language_required),
                      str(body.start_date), body.cohort_size != null ? Number(body.cohort_size) : null,
                      str(body.certification), str(body.instructor_name), str(body.instructor_title),
                      str(body.instructor_bio_ko), str(body.instructor_bio_en),
                      body.cost_full != null ? Number(body.cost_full) : null,
                      str(body.cost_currency || 'USD'),
                      new Date().toISOString(), null];
      const placeholders = cols.map(() => '?').join(',');
      const updateSet = cols.slice(1).map(k => `${k} = excluded.${k}`).join(', ');
      const sql = `INSERT INTO program_details (${cols.join(',')}) VALUES (${placeholders})
                   ON CONFLICT(program_id) DO UPDATE SET ${updateSet}`;
      await env.DB.prepare(sql).bind(...values).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM program_details WHERE program_id = ?').bind(id).run();
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Inquiries ────────────────────────────────────────────────────────────
  if (path === '/api/inquiries') {
    if (method === 'POST') return submitInquiry(request, env);
    if (method === 'GET') {
      if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
      const { results } = await env.DB.prepare(
        'SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 500'
      ).all();
      return json({ items: results || [] });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  const inqM = path.match(/^\/api\/inquiries\/([A-Za-z0-9_-]+)$/);
  if (inqM) {
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    if (method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      if (body.status) {
        await env.DB.prepare('UPDATE inquiries SET status = ? WHERE id = ?').bind(String(body.status), inqM[1]).run();
      }
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM inquiries WHERE id = ?').bind(inqM[1]).run();
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Wiki (admin-only) — slugs: 'kms', 'design' ───────────────────────────
  const wikiM = path.match(/^\/api\/wiki\/([a-z0-9_-]{1,32})$/);
  if (wikiM) {
    const slug = wikiM[1];
    const key = 'wiki:' + slug;
    if (method === 'GET') {
      const raw = await env.CONTENT_KV.get(key);
      return new Response(raw || '{}', { headers: JSON_HEADERS });
    }
    if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);
    if (method === 'PUT' || method === 'POST') {
      const body = await request.text();
      try { JSON.parse(body); } catch { return json({ error: 'invalid_json' }, 400); }
      await env.CONTENT_KV.put(key, body);
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  if (path === '/api/health') return json({ ok: true, ts: Date.now() });

  return json({ error: 'not_found' }, 404);
}

// ── Auth (members) ─────────────────────────────────────────────────────────
const SESSION_TTL_DAYS = 30;

async function signup(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();
  if (!isEmail(email)) return json({ error: 'invalid_email' }, 400);
  if (password.length < 8) return json({ error: 'password_too_short' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'email_taken' }, 409);

  const id = 'U-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  const now = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, password_salt, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, email, hash, salt, name || null, 'member', now, now).run();

  const session = await createSession(env, id);
  return json({ user: { id, email, name, role: 'member' }, token: session.token, expires_at: session.expires_at });
}

async function login(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const u = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!u) return json({ error: 'invalid_credentials' }, 401);
  const hash = await hashPassword(password, u.password_salt);
  if (!safeEqual(hash, u.password_hash)) return json({ error: 'invalid_credentials' }, 401);
  const session = await createSession(env, u.id);
  return json({ user: { id: u.id, email: u.email, name: u.name, role: u.role }, token: session.token, expires_at: session.expires_at });
}

async function logout(request, env) {
  const token = bearerToken(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return json({ ok: true });
}

async function me(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  return json({ user });
}

async function currentUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  const row = await env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.role, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).bind(token).first();
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

function bearerToken(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

async function createSession(env, userId) {
  const token = randomHex(32);
  const now = Date.now();
  const expires = new Date(now + SESSION_TTL_DAYS * 86400 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, new Date(now).toISOString(), expires).run();
  return { token, expires_at: expires };
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key, 256
  );
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

// ── Member profile ─────────────────────────────────────────────────────────
const PROFILE_FIELDS = ['country','birthdate','current_school','current_major','goal','interests','korean_level','english_level','career_summary'];

async function saveProfile(env, userId, body) {
  const now = new Date().toISOString();
  const cols = ['user_id', ...PROFILE_FIELDS, 'updated_at'];
  const values = [userId, ...PROFILE_FIELDS.map(k => str(body[k])), now];
  const placeholders = cols.map(() => '?').join(',');
  const updateSet = [...PROFILE_FIELDS, 'updated_at'].map(k => `${k} = excluded.${k}`).join(', ');
  const sql = `INSERT INTO member_profiles (${cols.join(',')}) VALUES (${placeholders})
               ON CONFLICT(user_id) DO UPDATE SET ${updateSet}`;
  await env.DB.prepare(sql).bind(...values).run();
  const row = await env.DB.prepare('SELECT * FROM member_profiles WHERE user_id = ?').bind(userId).first();
  return json(row);
}

// ── Errors / consents / GDPR helpers ───────────────────────────────────────
function cors(res) {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', '*');
  h.set('access-control-allow-methods', 'GET, OPTIONS');
  h.set('access-control-allow-headers', 'content-type');
  h.set('cache-control', 'public, max-age=60');
  return new Response(res.body, { status: res.status, headers: h });
}

async function logError(env, e) {
  try {
    await env.DB.prepare(
      `INSERT INTO error_logs (ts, level, source, message, stack, path, method, status, user_id, session_id, ip, user_agent, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      new Date().toISOString(),
      str(e.level) || 'error',
      str(e.source) || 'server',
      String(e.message || '').slice(0, 2000),
      e.stack ? String(e.stack).slice(0, 4000) : null,
      str(e.path), str(e.method),
      e.status != null ? Number(e.status) : null,
      str(e.user_id), str(e.session_id),
      str(e.ip), str(e.user_agent),
      e.meta ? JSON.stringify(e.meta).slice(0, 4000) : null,
    ).run();
  } catch {} // never let logging itself crash a request
}

async function reportClientError(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);
  const u = await currentUser(request, env);
  await logError(env, {
    level: body.level || 'error',
    source: body.source || 'client',
    message: body.message || '',
    stack: body.stack || null,
    path: body.path || '',
    method: 'GET',
    status: null,
    user_id: u ? u.id : null,
    session_id: body.session_id || null,
    ip, user_agent: ua,
    meta: body.meta || null,
  });
  return json({ ok: true });
}

async function recordConsent(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.consent_type) return json({ error: 'invalid_body' }, 400);
  const u = await currentUser(request, env);
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);

  const consents = Array.isArray(body.consents) ? body.consents : [body];
  const stmt = env.DB.prepare(
    `INSERT INTO consents (ts, user_id, application_id, email, consent_type, version, granted, ip, user_agent, lang)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const ts = new Date().toISOString();
  const ops = consents.map(c => stmt.bind(
    ts, u ? u.id : null, str(c.application_id),
    str(c.email || (u && u.email)),
    String(c.consent_type), String(c.version || '1.0'),
    c.granted === false ? 0 : 1,
    ip, ua, str(c.lang)
  ));
  if (ops.length) await env.DB.batch(ops);
  return json({ ok: true, recorded: ops.length });
}

async function exportMyData(request, env) {
  const u = await currentUser(request, env);
  if (!u) return json({ error: 'unauthorized' }, 401);
  const [user, profile, apps, inquiries, consentsR] = await Promise.all([
    env.DB.prepare('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?').bind(u.id).first(),
    env.DB.prepare('SELECT * FROM member_profiles WHERE user_id = ?').bind(u.id).first(),
    env.DB.prepare('SELECT * FROM applications WHERE user_id = ?').bind(u.id).all(),
    env.DB.prepare('SELECT * FROM inquiries WHERE user_id = ?').bind(u.id).all(),
    env.DB.prepare('SELECT * FROM consents WHERE user_id = ?').bind(u.id).all(),
  ]);
  const out = {
    exported_at: new Date().toISOString(),
    note: 'Per GDPR Art. 15. Contains all personal data we hold about you.',
    user, profile,
    applications: apps.results || [],
    inquiries:    inquiries.results || [],
    consents:     consentsR.results || [],
  };
  return new Response(JSON.stringify(out, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="koreadreampath-my-data-' + u.id + '.json"',
    },
  });
}

async function deleteMyAccount(request, env) {
  const u = await currentUser(request, env);
  if (!u) return json({ error: 'unauthorized' }, 401);

  // Soft-delete: anonymize PII but keep the row so applications + analytics
  // counters don't break referential integrity. Hard-deletes happen on a
  // scheduled job after the legal retention window.
  const now = new Date().toISOString();
  const anonEmail = 'deleted-' + u.id + '@invalid.local';
  await env.DB.prepare(
    `UPDATE users SET email = ?, name = NULL, password_hash = '', password_salt = '', deleted_at = ?, updated_at = ? WHERE id = ?`
  ).bind(anonEmail, now, now, u.id).run();

  // Drop any active sessions
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id).run();
  // Wipe profile (full delete)
  await env.DB.prepare('DELETE FROM member_profiles WHERE user_id = ?').bind(u.id).run();
  // Detach applications from the user but keep the application record
  await env.DB.prepare('UPDATE applications SET user_id = NULL WHERE user_id = ?').bind(u.id).run();

  return json({ ok: true, deleted_at: now });
}

// ── Analytics ──────────────────────────────────────────────────────────────
// Public ingest: client posts a small batch of events. Worker enriches with
// IP / country / UA / source classification and inserts into D1.
async function ingestEvents(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.events)) return json({ error: 'invalid_body' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || '';
  const country = request.headers.get('cf-ipcountry') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);
  const referer = request.headers.get('referer') || '';

  const user = await currentUser(request, env);
  const user_id = user ? user.id : null;

  const stmt = env.DB.prepare(
    `INSERT INTO analytics_events
      (ts, day, session_id, user_id, type, view, path, target,
       referrer, source, utm_source, utm_medium, utm_campaign,
       lang, country, device, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const ops = [];

  for (const e of body.events.slice(0, 50)) { // hard cap per request
    const ts = e.ts ? new Date(e.ts).toISOString() : now.toISOString();
    const day = ts.slice(0, 10);
    const ev_referrer = e.referrer || referer || '';
    const source = classifySource(e.path || '/', ev_referrer, e.utm_source);
    const device = classifyDevice(ua);

    ops.push(stmt.bind(
      ts, day,
      String(e.session_id || ''), user_id,
      String(e.type || 'event'), str(e.view), String(e.path || '/'), str(e.target),
      ev_referrer, source, str(e.utm_source), str(e.utm_medium), str(e.utm_campaign),
      str(e.lang), country, device, ip, ua
    ));
  }
  if (ops.length === 0) return json({ ok: true, inserted: 0 });

  await env.DB.batch(ops);
  return json({ ok: true, inserted: ops.length });
}

function classifySource(path, referrer, utm) {
  if (utm) return 'campaign';
  if (!referrer) return 'direct';
  try {
    const u = new URL(referrer);
    const host = u.hostname.toLowerCase();
    if (host.endsWith('koreadreampath.com')) return 'internal';
    if (/google\.|naver\.|bing\.|yahoo\.|duckduckgo\.|baidu\./.test(host)) return 'search';
    if (/facebook\.|twitter\.|x\.com|instagram\.|linkedin\.|reddit\.|kakao\.|threads\./.test(host)) return 'social';
    return 'external';
  } catch {
    return 'external';
  }
}
function classifyDevice(ua) {
  const u = (ua || '').toLowerCase();
  if (/iphone|android.*mobile|windows phone/.test(u)) return 'mobile';
  if (/ipad|tablet/.test(u)) return 'tablet';
  return 'desktop';
}

async function analyticsSummary(env, url) {
  // Range: ?days=N (default 30)
  const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10) || 30, 365);
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10);

  // Totals
  const totals = await env.DB.prepare(
    `SELECT
       COUNT(*) FILTER (WHERE type='pageview') AS pageviews,
       COUNT(DISTINCT session_id) AS sessions,
       COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS users
     FROM analytics_events WHERE day >= ?`
  ).bind(since).first();

  // Daily series (pageviews + sessions)
  const { results: daily } = await env.DB.prepare(
    `SELECT day,
       COUNT(*) FILTER (WHERE type='pageview') AS pageviews,
       COUNT(DISTINCT session_id) AS sessions
     FROM analytics_events
     WHERE day >= ?
     GROUP BY day ORDER BY day ASC`
  ).bind(since).all();

  // Top paths
  const { results: top_paths } = await env.DB.prepare(
    `SELECT path, COUNT(*) AS hits, COUNT(DISTINCT session_id) AS sessions
     FROM analytics_events
     WHERE day >= ? AND type='pageview'
     GROUP BY path ORDER BY hits DESC LIMIT 25`
  ).bind(since).all();

  // Sources (direct / search / social / etc.)
  const { results: sources } = await env.DB.prepare(
    `SELECT COALESCE(source,'direct') AS source, COUNT(*) AS hits, COUNT(DISTINCT session_id) AS sessions
     FROM analytics_events
     WHERE day >= ? AND type='pageview'
     GROUP BY source ORDER BY hits DESC`
  ).bind(since).all();

  // Top referrers (excluding internal/empty)
  const { results: referrers } = await env.DB.prepare(
    `SELECT referrer, COUNT(*) AS hits
     FROM analytics_events
     WHERE day >= ? AND type='pageview' AND referrer != '' AND source != 'internal'
     GROUP BY referrer ORDER BY hits DESC LIMIT 20`
  ).bind(since).all();

  // Devices
  const { results: devices } = await env.DB.prepare(
    `SELECT device, COUNT(*) AS hits FROM analytics_events
     WHERE day >= ? AND type='pageview'
     GROUP BY device ORDER BY hits DESC`
  ).bind(since).all();

  // Top click targets
  const { results: clicks } = await env.DB.prepare(
    `SELECT target, COUNT(*) AS hits FROM analytics_events
     WHERE day >= ? AND type='click' AND target != ''
     GROUP BY target ORDER BY hits DESC LIMIT 25`
  ).bind(since).all();

  return json({
    range: { days, since },
    totals,
    daily: daily || [],
    top_paths: top_paths || [],
    sources: sources || [],
    referrers: referrers || [],
    devices: devices || [],
    clicks: clicks || [],
  });
}

async function analyticsJourneys(env, url) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);
  // Recent sessions with their event sequence
  const { results: recent } = await env.DB.prepare(
    `SELECT session_id, MIN(ts) AS started, MAX(ts) AS ended,
            COUNT(*) AS events, COUNT(DISTINCT path) AS pages
     FROM analytics_events
     GROUP BY session_id ORDER BY started DESC LIMIT ?`
  ).bind(limit).all();

  const journeys = [];
  for (const s of (recent || [])) {
    const { results: trail } = await env.DB.prepare(
      `SELECT ts, type, path, target, source, country, device, lang
       FROM analytics_events
       WHERE session_id = ? ORDER BY ts ASC LIMIT 50`
    ).bind(s.session_id).all();
    journeys.push({ ...s, trail: trail || [] });
  }
  return json({ items: journeys });
}

// ── Inquiries (public submission) ──────────────────────────────────────────
async function submitInquiry(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const errs = [];
  if (!nonEmpty(body.name))    errs.push('name');
  if (!isEmail(body.email))    errs.push('email');
  if (!nonEmpty(body.subject)) errs.push('subject');
  if (!nonEmpty(body.body) || String(body.body).length < 10) errs.push('body');
  if (errs.length) return json({ error: 'validation', fields: errs }, 400);

  const user = await currentUser(request, env);
  const id = 'INQ-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
  const created_at = new Date().toISOString();
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);

  await env.DB.prepare(
    `INSERT INTO inquiries (id, created_at, status, name, email, phone, category, subject, body, lang, user_id, ip, user_agent)
     VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, created_at,
         str(body.name), str(body.email), str(body.phone), str(body.category),
         str(body.subject), str(body.body), str(body.lang),
         user ? user.id : null, ip, ua).run();

  return json({ id, created_at });
}

// ── Recommendations stub ───────────────────────────────────────────────────
function stubRecommendations() {
  // TODO: real matching engine. For now, returns a fixed placeholder list.
  return [
    { program_id: 'korean-studies', match: 0.82, reason_ko: '관심사와 한국어 입문 트랙이 일치합니다.', reason_en: 'Matches interests + Korean basics track.' },
    { program_id: 'business-korea', match: 0.64, reason_ko: '학업 배경이 비즈니스 트랙과 잘 맞습니다.', reason_en: 'Academic background fits the business track.' },
    { program_id: 'digital-media',  match: 0.41, reason_ko: '미디어/제작 관심이 있다면 추천.',          reason_en: 'Recommended if you have media/production interests.' },
  ];
}

// ── News (server-side, member-editable) ────────────────────────────────────
async function listNews(env) {
  const { results } = await env.DB.prepare('SELECT * FROM news_posts ORDER BY date DESC, created_at DESC LIMIT 200').all();
  return json({ items: results || [] });
}

async function createNews(request, env, user) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const id = 'N-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO news_posts (id, tag, tag_color, date, title_ko, title_en, body_ko, body_en, author_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, str(body.tag), str(body.tag_color), str(body.date), str(body.title_ko), str(body.title_en),
         str(body.body_ko), str(body.body_en), user.id, now, now).run();
  const row = await env.DB.prepare('SELECT * FROM news_posts WHERE id = ?').bind(id).first();
  return json(row);
}

async function updateNews(request, env, user, id) {
  const existing = await env.DB.prepare('SELECT author_id FROM news_posts WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'not_found' }, 404);
  if (user.role !== 'admin' && existing.author_id !== user.id) return json({ error: 'forbidden' }, 403);
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE news_posts
     SET tag=?, tag_color=?, date=?, title_ko=?, title_en=?, body_ko=?, body_en=?, updated_at=?
     WHERE id=?`
  ).bind(str(body.tag), str(body.tag_color), str(body.date), str(body.title_ko), str(body.title_en),
         str(body.body_ko), str(body.body_en), now, id).run();
  const row = await env.DB.prepare('SELECT * FROM news_posts WHERE id = ?').bind(id).first();
  return json(row);
}

async function deleteNews(env, user, id) {
  const existing = await env.DB.prepare('SELECT author_id FROM news_posts WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'not_found' }, 404);
  if (user.role !== 'admin' && existing.author_id !== user.id) return json({ error: 'forbidden' }, 403);
  await env.DB.prepare('DELETE FROM news_posts WHERE id = ?').bind(id).run();
  return json({ ok: true });
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

// ── Role-based access control ────────────────────────────────────────────
// Reads c.member_roles from the KV content blob and answers
//   canRole(env, roleId, pageId, action) → boolean
// admin Bearer token bypasses all checks (can do anything). Roles that
// aren't defined in c.member_roles fail closed (deny). The matrix is
// authored under admin → Members → Roles & permissions.
//
// Cached at module scope per worker instance so the hot path doesn't
// re-fetch KV on every request — 60s TTL is fine for policy edits.
let _roleCache = { ts: 0, roles: null };
async function loadRoles(env) {
  const fresh = Date.now() - _roleCache.ts < 60_000;
  if (fresh && _roleCache.roles) return _roleCache.roles;
  try {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    const c = raw ? JSON.parse(raw) : {};
    const roles = (c && c.member_roles && Array.isArray(c.member_roles.roles)) ? c.member_roles.roles : [];
    _roleCache = { ts: Date.now(), roles };
    return roles;
  } catch { return []; }
}
async function canRole(env, roleId, pageId, action) {
  if (!roleId) return false;
  const roles = await loadRoles(env);
  const r = roles.find(x => x && x.id === roleId);
  if (!r || !r.pages) return false;
  const page = r.pages[pageId];
  if (!page) return false;
  return page[action] === true;
}
// Convenience: gate an HTTP handler. Returns null on allow, or a 403 Response on deny.
// Admin token always allows.
async function requireRole(request, env, pageId, action) {
  if (isAdmin(request, env)) return null;
  const u = await currentUser(request, env);
  if (!u) return json({ error: 'unauthorized' }, 401);
  const ok = await canRole(env, u.role, pageId, action);
  if (!ok) return json({ error: 'forbidden', detail: `${u.role} is not allowed to '${action}' on '${pageId}'` }, 403);
  return null;
}

// ── Applications ───────────────────────────────────────────────────────────
const APP_FIELDS = [
  // Step 1
  'name','email','birthdate','admission_referrer_code',
  // Step 2
  'country','prior_school','prior_major','prior_gpa','transcript_note',
  // Step 3 — essays + recommender list (JSON)
  'essay_title','essay_body','essay_title_2','essay_body_2',
  'recommenders_json',
  // Legacy single-recommender columns (kept for backward compat)
  'nso','recommender_name','recommender_email','recommender_role','recommender_letter',
  'scout_member_country','scout_training_level','recommendation_letter_filename',
  // Step 4
  'track','partial_tier','program','payment_method','card_last4',
  'lang'
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
  const receipt_token = randomHex(16);
  const paid_at = status === 'paid' ? submitted_at : null;

  const user = await currentUser(request, env); // optional — anonymous OK
  const user_id = user ? user.id : null;

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);

  const cols = ['id','submitted_at','status','amount','ip','user_agent','user_id','receipt_token','paid_at','currency', ...APP_FIELDS];
  const values = [id, submitted_at, status, amount, ip, ua, user_id, receipt_token, paid_at, 'USD', ...APP_FIELDS.map(k => str(body[k]))];

  const placeholders = cols.map(() => '?').join(',');
  const sql = `INSERT INTO applications (${cols.join(',')}) VALUES (${placeholders})`;
  await env.DB.prepare(sql).bind(...values).run();

  return json({ id, submitted_at, status, amount, receipt_token,
                receipt_url: status === 'paid' ? `/receipt?id=${encodeURIComponent(id)}&token=${receipt_token}` : null });
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
  // Step 1
  if (!nonEmpty(b.name)) e.push('name');
  if (!isEmail(b.email)) e.push('email');
  // Step 2
  if (!nonEmpty(b.country)) e.push('country');
  if (!nonEmpty(b.prior_school)) e.push('prior_school');
  // Step 3
  if (!nonEmpty(b.essay_title)) e.push('essay_title');
  if (!nonEmpty(b.essay_body) || String(b.essay_body).length < 50) e.push('essay_body');
  if (!nonEmpty(b.essay_title_2)) e.push('essay_title_2');
  if (!nonEmpty(b.essay_body_2) || String(b.essay_body_2).length < 50) e.push('essay_body_2');
  // Recommenders: minimum 3, each with name + email + intl phone + member country + training level
  let recs = [];
  if (typeof b.recommenders_json === 'string' && b.recommenders_json.trim()) {
    try { recs = JSON.parse(b.recommenders_json); } catch { e.push('recommenders_json'); }
  } else if (Array.isArray(b.recommenders)) {
    recs = b.recommenders;
  }
  if (!Array.isArray(recs) || recs.length < 3) {
    e.push('recommenders_min_3');
  } else {
    recs.forEach((r, i) => {
      if (!r || typeof r !== 'object') { e.push('recommender_' + i); return; }
      if (!nonEmpty(r.name))                        e.push('recommender_' + i + '_name');
      if (!isEmail(r.email))                        e.push('recommender_' + i + '_email');
      if (!nonEmpty(r.phone) || !/^\+/.test(String(r.phone).trim()))
                                                    e.push('recommender_' + i + '_phone');
      if (!nonEmpty(r.member_country))              e.push('recommender_' + i + '_member_country');
      if (!nonEmpty(r.training_level))              e.push('recommender_' + i + '_training_level');
    });
  }
  // Step 4
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
