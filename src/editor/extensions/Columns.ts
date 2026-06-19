import { Node, mergeAttributes } from '@tiptap/core';

// A single column; holds arbitrary block content.
export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'daor-column' }), 0];
  },
});

// A horizontal layout container holding two or more columns.
export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,}',

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', class: 'daor-columns' }), 0];
  },
});
