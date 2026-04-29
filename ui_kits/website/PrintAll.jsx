// PrintAll.jsx — render every page sequentially for PDF export
function PrintApp() {
  const lang = localStorage.getItem('dp_lang') || 'ko';
  const c = window.DreamPathContent.load();
  const go = () => {};
  const sections = [
    { key: 'home',     title: 'Home',          el: <window.Home go={go} lang={lang} c={c} /> },
    { key: 'about',    title: 'About',         el: <window.About lang={lang} c={c} /> },
    { key: 'programs', title: 'Programs',      el: <window.Programs go={go} lang={lang} c={c} /> },
    { key: 'apply',    title: 'How to Apply',  el: <window.Apply lang={lang} c={c} /> },
    { key: 'partners', title: 'Partners',      el: <window.Partners lang={lang} c={c} /> },
    { key: 'stories',  title: 'Success Stories', el: <window.Stories lang={lang} c={c} /> },
    { key: 'news',     title: 'News',          el: <window.News lang={lang} c={c} /> },
    { key: 'contact',  title: 'Contact',       el: <window.Contact lang={lang} c={c} /> },
  ];
  return (
    <div className="print-doc">
      <window.Nav view="home" go={go} lang={lang} setLang={()=>{}} c={c} />
      {sections.map((s, i) => (
        <section key={s.key} className="print-page" data-section={s.key}>
          <div className="print-section-label">{s.title} · {String(i+1).padStart(2,'0')}</div>
          {s.el}
        </section>
      ))}
      <window.Footer go={go} lang={lang} c={c} />
    </div>
  );
}

document.documentElement.lang = localStorage.getItem('dp_lang') || 'ko';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<PrintApp />);

// Auto-print after fonts + babel parsed
(async () => {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch {}
  setTimeout(() => {
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => window.print(), 800);
  }, 600);
})();
