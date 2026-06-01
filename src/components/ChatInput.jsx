"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, FileText, X } from 'lucide-react';

/**
 * Chat input with @ file mention support and auto-expanding textarea.
 * Focus ring + subtle scale inspired by the original grepit bar — accent glow, visible caret.
 */
export default function ChatInput({ query, setQuery, onSend, loading, onStop, fileTree = [], embedded = false }) {
  const [inputFocused, setInputFocused] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const textareaRef = useRef(null);

  const allFiles = fileTree.filter(f => f.type === 'blob').map(f => f.path);

  const mentionResults = mentionQuery
    ? allFiles.filter(f => f.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [query]);

  const focusInput = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');

    if (atIdx !== -1 && (atIdx === 0 || textBefore[atIdx - 1] === ' ')) {
      const searchText = textBefore.slice(atIdx + 1);
      if (!searchText.includes(' ') && searchText.length < 60) {
        setMentionOpen(true);
        setMentionQuery(searchText);
        setMentionIdx(0);
        return;
      }
    }
    setMentionOpen(false);
    setMentionQuery('');
  };

  const selectMention = useCallback((filePath) => {
    const cursorPos = textareaRef.current?.selectionStart || query.length;
    const textBefore = query.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');
    const newQuery = query.slice(0, atIdx) + query.slice(cursorPos);
    setQuery(newQuery.trim());

    if (!attachedFiles.includes(filePath)) {
      setAttachedFiles(prev => [...prev, filePath]);
    }
    setMentionOpen(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  }, [query, attachedFiles, setQuery]);

  const removeFile = (filePath) => {
    setAttachedFiles(prev => prev.filter(f => f !== filePath));
  };

  const handleSend = () => {
    const q = query.trim();
    if (!q && attachedFiles.length === 0) return;
    onSend(q, attachedFiles);
    setAttachedFiles([]);
  };

  return (
    <div className={`flex-shrink-0 ${embedded ? "" : "px-5 pt-2 pb-6 md:pb-7"}`}>
      <div className={`${embedded ? "w-full" : "mx-auto"} chat-input-track ${inputFocused ? "chat-input-track--focused" : ""}`}>
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachedFiles.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] bg-c-accent-soft border border-c-accent-line text-c-accent">
                <FileText size={9} />
                <span className="truncate max-w-[120px]">{f.split('/').pop()}</span>
                <button type="button" onClick={() => removeFile(f)} className="hover:text-c-text transition-colors"><X size={8} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <div
            role="presentation"
            className={`chat-input-bar ${inputFocused ? "chat-input-bar--focused" : ""}`}
            onMouseDown={(e) => {
              if (e.target.closest('button')) return;
              e.preventDefault();
              focusInput();
            }}
          >
            <Send
              size={14}
              className={`chat-input-icon mr-3 flex-shrink-0 mb-1 ${inputFocused ? "chat-input-icon--focused" : ""}`}
              aria-hidden
            />
            <textarea
              ref={textareaRef}
              value={query || ''}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (mentionOpen && mentionResults.length > 0) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionResults.length - 1)); return; }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
                  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectMention(mentionResults[mentionIdx]); return; }
                  if (e.key === 'Escape') { setMentionOpen(false); return; }
                }
                if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
                  e.preventDefault();
                  if (loading) onStop?.();
                  else handleSend();
                }
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => { setInputFocused(false); setTimeout(() => setMentionOpen(false), 200); }}
              placeholder="Ask about the codebase… (@ to attach files)"
              rows={1}
              className="flex-1 bg-transparent text-[14px] text-c-text placeholder:text-c-text-3 outline-none resize-none leading-[1.6] min-h-[24px] max-h-[140px] overflow-y-auto"
              style={{ caretColor: 'var(--c-accent)' }}
            />
            {loading && (
              <div className="flex items-center ml-3 flex-shrink-0 mb-0.5">
                <button
                  type="button"
                  onClick={onStop}
                  className="btn-press w-7 h-7 rounded-full border border-c-line-2 flex items-center justify-center text-c-text-2 hover:text-c-text hover:border-c-accent-line transition-[color,border-color,transform] duration-150"
                  title="Stop generating"
                >
                  <Square size={8} fill="currentColor" />
                </button>
              </div>
            )}
          </div>

          {mentionOpen && mentionResults.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-c-surface border border-c-line-2 rounded-lg shadow-[var(--shadow-3)] overflow-hidden max-h-[240px] overflow-y-auto z-50">
              {mentionResults.map((file, i) => (
                <button
                  key={file}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectMention(file); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors duration-150 ${i === mentionIdx ? 'bg-c-accent-soft' : 'hover:bg-c-overlay-2'}`}
                >
                  <FileText size={11} className="text-c-text-3 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className={`text-[11px] truncate ${i === mentionIdx ? 'text-c-accent' : 'text-c-text-2'}`}>{file.split('/').pop()}</div>
                    <div className="text-[9px] text-c-text-4 truncate">{file}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
