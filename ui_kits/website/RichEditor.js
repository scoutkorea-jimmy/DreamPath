// RichEditor.jsx — React wrapper around vanilla TipTap (no @tiptap/react needed).
// Falls back to a textarea while TipTap is loading.

const { useState: useStateE, useEffect: useEffectE, useRef: useRefE } = React;

function useTiptapReady() {
  // v01.097 — TipTap is no longer fetched at page load; ask for it the moment
  // an editor actually mounts. ensure() is idempotent.
  try { window.DreamPathEditor && window.DreamPathEditor.ensure(); } catch (e) {}
  const [ready, setReady] = useStateE(() => !!window.Tiptap);
  useEffectE(() => {
    if (window.Tiptap) return;
    const h = () => setReady(true);
    window.addEventListener('dp-tiptap-ready', h);
    return () => window.removeEventListener('dp-tiptap-ready', h);
  }, []);
  return ready;
}

// v01.101 — resizable body. 메일 본문처럼 길이를 예측할 수 없는 자리에서는
// 고정 높이가 늘 틀린다. 아래 손잡이를 끌어 높이를 바꾸고, 그 높이를
// localStorage 에 기억한다 (storageKey 를 준 경우에만).
const RT_MIN_H = 120;
const RT_MAX_H = 2400;

