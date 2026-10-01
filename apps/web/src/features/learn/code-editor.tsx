'use client';

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { MAX_CODE_FILE_LENGTH } from '@kcp/checks';
import { tags as t } from '@lezer/highlight';
import { useEffect, useRef } from 'react';

// A block program is only ever shown as the JavaScript it stands for. Git steps are
// never edited as text; plain text (git lessons' other files) has no highlighting.
const LANGUAGES = {
  html,
  css,
  js: javascript,
  py: python,
  blocks: javascript,
  git: javascript,
  text: () => [],
} as const;
export type EditorLanguage = keyof typeof LANGUAGES;

/**
 * Code colours from the design system's code tokens: each at least 4.5:1 (WCAG AA) on
 * the editor's ground and its active line, in light and dark.
 */
const code = (name: string) => `var(--color-code-${name})`;
const highlightStyle = HighlightStyle.define([
  { tag: t.meta, color: code('com') },
  { tag: t.link, textDecoration: 'underline' },
  { tag: t.heading, textDecoration: 'underline', fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: [t.keyword, t.operatorKeyword, t.controlKeyword], color: code('tag'), fontWeight: '600' },
  { tag: [t.atom, t.bool, t.url, t.contentSeparator, t.labelName, t.number], color: code('str') },
  { tag: [t.literal, t.inserted], color: code('str') },
  { tag: [t.string, t.deleted], color: code('str') },
  { tag: [t.regexp, t.escape, t.special(t.string)], color: code('str') },
  { tag: [t.typeName, t.namespace, t.className], color: code('attr') },
  { tag: [t.special(t.variableName), t.macroName], color: code('attr') },
  { tag: [t.propertyName, t.definition(t.propertyName)], color: code('attr') },
  { tag: t.tagName, color: code('tag') },
  { tag: t.attributeName, color: code('attr') },
  { tag: t.comment, color: code('com'), fontStyle: 'italic' },
  { tag: t.invalid, color: 'var(--color-danger)' },
]);

const theme = EditorView.theme({
  '&': {
    fontSize: '14px',
    height: '100%',
    backgroundColor: 'var(--color-code-bg)',
    color: 'var(--color-ink)',
  },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    lineHeight: '1.85',
    // Long code scrolls here, with a scroll bar that has room of its own.
    scrollbarGutter: 'stable',
    scrollbarColor: 'color-mix(in srgb, var(--color-ink) 30%, transparent) transparent',
  },
  '.cm-content': { paddingBlock: '6px', caretColor: 'var(--color-brand)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-brand)', borderLeftWidth: '2px' },
  '.cm-gutters': {
    backgroundColor: 'var(--color-code-bg)',
    color: 'var(--color-code-gutter)',
    border: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '2.5em', paddingInline: '0 0.9em' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--color-brand) 9%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--color-ink)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--color-brand) 28%, transparent) !important',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-line)',
    borderRadius: '12px',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--color-brand-100)',
    color: 'var(--color-brand-800)',
  },
  '&.cm-focused': { outline: 'none' },
});

/**
 * A CodeMirror 6 editor for one file. Code is always left-to-right, even in Arabic
 * and Urdu. Tab indents; Escape then Tab moves focus out (CodeMirror's tab-focus mode).
 */
export function CodeEditor({
  value,
  language,
  label,
  describedBy,
  onChange,
}: {
  value: string;
  language: EditorLanguage;
  label: string;
  describedBy?: string;
  onChange: (value: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const changeHandler = useRef(onChange);
  changeHandler.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          highlightActiveLine(),
          syntaxHighlighting(highlightStyle),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          LANGUAGES[language](),
          EditorView.lineWrapping,
          // The API refuses longer files; stop typing (or pasting) past the limit here.
          EditorState.transactionFilter.of((tr) =>
            tr.docChanged && tr.newDoc.length > MAX_CODE_FILE_LENGTH ? [] : tr,
          ),
          EditorView.contentAttributes.of({
            'aria-label': label,
            ...(describedBy ? { 'aria-describedby': describedBy } : {}),
            autocapitalize: 'off',
            autocorrect: 'off',
            spellcheck: 'false',
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) changeHandler.current(update.state.doc.toString());
          }),
          theme,
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The editor is created once per file; later value changes are applied below.
  }, [language, label, describedBy]);

  // Outside changes (Start again) replace the text; typing doesn't come through here.
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  return (
    <div
      ref={host}
      dir="ltr"
      className="h-full min-h-64 text-start"
      data-testid={`editor-${language}`}
    />
  );
}
