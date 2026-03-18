import { useCallback, useEffect, useRef } from 'react';
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";

interface BlockNoteEditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onError?: () => void;
}

export default function BlockNoteEditor({ initialMarkdown, onChange, onError }: BlockNoteEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const loadedRef = useRef(false);

  const editor = useCreateBlockNote();

  // Load initial markdown content into editor on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    if (!initialMarkdown) return;

    (async () => {
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
        editor.replaceBlocks(editor.document, blocks);
      } catch (err) {
        console.warn('[BlockNoteEditor] tryParseMarkdownToBlocks failed, inserting as plain text:', err);
        // Fallback: insert raw markdown as a single paragraph instead of failing
        try {
          const fallbackBlocks = await editor.tryParseMarkdownToBlocks(
            initialMarkdown.split('\n').map(line => line || ' ').join('\n\n')
          );
          editor.replaceBlocks(editor.document, fallbackBlocks);
        } catch {
          // Last resort: don't call onError, just leave editor empty
          console.error('[BlockNoteEditor] All parse attempts failed');
        }
      }
    })();
  }, [editor, initialMarkdown]);

  // Convert blocks to markdown on every content change
  const handleChange = useCallback(async () => {
    try {
      const md = await editor.blocksToMarkdownLossy(editor.document);
      onChangeRef.current(md);
    } catch (err) {
      console.error('[BlockNoteEditor] Failed to convert to markdown:', err);
    }
  }, [editor]);

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme="light"
    />
  );
}
