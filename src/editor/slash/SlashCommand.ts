import { Extension, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import type { Editor } from '@tiptap/core';
import { filterSlashItems, type SlashItem } from './items';
import { SlashList, type SlashListRef } from './SlashList';

type SlashSuggestion = Omit<SuggestionOptions<SlashItem>, 'editor'>;

const suggestion: SlashSuggestion = {
  char: '/',
  startOfLine: false,

  items: ({ query }) => filterSlashItems(query),

  command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) => {
    props.command({ editor, range });
  },

  render: () => {
    let component: ReactRenderer<SlashListRef> | null = null;
    let popup: TippyInstance[] | null = null;

    return {
      onStart: (props) => {
        component = new ReactRenderer(SlashList, {
          props: { items: props.items, command: (item: SlashItem) => props.command(item) },
          editor: props.editor,
        });
        if (!props.clientRect) return;
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate: (props) => {
        component?.updateProps({
          items: props.items,
          command: (item: SlashItem) => props.command(item),
        });
        if (props.clientRect && popup) {
          popup[0].setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
        }
      },

      onKeyDown: (props) => {
        if (props.event.key === 'Escape') {
          popup?.[0].hide();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit: () => {
        popup?.[0].destroy();
        component?.destroy();
        popup = null;
        component = null;
      },
    };
  },
};

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        ...suggestion,
      }),
    ];
  },
});
