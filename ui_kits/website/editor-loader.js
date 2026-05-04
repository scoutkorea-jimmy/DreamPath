// editor-loader.js — load TipTap (free) and expose globals for our React components.
// Uses esm.sh CDN with React@18 bound to the same instance the app uses.
//
// We load via dynamic import inside an inline <script type="module">; once
// loaded, window.Tiptap is populated and a 'dp-tiptap-ready' event fires.

(function () {
  const VERSION = '2.10.4';

  // We can't import inside a regular script. Inject a module script.
  const code = `
    import { Editor }       from 'https://esm.sh/@tiptap/core@${VERSION}';
    import StarterKit       from 'https://esm.sh/@tiptap/starter-kit@${VERSION}';
    import Underline        from 'https://esm.sh/@tiptap/extension-underline@${VERSION}';
    import Link             from 'https://esm.sh/@tiptap/extension-link@${VERSION}';
    import Image            from 'https://esm.sh/@tiptap/extension-image@${VERSION}';
    import TextAlign        from 'https://esm.sh/@tiptap/extension-text-align@${VERSION}';
    import TextStyle        from 'https://esm.sh/@tiptap/extension-text-style@${VERSION}';
    import Color            from 'https://esm.sh/@tiptap/extension-color@${VERSION}';
    import Highlight        from 'https://esm.sh/@tiptap/extension-highlight@${VERSION}';
    import Subscript        from 'https://esm.sh/@tiptap/extension-subscript@${VERSION}';
    import Superscript      from 'https://esm.sh/@tiptap/extension-superscript@${VERSION}';
    import TaskList         from 'https://esm.sh/@tiptap/extension-task-list@${VERSION}';
    import TaskItem         from 'https://esm.sh/@tiptap/extension-task-item@${VERSION}';
    import Table            from 'https://esm.sh/@tiptap/extension-table@${VERSION}';
    import TableRow         from 'https://esm.sh/@tiptap/extension-table-row@${VERSION}';
    import TableCell        from 'https://esm.sh/@tiptap/extension-table-cell@${VERSION}';
    import TableHeader      from 'https://esm.sh/@tiptap/extension-table-header@${VERSION}';
    import Placeholder      from 'https://esm.sh/@tiptap/extension-placeholder@${VERSION}';
    import CharacterCount   from 'https://esm.sh/@tiptap/extension-character-count@${VERSION}';
    import Typography       from 'https://esm.sh/@tiptap/extension-typography@${VERSION}';
    import HorizontalRule   from 'https://esm.sh/@tiptap/extension-horizontal-rule@${VERSION}';

    window.Tiptap = {
      Editor, StarterKit, Underline, Link, Image, TextAlign, TextStyle, Color,
      Highlight, Subscript, Superscript, TaskList, TaskItem,
      Table, TableRow, TableCell, TableHeader,
      Placeholder, CharacterCount, Typography, HorizontalRule,
    };
    window.dispatchEvent(new CustomEvent('dp-tiptap-ready'));
  `;
  const s = document.createElement('script');
  s.type = 'module';
  s.textContent = code;
  document.head.appendChild(s);
})();
