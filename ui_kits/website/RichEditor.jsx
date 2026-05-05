// RichEditor.jsx — React wrapper around vanilla TipTap (no @tiptap/react needed).
// Falls back to a textarea while TipTap is loading.

const { useState: useStateE, useEffect: useEffectE, useRef: useRefE } = React;

function useTiptapReady() {
  const [ready, setReady] = useStateE(() => !!window.Tiptap);
  useEffectE(() => {
    if (window.Tiptap) return;
    const h = () => setReady(true);
    window.addEventListener('dp-tiptap-ready', h);
    return () => window.removeEventListener('dp-tiptap-ready', h);
  }, []);
  return ready;
}

function RichEditor({ value, onChange, placeholder, lang, minHeight = 160 }) {
  const ready = useTiptapReady();
  const hostRef = useRefE(null);
  const editorRef = useRefE(null);
  const onChangeRef = useRefE(onChange);
  const [, force] = useStateE(0);
  onChangeRef.current = onChange;

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

  if (!ready) {
    return (
      <textarea
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={(placeholder || '') + ' (loading editor…)'}
        rows={6}
        style={{width:'100%',padding:12,border:'1px solid var(--border-default)',borderRadius:10,fontFamily:'inherit',background:'var(--bg-elevated)',color:'var(--fg-primary)'}}
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
        <button type="button" className={isActive('link') ? 'is-active' : ''} title="Link" onClick={setLink}>🔗</button>
        <button type="button" title="Insert image" onClick={addImage}>🖼</button>
        <button type="button" title="Insert table" onClick={insertTable}>▦</button>
        <span className="sep" />
        <button type="button" className={isActive('subscript') ? 'is-active' : ''} title="Subscript" onClick={cmd(c => c.toggleSubscript())}>X₂</button>
        <button type="button" className={isActive('superscript') ? 'is-active' : ''} title="Superscript" onClick={cmd(c => c.toggleSuperscript())}>X²</button>
        <button type="button" className={isActive('highlight') ? 'is-active' : ''} title="Highlight" onClick={cmd(c => c.toggleHighlight())}>🖍</button>
        <span className="sep" />
        <input type="color" title="Text color" onChange={setColor}
          style={{width:28,height:28,padding:0,border:'1px solid var(--border-hair)',borderRadius:4,background:'transparent',cursor:'pointer'}} />
        <button type="button" title="Clear color" onClick={clearColor}>⊘</button>
        <span className="sep" />
        <button type="button" title="Undo (Ctrl+Z)" onClick={cmd(c => c.undo())}>↶</button>
        <button type="button" title="Redo (Ctrl+Y)" onClick={cmd(c => c.redo())}>↷</button>
        <button type="button" title="Clear formatting" onClick={cmd(c => c.unsetAllMarks().clearNodes())}>✕fmt</button>
      </div>
      <div className="rt-content" ref={hostRef} style={{minHeight}} />
      {ed && ed.storage.characterCount && (
        <div className="rt-count">
          {ed.storage.characterCount.characters()} {lang === 'ko' ? '자' : 'chars'} · {ed.storage.characterCount.words()} {lang === 'ko' ? '단어' : 'words'}
        </div>
      )}
    </div>
  );
}
window.RichEditor = RichEditor;