function RichEditor({ value, onChange, placeholder, lang, minHeight = 160, resizable = false, storageKey }) {
  const ready = useTiptapReady();
  const hostRef = useRefE(null);
  const editorRef = useRefE(null);
  const onChangeRef = useRefE(onChange);
  const [, force] = useStateE(0);
  onChangeRef.current = onChange;

  const lsKey = storageKey ? 'dp_editor_h:' + storageKey : null;
  const [height, setHeight] = useStateE(() => {
    if (!resizable) return null;
    try {
      const v = parseInt(localStorage.getItem(lsKey), 10);
      if (v >= RT_MIN_H && v <= RT_MAX_H) return v;
    } catch (e) {}
    return minHeight;
  });
  const heightRef = useRefE(height);
  heightRef.current = height;
  const dragCleanupRef = useRefE(null);

  function persistHeight() {
    if (!lsKey) return;
    try { localStorage.setItem(lsKey, String(heightRef.current)); } catch (e) {}
  }
  function clampH(h) { return Math.max(RT_MIN_H, Math.min(RT_MAX_H, Math.round(h))); }

  function startResize(e) {
    // pointer 이벤트 하나로 마우스·터치·펜을 함께 받는다.
    e.preventDefault();
    if (dragCleanupRef.current) dragCleanupRef.current();   // 이전 드래그가 남아 있으면 먼저 정리
    const startY = e.clientY;
    const startH = hostRef.current ? hostRef.current.getBoundingClientRect().height : (heightRef.current || minHeight);
    const move = (ev) => setHeight(clampH(startH + (ev.clientY - startY)));
    // 정리를 한 곳에 모은다. pointerup 이 오지 않아도(드래그 도중 언마운트 ·
    // 탭 전환) 반드시 불리도록 아래 useEffect 가 같은 함수를 잡고 있는다.
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      // 원래 값이 있었으면 되돌린다 — 빈 문자열로 덮으면 남의 스타일을 지운다.
      document.body.style.userSelect = prevUserSelect;
      dragCleanupRef.current = null;
    };
    const up = () => { cleanup(); persistHeight(); };
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';   // 끄는 동안 글자가 선택되지 않도록
    dragCleanupRef.current = cleanup;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  // 드래그 도중 컴포넌트가 사라지면 pointerup 이 오지 않는다. 그대로 두면
  // window 리스너가 남고, 무엇보다 body 의 user-select:none 이 화면 전체에
  // 눌러붙어 어디서도 글자를 선택할 수 없게 된다.
  useEffectE(() => () => { if (dragCleanupRef.current) dragCleanupRef.current(); }, []);

  function resetHeight() { setHeight(minHeight); if (lsKey) { try { localStorage.removeItem(lsKey); } catch (e) {} } }

  function handleKey(e) {
    // 마우스 없이도 조절 가능해야 한다 (role="separator").
    const step = e.shiftKey ? 80 : 20;
    if (e.key === 'ArrowDown')      { e.preventDefault(); setHeight(h => clampH((h || minHeight) + step)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setHeight(h => clampH((h || minHeight) - step)); }
    else if (e.key === 'Home')      { e.preventDefault(); resetHeight(); return; }
    else return;
    setTimeout(persistHeight, 0);
  }

  // Mount the editor when TipTap is ready
  useEffectE(() => {
    if (!ready || !hostRef.current) return;
    const T = window.Tiptap;
    const editor = new T.Editor({
      element: hostRef.current,
      extensions: [
        T.StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        T.Underline,
        T.Link.configure({ openOnClick: false, autolink: true }),
        T.Image,
        T.TextAlign.configure({ types: ['heading', 'paragraph'] }),
        T.TextStyle,
        T.Color,
        T.Highlight.configure({ multicolor: true }),
        T.Subscript,
        T.Superscript,
        T.TaskList,
        T.TaskItem.configure({ nested: true }),
        T.Table.configure({ resizable: true }),
        T.TableRow, T.TableCell, T.TableHeader,
        T.Placeholder.configure({ placeholder: placeholder || (lang === 'ko' ? '내용을 입력하세요…' : 'Type something…') }),
        T.CharacterCount,
        T.Typography,
      ],
      content: value || '',
      onUpdate: ({ editor }) => { onChangeRef.current && onChangeRef.current(editor.getHTML()); },
      onSelectionUpdate: () => force(t => t + 1),
      onTransaction: () => force(t => t + 1),
    });
    editorRef.current = editor;
    return () => { editor.destroy(); editorRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Sync external value changes (only when editor exists and value differs)
  useEffectE(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if ((value || '') === ed.getHTML()) return;
    ed.commands.setContent(value || '', false);
  }, [value]);

  // v01.101.04: the toolbar now uses lucide <i data-lucide> instead of emoji.
  // The editor mounts after TipTap finishes loading, which can land after the
  // host's last render — so scan for icons here too rather than trusting the
  // parent to render again. createIcons() is idempotent.
  // NOTE: this hook sits BEFORE the `if (!ready)` early return on purpose —
  // behind it, the hook count would change between the loading and loaded
  // states and React would throw (see v01.101.01).
  useEffectE(() => { window.lucide && window.lucide.createIcons(); }, [ready]);

  if (!ready) {
    return (
      <textarea
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={(placeholder || '') + ' (loading editor…)'}
        rows={6}
        style={{width:'100%',padding:12,border:'1px solid var(--border-default)',borderRadius:10,fontFamily:'inherit',background:'var(--bg-elevated)',color:'var(--fg-primary)',
          resize:'vertical', ...(resizable ? { height: height || minHeight } : {})}}
        lang={lang}
      />
    );
  }

  const ed = editorRef.current;
  const isActive = (name, attrs) => ed ? ed.isActive(name, attrs) : false;
  const cmd = (fn) => () => { if (ed) { fn(ed.chain().focus()).run(); } };

  function setLink() {
    if (!ed) return;
    const prev = ed.getAttributes('link').href || '';
    const url = window.prompt(lang === 'ko' ? '링크 URL' : 'Link URL', prev);
    if (url === null) return;
    if (url === '') { ed.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
  function addImage() {
    const url = window.prompt(lang === 'ko' ? '이미지 URL' : 'Image URL', '');
    if (url) ed.chain().focus().setImage({ src: url }).run();
  }
  function setColor(e) {
    ed.chain().focus().setColor(e.target.value).run();
  }
  function clearColor() {
    ed.chain().focus().unsetColor().run();
  }
  function insertTable() {
    ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  const T = ({ on, label, title, children, disabled }) => (
    <button type="button" className={'rt-btn' + (on ? ' is-active' : '')} title={title} onClick={children} disabled={disabled}>
      {label}
    </button>
  );

  return (
    <div className="rt-wrap" lang={lang}>
      <div className="rt-toolbar" role="toolbar" aria-label="Editor toolbar">
        <button type="button" className={isActive('bold') ? 'is-active' : ''} title="Bold (Ctrl+B)" onClick={cmd(c => c.toggleBold())}><b>B</b></button>
        <button type="button" className={isActive('italic') ? 'is-active' : ''} title="Italic (Ctrl+I)" onClick={cmd(c => c.toggleItalic())}><i>I</i></button>
        <button type="button" className={isActive('underline') ? 'is-active' : ''} title="Underline (Ctrl+U)" onClick={cmd(c => c.toggleUnderline())}><u>U</u></button>
        <button type="button" className={isActive('strike') ? 'is-active' : ''} title="Strike" onClick={cmd(c => c.toggleStrike())}><s>S</s></button>
        <button type="button" className={isActive('code') ? 'is-active' : ''} title="Inline code" onClick={cmd(c => c.toggleCode())}>{'<>'}</button>
        <span className="sep" />
        <select value={isActive('heading', {level:1}) ? 'h1' : isActive('heading', {level:2}) ? 'h2' : isActive('heading', {level:3}) ? 'h3' : 'p'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') ed.chain().focus().setParagraph().run();
            else ed.chain().focus().toggleHeading({ level: parseInt(v.slice(1), 10) }).run();
          }}>
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <span className="sep" />
        <button type="button" className={isActive('bulletList') ? 'is-active' : ''} title="Bullet list" onClick={cmd(c => c.toggleBulletList())}>•</button>
        <button type="button" className={isActive('orderedList') ? 'is-active' : ''} title="Numbered list" onClick={cmd(c => c.toggleOrderedList())}>1.</button>
        <button type="button" className={isActive('taskList') ? 'is-active' : ''} title="Task list" onClick={cmd(c => c.toggleTaskList())}>☑</button>
        <span className="sep" />
        <button type="button" className={isActive('blockquote') ? 'is-active' : ''} title="Quote" onClick={cmd(c => c.toggleBlockquote())}>"</button>
        <button type="button" className={isActive('codeBlock') ? 'is-active' : ''} title="Code block" onClick={cmd(c => c.toggleCodeBlock())}>{'{}'}</button>
        <button type="button" title="Horizontal rule" onClick={cmd(c => c.setHorizontalRule())}>—</button>
        <span className="sep" />
        <button type="button" className={isActive({ textAlign: 'left' }) ? 'is-active' : ''} title="Align left" onClick={cmd(c => c.setTextAlign('left'))}>⇤</button>
        <button type="button" className={isActive({ textAlign: 'center' }) ? 'is-active' : ''} title="Align center" onClick={cmd(c => c.setTextAlign('center'))}>≡</button>
        <button type="button" className={isActive({ textAlign: 'right' }) ? 'is-active' : ''} title="Align right" onClick={cmd(c => c.setTextAlign('right'))}>⇥</button>
        <button type="button" className={isActive({ textAlign: 'justify' }) ? 'is-active' : ''} title="Justify" onClick={cmd(c => c.setTextAlign('justify'))}>☰</button>
        <span className="sep" />
        <button type="button" className={isActive('link') ? 'is-active' : ''} title="Link" onClick={setLink}><i data-lucide="link" width="15" height="15" /></button>
        <button type="button" title="Insert image" onClick={addImage}><i data-lucide="image" width="15" height="15" /></button>
        <button type="button" title="Insert table" onClick={insertTable}>▦</button>
        <span className="sep" />
        <button type="button" className={isActive('subscript') ? 'is-active' : ''} title="Subscript" onClick={cmd(c => c.toggleSubscript())}>X₂</button>
        <button type="button" className={isActive('superscript') ? 'is-active' : ''} title="Superscript" onClick={cmd(c => c.toggleSuperscript())}>X²</button>
        <button type="button" className={isActive('highlight') ? 'is-active' : ''} title="Highlight" onClick={cmd(c => c.toggleHighlight())}><i data-lucide="highlighter" width="15" height="15" /></button>
        <span className="sep" />
        <input type="color" title="Text color" onChange={setColor}
          style={{width:28,height:28,padding:0,border:'1px solid var(--border-hair)',borderRadius:4,background:'transparent',cursor:'pointer'}} />
        <button type="button" title="Clear color" onClick={clearColor}>⊘</button>
        <span className="sep" />
        <button type="button" title="Undo (Ctrl+Z)" onClick={cmd(c => c.undo())}>↶</button>
        <button type="button" title="Redo (Ctrl+Y)" onClick={cmd(c => c.redo())}>↷</button>
        <button type="button" title="Clear formatting" onClick={cmd(c => c.unsetAllMarks().clearNodes())}>✕fmt</button>
      </div>
      <div
        className={'rt-content' + (resizable ? ' is-resizable' : '')}
        ref={hostRef}
        style={resizable ? { height: height || minHeight, minHeight: RT_MIN_H } : { minHeight }}
      />
      {resizable && (
        <div
          className="rt-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label={lang === 'ko' ? '본문 높이 조절 (위/아래 화살표, Home 으로 기본값)' : 'Resize body (arrow keys, Home to reset)'}
          aria-valuenow={height || minHeight}
          aria-valuemin={RT_MIN_H}
          aria-valuemax={RT_MAX_H}
          tabIndex={0}
          title={lang === 'ko' ? '끌어서 높이 조절 · 더블클릭하면 기본 높이' : 'Drag to resize · double-click to reset'}
          onPointerDown={startResize}
          onDoubleClick={resetHeight}
          onKeyDown={handleKey}
        >
          <span className="rt-resize-grip" aria-hidden="true" />
          <span className="rt-resize-label">{(height || minHeight)}px</span>
        </div>
      )}
      {ed && ed.storage.characterCount && (
        <div className="rt-count">
          {ed.storage.characterCount.characters()} {lang === 'ko' ? '자' : 'chars'} · {ed.storage.characterCount.words()} {lang === 'ko' ? '단어' : 'words'}
        </div>
      )}
    </div>
  );
}
window.RichEditor = RichEditor;
