// Lightweight Tiptap-JSON → Markdown serializer.
// Covers the block + mark set produced by the DAOR editor.

interface PMMark {
  type: string;
  attrs?: Record<string, unknown>;
}
interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: PMMark[];
}

function inline(node: PMNode): string {
  if (node.type === 'text') {
    let text = node.text ?? '';
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case 'bold':
          text = `**${text}**`;
          break;
        case 'italic':
          text = `*${text}*`;
          break;
        case 'code':
          text = `\`${text}\``;
          break;
        case 'strike':
          text = `~~${text}~~`;
          break;
        case 'link':
          text = `[${text}](${(mark.attrs?.href as string) ?? ''})`;
          break;
        default:
          break;
      }
    }
    return text;
  }
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(inline).join('');
}

function block(node: PMNode, depth = 0): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map((n) => block(n, depth)).join('\n\n');
    case 'paragraph':
      return inline(node);
    case 'heading':
      return `${'#'.repeat((node.attrs?.level as number) || 1)} ${inline(node)}`;
    case 'bulletList':
      return (node.content ?? [])
        .map((li) => `${'  '.repeat(depth)}- ${block(li, depth + 1).trim()}`)
        .join('\n');
    case 'orderedList':
      return (node.content ?? [])
        .map((li, i) => `${'  '.repeat(depth)}${i + 1}. ${block(li, depth + 1).trim()}`)
        .join('\n');
    case 'taskList':
      return (node.content ?? [])
        .map((li) => {
          const checked = li.attrs?.checked ? 'x' : ' ';
          return `${'  '.repeat(depth)}- [${checked}] ${block(li, depth + 1).trim()}`;
        })
        .join('\n');
    case 'listItem':
    case 'taskItem':
      return (node.content ?? []).map((n) => block(n, depth)).join('\n');
    case 'blockquote':
      return (node.content ?? [])
        .map((n) => block(n, depth))
        .join('\n')
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n');
    case 'callout':
      return (node.content ?? [])
        .map((n) => block(n, depth))
        .join('\n')
        .split('\n')
        .map((l) => `> ${(node.attrs?.emoji as string) || '💡'} ${l}`)
        .join('\n');
    case 'codeBlock':
      return `\`\`\`${(node.attrs?.language as string) || ''}\n${inline(node)}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    case 'image':
      return `![${(node.attrs?.alt as string) || ''}](daor-file:${node.attrs?.fileId ?? ''})`;
    case 'fileBlock':
      return `[${(node.attrs?.name as string) || 'fichier'}](daor-file:${node.attrs?.fileId ?? ''})`;
    case 'columns':
      return (node.content ?? []).map((c) => block(c, depth)).join('\n\n');
    case 'column':
      return (node.content ?? []).map((n) => block(n, depth)).join('\n\n');
    case 'table':
      return tableToMarkdown(node);
    default:
      return (node.content ?? []).map((n) => block(n, depth)).join('\n\n');
  }
}

function tableToMarkdown(table: PMNode): string {
  const rows = table.content ?? [];
  const lines: string[] = [];
  rows.forEach((row, ri) => {
    const cells = (row.content ?? []).map((cell) => inline(cell).replace(/\n/g, ' ').trim());
    lines.push(`| ${cells.join(' | ')} |`);
    if (ri === 0) lines.push(`| ${cells.map(() => '---').join(' | ')} |`);
  });
  return lines.join('\n');
}

export function tiptapToMarkdown(content: unknown): string {
  if (!content) return '';
  return block(content as PMNode).trim();
}
