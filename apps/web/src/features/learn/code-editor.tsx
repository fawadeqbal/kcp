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
import { type CodeFileKey, MAX_CODE_FILE_LENGTH } from '@kcp/checks';
import { tags as t } from '@lezer/highlight';
import { useEffect, useRef } from 'react';

const LANGUAGES = { html, css, js: javascript, py: python } as const;

/**
 * Code colours, each readable on the editor's white background and on the active
 * line (at least 4.5:1, WCAG AA). CodeMirror's default style has a few lighter ones.
 */
const highlightStyle = HighlightStyle.define([
  { tag: t.meta, color: '#404740' },
  { tag: t.link, textDecoration: 'underline' },
  { tag: t.heading, textDecoration: 'underline', fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.keyword, color: '#7a1fa2' },
  { tag: [t.atom, t.bool, t.url, t.contentSeparator, t.labelName], color: '#1a4aa8' },
  { tag: [t.literal, t.inserted], color: '#116644' },
  { tag: [t.string, t.deleted], color: '#a11111' },
  { tag: [t.regexp, t.escape, t.special(t.string)], color: '#a63a00' },
  { tag: t.definition(t.variableName), color: '#0000cc' },
  { tag: t.local(t.variableName), color: '#3300aa' },
  { tag: [t.typeName, t.namespace], color: '#00704a' },
  { tag: t.className, color: '#116677' },
  { tag: [t.special(t.variableName), t.macroName], color: '#225566' },
  { tag: t.definition(t.propertyName), color: '#0000cc' },
  { tag: t.tagName, color: '#116644' },
  { tag: t.attributeName, color: '#7a4a00' },
  { tag: t.comment, color: '#6b5a00' },
  { tag: t.invalid, color: '#c00000' },
]);

const theme = EditorView.theme({
  '&': { fontSize: '15px', height: '100%', backgroundColor: 'var(--color-surface)' },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    lineHeight: '1.6',
  },
  '.cm-content': { paddingBlock: '8px' },
  '.cm-gutters': {
    backgroundColor: 'var(--color-canvas)',
    borderInlineEnd: '1px solid var(--color-line)',
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
  language: CodeFileKey;
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
