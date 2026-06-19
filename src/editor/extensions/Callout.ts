import { Node, mergeAttributes } from '@tiptap/core';

// A Notion-style callout: an emoji badge followed by editable block content.
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      emoji: {
        default: '💡',
        parseHTML: (el) => el.getAttribute('data-emoji') || '💡',
        renderHTML: (attrs) => ({ 'data-emoji': attrs.emoji }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'callout', class: 'daor-callout' }),
      ['span', { class: 'daor-callout-emoji', contenteditable: 'false' }, node.attrs.emoji as string],
      ['div', { class: 'daor-callout-content' }, 0],
    ];
  },
});
