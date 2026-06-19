// Minimal Markdown → Tiptap JSON importer. Covers the block + inline subset
// that DAOR's editor produces on export, so a round-trip stays faithful.

interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

// --- Inline parsing: bold, italic, code, links ---------------------------
function parseInline(text: string): PMNode[] {
  const nodes: PMNode[] = [];
  let i = 0;
  let plain = '';

  const flush = () => {
    if (plain) {
      nodes.push({ type: 'text', text: plain });
      plain = '';
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);

    // Links [label](href)
    const link = /^\[([^\]]+)\]\(([^)]+)\)/.exec(rest);
    if (link) {
      flush();
      nodes.push({
        type: 'text',
        text: link[1],
        marks: [{ type: 'link', attrs: { href: link[2] } }],
      });
      i += link[0].length;
      continue;
    }

    const apply = (re: RegExp, mark: string): boolean => {
      const m = re.exec(rest);
      if (!m) return false;
      flush();
      nodes.push({ type: 'text', text: m[1], marks: [{ type: mark }] });
      i += m[0].length;
      return true;
    };

    if (rest.startsWith('**') && apply(/^\*\*([^*]+)\*\*/, 'bold')) continue;
    if (rest.startsWith('__') && apply(/^__([^_]+)__/, 'bold')) continue;
    if (rest.startsWith('`') && apply(/^`([^`]+)`/, 'code')) continue;
    if (rest[0] === '*' && apply(/^\*([^*]+)\*/, 'italic')) continue;
    if (rest[0] === '_' && apply(/^_([^_]+)_/, 'italic')) continue;

    plain += text[i];
    i += 1;
  }
  flush();
  return nodes.length ? nodes : [];
}

function paragraph(text: string): PMNode {
  const content = parseInline(text);
  return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
}

export function markdownToTiptap(markdown: string): { title: string; doc: PMNode } {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: PMNode[] = [];
  let title = '';
  let i = 0;

  const flushList = (items: PMNode[], type: string, attrs?: Record<string, unknown>) => {
    if (items.length) blocks.push({ type, content: items, ...(attrs ? { attrs } : {}) });
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      i += 1;
      continue;
    }

    // Code fence
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence
      blocks.push({
        type: 'codeBlock',
        attrs: lang ? { language: lang } : {},
        content: buf.length ? [{ type: 'text', text: buf.join('\n') }] : [],
      });
      continue;
    }

    // Headings
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      if (level === 1 && !title) {
        title = heading[2].trim();
      } else {
        blocks.push({ type: 'heading', attrs: { level }, content: parseInline(heading[2]) });
      }
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'horizontalRule' });
      i += 1;
      continue;
    }

    // Blockquote (consecutive > lines)
    if (trimmed.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'blockquote', content: [paragraph(buf.join(' '))] });
      continue;
    }

    // Task list
    if (/^[-*]\s+\[[ xX]\]\s+/.test(trimmed)) {
      const items: PMNode[] = [];
      while (i < lines.length && /^[-*]\s+\[[ xX]\]\s+/.test(lines[i].trim())) {
        const m = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(lines[i].trim())!;
        items.push({
          type: 'taskItem',
          attrs: { checked: m[1].toLowerCase() === 'x' },
          content: [paragraph(m[2])],
        });
        i += 1;
      }
      flushList(items, 'taskList');
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: PMNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim()) && !/^[-*]\s+\[[ xX]\]/.test(lines[i].trim())) {
        items.push({ type: 'listItem', content: [paragraph(lines[i].trim().replace(/^[-*]\s+/, ''))] });
        i += 1;
      }
      flushList(items, 'bulletList');
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: PMNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push({ type: 'listItem', content: [paragraph(lines[i].trim().replace(/^\d+\.\s+/, ''))] });
        i += 1;
      }
      flushList(items, 'orderedList');
      continue;
    }

    // Paragraph (single line)
    blocks.push(paragraph(trimmed));
    i += 1;
  }

  return { title, doc: { type: 'doc', content: blocks.length ? blocks : [{ type: 'paragraph' }] } };
}
