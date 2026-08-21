/* EntryGate.jsx — site-entry notice gate.
 *
 * A blocking, full-screen modal shown on EVERY page load (no persistence —
 * the operator explicitly wanted it on every visit, 2026-06-23). The visitor
 * must tick the acknowledgement checkbox before the Enter button enables;
 * clicking Enter dismisses the gate for that load and reveals the site.
 *
 * Intentionally NOT closable by Escape or backdrop click — it is a mandatory
 * disclaimer, not a dismissible announcement (that's BannerAdModal's job).
 *
 * Content lives in c.entry_gate (content-store DEFAULT_CONTENT) so the
 * operator can edit the copy or flip enabled:false after launch without a
 * redeploy. Bilingual per CLAUDE.md §8.
 */
function EntryGate({ lang, c }) {
  const { useState, useEffect } = React;
  const g = (c && c.entry_gate) || {};
  const featureOn = g.enabled !== false;

  const [acked, setAcked] = useState(false);
  const [open, setOpen]   = useState(true);

  // Lock background scroll while the gate is up.
  useEffect(() => {
    if (!featureOn || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [featureOn, open]);

  // Paint the lucide icon once mounted.
  useEffect(() => {
    if (featureOn && open) setTimeout(() => window.lucide && window.lucide.createIcons(), 0);
  }, [featureOn, open]);

  if (!featureOn || !open) return null;

  const pick = (ko, en, fbKo, fbEn) =>
    (lang === 'ko' ? (ko || fbKo) : (en || fbEn));
  const title  = pick(g.title_ko,  g.title_en,  '안내', 'Notice');
  const body   = pick(g.body_ko,   g.body_en,
    // 폴백은 날짜를 담지 않는다 — 지난 날짜가 박힌 문구가 코드에 남아
    // 있으면 게이트를 다시 켜는 순간 철 지난 안내가 뜬다 (2026-08-22).
    '본 홈페이지는 정보 최신화 작업 중입니다. 현재 제공되는 정보는 최종 확정 정보가 아니며 일부 변경될 수 있으니 참고 부탁드립니다.',
    'This website is being updated. The information currently provided is not final and may change. Please keep this in mind.');
  const check  = pick(g.check_ko,  g.check_en,  '위 안내 내용을 확인했습니다.', 'I have read and understood the notice above.');
  const button = pick(g.button_ko, g.button_en, '확인하고 입장하기', 'Acknowledge & enter');

  function enter() { if (acked) setOpen(false); }

  return (
    <div className="gate-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate-modal">
        <div className="gate-icon" aria-hidden="true"><i data-lucide="megaphone"></i></div>
        <h2 id="gate-title" className="gate-title">{title}</h2>
        <p className="gate-body">{body}</p>
        <label className="gate-check">
          <input
            type="checkbox"
            checked={acked}
            onChange={e => setAcked(e.target.checked)}
            aria-describedby="gate-title"
          />
          <span>{check}</span>
        </label>
        <button
          type="button"
          className="btn btn-primary btn-lg btn-block"
          disabled={!acked}
          onClick={enter}
        >
          {button}
        </button>
      </div>
    </div>
  );
}
window.EntryGate = EntryGate;
