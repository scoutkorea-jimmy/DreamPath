// Floaters.jsx — bottom-right floating widgets for the public site.
//
//   • BackToTop : appears after the user has scrolled past ~400px; smooth-
//                 scrolls to the top of the page. Hides while the chat
//                 panel is open to avoid stacking two visual layers.
//   • ChatBot   : an FAQ-driven assistant. There is no LLM behind it —
//                 it scores the user query against `c.faq[]` items (also
//                 site-wide quick-links like Programs / Apply / Contact)
//                 and replies with the best Q+A match. Free, offline,
//                 dependency-free, and keeps every conversation on-domain.
//                 If nothing matches, it offers Contact / Apply / Programs
//                 fallback links so the user is never stuck.
//
// Both components are mounted from App.jsx after Nav/Footer, and live at
// z-index 9000 (below VersionWatcher's 100000 but above page content).
const { useState: useStateF, useEffect: useEffectF, useRef: useRefF, useMemo: useMemoF } = React;

// ─── BackToTop ────────────────────────────────────────────────────────
function BackToTop({ lang, hidden }) {
  const isKo = (lang || 'ko') === 'ko';
  const [shown, setShown] = useStateF(false);

  useEffectF(() => {
    const onScroll = () => setShown(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!shown || hidden) return null;

  const go = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const label = isKo ? '맨 위로' : 'Back to top';

  return (
    <button
      type="button"
      onClick={go}
      aria-label={label}
      title={label}
      style={{
        position: 'fixed', right: 20, bottom: 96, zIndex: 9000,
        width: 48, height: 48, borderRadius: '50%',
        background: 'var(--bg-elevated)',
        color: 'var(--brand-text)',
        border: '1.5px solid var(--border-strong)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0,
        transition: 'transform 140ms ease, box-shadow 140ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>
      </svg>
    </button>
  );
}
window.BackToTop = BackToTop;

// ─── ChatBot helpers ──────────────────────────────────────────────────

// Lowercase + collapse whitespace + strip leading/trailing punctuation.
function normalize(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Tokenize for English-ish keyword matching. Korean has no spaces inside
// noun phrases, so we keep the full normalized string around for substring
// scoring too — see scoreFaq().
function tokenize(s) {
  return normalize(s).split(/[^a-z0-9가-힣]+/i).filter(t => t.length >= 2);
}

// Score a single FAQ item against the user query.
//   - Each token that appears in the *question* counts 3x.
//   - Each token that appears in the *answer* counts 1x.
//   - For Korean (or any continuous-script query), we also count up to 4
//     contiguous 2-char substrings of the query — covers cases like
//     "비용" appearing in "비용은 얼마인가요?" where tokenization may not
//     split cleanly.
function scoreFaq(item, lang, qNorm, qTokens) {
  const isKo = lang === 'ko';
  const q = isKo ? (item.q_ko || '') : (item.q_en || item.q_ko || '');
  const a = isKo ? (item.a_ko || '') : (item.a_en || item.a_ko || '');
  const qN = normalize(q);
  const aN = normalize(a);
  let score = 0;
  for (const t of qTokens) {
    if (qN.includes(t)) score += 3;
    if (aN.includes(t)) score += 1;
  }
  // Korean 2-gram boost — useful when tokenize() drops sub-word fragments
  if (qNorm.length >= 2) {
    for (let i = 0; i < Math.min(qNorm.length - 1, 12); i++) {
      const bigram = qNorm.slice(i, i + 2);
      if (!/^[a-z0-9 ]+$/.test(bigram)) {
        if (qN.includes(bigram)) score += 2;
        if (aN.includes(bigram)) score += 1;
      }
    }
  }
  return score;
}

// Quick-link suggestions surfaced as chips at the top of the panel.
function suggestionsFor(lang) {
  const isKo = lang === 'ko';
  return [
    { label: isKo ? '비용은 얼마인가요?' : 'How much does it cost?',          q: isKo ? '비용' : 'cost' },
    { label: isKo ? '지원 자격이 어떻게 되나요?' : 'Who can apply?',           q: isKo ? '지원 자격' : 'who can apply' },
    { label: isKo ? '온라인 수업은 어떻게 진행되나요?' : 'How does the online learning work?', q: isKo ? '온라인 수업' : 'online learning' },
    { label: isKo ? '장학금이 있나요?' : 'Are there scholarships?',            q: isKo ? '장학금' : 'scholarship' },
    { label: isKo ? '문의는 어디로 하나요?' : 'How do I contact you?',         q: isKo ? '문의 연락' : 'contact email' },
  ];
}

// ─── ChatBot ──────────────────────────────────────────────────────────
function ChatBot({ lang, c, go }) {
  const isKo = (lang || 'ko') === 'ko';
  const [open, setOpen] = useStateF(false);
  const [input, setInput] = useStateF('');
  const [msgs, setMsgs] = useStateF(() => {
    try {
      const raw = sessionStorage.getItem('dp_chat_log');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const bodyRef = useRefF(null);
  const inputRef = useRefF(null);

  const faq = useMemoF(() => (c && Array.isArray(c.faq)) ? c.faq : [], [c]);
  const suggestions = useMemoF(() => suggestionsFor(lang), [lang]);

  // Persist conversation in sessionStorage so opening/closing the panel
  // or switching pages does not lose context (cleared on tab close).
  useEffectF(() => {
    try { sessionStorage.setItem('dp_chat_log', JSON.stringify(msgs.slice(-40))); } catch {}
  }, [msgs]);

  // Auto-scroll to the latest message whenever the log grows or the
  // panel opens.
  useEffectF(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 50);
  }, [open, msgs.length]);

  // Greet on first open if the log is empty.
  useEffectF(() => {
    if (!open || msgs.length > 0) return;
    const greeting = isKo
      ? '안녕하세요! KoreaDreamPath 도우미입니다. 프로그램·비용·지원 절차 등 무엇이든 물어보세요.'
      : "Hi! I'm the KoreaDreamPath assistant. Ask me about programs, pricing, applications, anything.";
    setMsgs([{ role: 'bot', text: greeting, t: Date.now() }]);
  }, [open]);

  function reply(query) {
    const qNorm = normalize(query);
    const qTokens = tokenize(query);
    if (!qNorm) return;

    // Score every FAQ item, keep top 3 with score > 0.
    const scored = faq
      .map((item, idx) => ({ idx, item, score: scoreFaq(item, lang, qNorm, qTokens) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) {
      // Fallback: no FAQ matched. Offer routes the user can take.
      const text = isKo
        ? '죄송해요, 정확한 답을 찾지 못했어요. 아래에서 빠르게 이동할 수 있어요.'
        : "Sorry, I couldn't find a clear answer. You can jump to one of these:";
      setMsgs(m => [...m, { role: 'bot', text, t: Date.now(), fallback: true }]);
      return;
    }

    const top = scored[0].item;
    const answer = isKo
      ? (top.a_ko || top.a_en || '')
      : (top.a_en || top.a_ko || '');
    const question = isKo
      ? (top.q_ko || top.q_en || '')
      : (top.q_en || top.q_ko || '');
    const sourceCat = isKo
      ? (top.category_ko || top.category_en || '')
      : (top.category_en || top.category_ko || '');

    setMsgs(m => [...m, {
      role: 'bot',
      text: answer,
      question,
      sourceCat,
      t: Date.now(),
      related: scored.slice(1).map(s => ({
        q: isKo ? (s.item.q_ko || s.item.q_en) : (s.item.q_en || s.item.q_ko),
      })).filter(r => r.q),
    }]);
  }

  function send(text) {
    const q = (text == null ? input : text).trim();
    if (!q) return;
    setMsgs(m => [...m, { role: 'user', text: q, t: Date.now() }]);
    setInput('');
    // Tiny delay so the user sees their bubble before the bot answers.
    setTimeout(() => reply(q), 180);
  }

  function clearLog() {
    setMsgs([]);
    try { sessionStorage.removeItem('dp_chat_log'); } catch {}
  }

  // Toggle button (always visible).
  if (!open) {
    return (
      <>
        <BackToTop lang={lang} hidden={false} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={isKo ? '챗봇 열기' : 'Open chat'}
          title={isKo ? '도우미에게 물어보기' : 'Ask the assistant'}
          style={{
            position: 'fixed', right: 20, bottom: 24, zIndex: 9000,
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--scouting-purple)', color: '#fff',
            border: 'none', boxShadow: '0 10px 28px rgba(107,45,190,0.42)',
            cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 140ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </button>
      </>
    );
  }

  // Open panel.
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 520;
  return (
    <>
      <BackToTop lang={lang} hidden={true} />
      <div
        role="dialog"
        aria-label={isKo ? 'KoreaDreamPath 도우미' : 'KoreaDreamPath assistant'}
        style={{
          position: 'fixed', right: isMobile ? 8 : 20, bottom: isMobile ? 8 : 24, zIndex: 9000,
          width: isMobile ? 'calc(100vw - 16px)' : 380,
          height: isMobile ? 'calc(100vh - 100px)' : 560,
          maxHeight: 'calc(100vh - 32px)',
          background: 'var(--bg-elevated)',
          color: 'var(--fg-primary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'var(--font-kr), system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, var(--midnight-purple), var(--scouting-purple))',
          color: '#fff', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:15,lineHeight:1.2}}>
              {isKo ? 'KoreaDreamPath 도우미' : 'KoreaDreamPath Assistant'}
            </div>
            <div style={{fontSize:12,opacity:0.85,marginTop:2}}>
              {isKo ? 'FAQ 기반 · 24시간 응답' : 'FAQ-based · always on'}
            </div>
          </div>
          <button
            type="button"
            onClick={clearLog}
            aria-label={isKo ? '대화 지우기' : 'Clear conversation'}
            title={isKo ? '대화 지우기' : 'Clear conversation'}
            style={{
              background:'rgba(255,255,255,0.14)', border:'none', color:'#fff',
              width:30, height:30, borderRadius:8, cursor:'pointer', padding:0,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={isKo ? '닫기' : 'Close'}
            title={isKo ? '닫기' : 'Close'}
            style={{
              background:'rgba(255,255,255,0.14)', border:'none', color:'#fff',
              width:30, height:30, borderRadius:8, cursor:'pointer', padding:0,
              fontSize:20, lineHeight:1,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div ref={bodyRef} style={{
          flex:1, overflowY:'auto', padding:'14px 14px 8px',
          background:'var(--bg-canvas, var(--bg-elevated))',
          display:'flex', flexDirection:'column', gap:10,
        }}>
          {msgs.map((m, i) => (
            <ChatBubble key={i} m={m} lang={lang} onSuggest={send} go={go} />
          ))}
          {/* Quick suggestions: only show until the user has sent something */}
          {!msgs.some(m => m.role === 'user') && (
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => send(s.q)}
                  className="btn btn-ghost btn-sm"
                  style={{fontSize:12,padding:'6px 10px',borderRadius:999,
                    border:'1px solid var(--border-strong)',
                    background:'var(--bg-elevated)',
                    color:'var(--fg-primary)'}}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          style={{
            display:'flex', gap:8, padding:'10px 12px',
            borderTop:'1px solid var(--border-strong)',
            background:'var(--bg-elevated)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isKo ? '무엇이든 물어보세요…' : 'Ask anything…'}
            aria-label={isKo ? '질문 입력' : 'Type your question'}
            style={{
              flex:1, border:'1px solid var(--border-strong)',
              background:'var(--bg-elevated)', color:'var(--fg-primary)',
              borderRadius:10, padding:'10px 12px', fontSize:14,
              fontFamily:'inherit', outline:'none',
            }}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!input.trim()}
            style={{padding:'8px 14px',fontSize:13,fontWeight:700}}
          >
            {isKo ? '보내기' : 'Send'}
          </button>
        </form>
      </div>
    </>
  );
}

function ChatBubble({ m, lang, onSuggest, go }) {
  const isKo = (lang || 'ko') === 'ko';
  const isUser = m.role === 'user';

  if (isUser) {
    return (
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <div style={{
          maxWidth:'82%',
          background:'var(--scouting-purple)', color:'#fff',
          padding:'10px 13px', borderRadius:'14px 14px 4px 14px',
          fontSize:14, lineHeight:1.5, whiteSpace:'pre-line',
          boxShadow:'0 2px 6px rgba(0,0,0,0.08)',
        }}>{m.text}</div>
      </div>
    );
  }

  // AI-answer guard rail: every reply that quotes a FAQ item carries a
  // small disclaimer (AI may be inaccurate → re-read the site →
  // hello@... within 48h) and a source attribution. We skip it for
  // pure greeting / fallback bubbles since those already direct the
  // user to a human.
  const isAnswered = !!m.question;
  const SUPPORT_EMAIL = 'hello@koreadreampath.com';
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(isKo ? '[KoreaDreamPath] 문의' : '[KoreaDreamPath] Inquiry')}`;

  return (
    <div style={{display:'flex',justifyContent:'flex-start'}}>
      <div style={{
        maxWidth:'88%',
        background:'var(--soft-lavender, #EDE7F6)',
        color:'var(--fg-primary)',
        padding:'10px 13px', borderRadius:'14px 14px 14px 4px',
        fontSize:14, lineHeight:1.55, whiteSpace:'pre-line',
        boxShadow:'0 2px 6px rgba(0,0,0,0.06)',
      }}>
        {m.question && (
          <div style={{fontSize:12,fontWeight:700,color:'var(--brand-text)',marginBottom:6}}>
            Q. {m.question}
          </div>
        )}
        <div>{m.text}</div>

        {/* Source attribution — shown for every FAQ-backed reply. */}
        {isAnswered && m.sourceCat && (
          <div style={{
            marginTop:10,fontSize:11,color:'var(--fg-muted)',
            display:'flex',alignItems:'center',gap:6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <span>{isKo ? '출처' : 'Source'}: FAQ · {m.sourceCat}</span>
          </div>
        )}

        {m.related && m.related.length > 0 && (
          <div style={{marginTop:10,paddingTop:8,borderTop:'1px solid rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:11,color:'var(--fg-muted)',marginBottom:6}}>
              {isKo ? '관련 질문' : 'Related'}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {m.related.map((r, i) => (
                <button key={i} type="button" onClick={() => onSuggest(r.q)}
                  style={{
                    fontSize:12,padding:'5px 9px',borderRadius:999,
                    border:'1px solid var(--border-strong)',
                    background:'var(--bg-elevated)',color:'var(--fg-primary)',
                    cursor:'pointer',
                  }}>{r.q}</button>
              ))}
            </div>
          </div>
        )}

        {/* AI accuracy disclaimer — only on real answers. */}
        {isAnswered && (
          <div style={{
            marginTop:10,paddingTop:8,
            borderTop:'1px dashed rgba(0,0,0,0.18)',
            fontSize:11,lineHeight:1.5,color:'var(--fg-muted)',
          }}>
            {isKo ? (
              <>이 답변은 AI가 자동 생성한 것으로 정확하지 않을 수 있어요. 자세한 내용은 홈페이지를 다시 한 번 확인해 주시고, 그래도 부정확하다고 느껴지시면{' '}
                <a href={mailto} style={{color:'var(--fg-link)',fontWeight:600}}>{SUPPORT_EMAIL}</a>으로 보내주시면 최대 <strong>48시간 이내</strong>에 답변드릴게요.</>
            ) : (
              <>This answer is AI-generated and may be inaccurate. Please double-check the site, and if you still find it unclear, email{' '}
                <a href={mailto} style={{color:'var(--fg-link)',fontWeight:600}}>{SUPPORT_EMAIL}</a> — we reply within <strong>48 hours</strong>.</>
            )}
          </div>
        )}

        {m.fallback && (
          <div style={{marginTop:10}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
              <button type="button" onClick={() => go && go('contact', null, { tab: 'form' })}
                className="btn btn-primary btn-sm" style={{fontSize:12,padding:'6px 12px'}}>
                {isKo ? '문의 양식으로 메시지 보내기' : 'Send a message'}
              </button>
              <a href={mailto} className="btn btn-secondary btn-sm"
                style={{fontSize:12,padding:'6px 10px',textDecoration:'none'}}>
                {isKo ? '메일로 보내기' : 'Email us'}
              </a>
            </div>
            <div style={{fontSize:11,lineHeight:1.5,color:'var(--fg-muted)'}}>
              {isKo
                ? <>접수해 주시면 최대 <strong>48시간 이내</strong>에 <a href={mailto} style={{color:'var(--fg-link)',fontWeight:600}}>{SUPPORT_EMAIL}</a>으로 답변드립니다.</>
                : <>We reply to every message within <strong>48 hours</strong> at <a href={mailto} style={{color:'var(--fg-link)',fontWeight:600}}>{SUPPORT_EMAIL}</a>.</>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.ChatBot = ChatBot;
