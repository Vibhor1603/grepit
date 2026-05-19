"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, FileText, X } from 'lucide-react';

/**
 * Chat input with @ file mention support and auto-expanding textarea.
 * When user types @, shows a dropdown of matching files.
 * Selected files are attached as context chips above the input.
 */
export default function ChatInput({ query, setQuery, onSend, loading, onStop, fileTree = [] }) {
  const [inputFocused, setInputFocused] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const textareaRef = useRef(null);

  // All blob files for mention search
  const allFiles = fileTree.filter(f => f.type === 'blob').map(f => f.path);

  // Filtered mention results
  const mentionResults = mentionQuery
    ? allFiles.filter(f => f.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
    : [];

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 140); // Max ~5 lines
    el.style.height = `${newHeight}px`;
  }, [query]);

  // Detect @ trigger
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

  // Select a file from mention dropdown
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

  // Remove attached file
  const removeFile = (filePath) => {
    setAttachedFiles(prev => prev.filter(f => f !== filePath));
  };

  // Send with attached files as context
  const handleSend = () => {
    const q = query.trim();
    if (!q && attachedFiles.length === 0) return;
    onSend(q, attachedFiles);
    setAttachedFiles([]);
  };

  return (
    <div className="flex-shrink-0 px-5 pb-4 pt-2">
      <div className={`mx-auto transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${inputFocused ? 'max-w-[720px] scale-[1.01]' : 'max-w-[680px] scale-100'}`}>
        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachedFiles.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] bg-vb-accent/[0.08] border border-vb-accent/20 text-vb-accent">
                <FileText size={9} />
                <span className="truncate max-w-[120px]">{f.split('/').pop()}</span>
                <button onClick={() => removeFile(f)} className="hover:text-vb-ink transition-colors"><X size={8} /></button>
              </span>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="relative">
          <div className={`flex items-end border rounded-xl px-4 py-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            inputFocused
              ? 'border-vb-accent/30 bg-vb-bg3 shadow-[0_0_0_3px_rgba(224,252,16,0.04),0_4px_20px_rgba(0,0,0,0.3)]'
              : 'border-white/[0.14] bg-vb-bg2 shadow-[0_0_12px_rgba(224,252,16,0.02)] hover:border-white/[0.2] hover:shadow-[0_0_16px_rgba(224,252,16,0.04)]'
          }`}>
            <Send size={14} className={`mr-3 flex-shrink-0 mb-1 transition-all duration-300 ${inputFocused ? 'text-vb-accent scale-110' : 'text-vb-ink4 scale-100'}`} />
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
              placeholder="Ask about the codebase... (@ to attach files)"
              rows={1}
              className="flex-1 bg-transparent text-[13px] text-vb-ink placeholder:text-vb-ink4 outline-none caret-vb-accent resize-none leading-[1.6] min-h-[22px] max-h-[140px] overflow-y-auto"
            />
            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0 mb-0.5">
              {loading && (
                <button onClick={onStop} className="w-6 h-6 rounded-full border border-white/[0.12] flex items-center justify-center text-vb-ink3 hover:text-vb-ink2 hover:border-white/[0.2] transition-colors" title="Stop generating">
                  <Square size={8} fill="currentColor" />
                </button>
              )}
            </div>
          </div>

          {/* Mention dropdown */}
          {mentionOpen && mentionResults.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-vb-bg2 border border-white/[0.08] rounded-lg shadow-[0_-8px_24px_rgba(0,0,0,0.4)] overflow-hidden max-h-[240px] overflow-y-auto z-50">
              {mentionResults.map((file, i) => (
                <button
                  key={file}
                  onMouseDown={(e) => { e.preventDefault(); selectMention(file); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${i === mentionIdx ? 'bg-vb-accent/[0.08]' : 'hover:bg-white/[0.03]'}`}
                >
                  <FileText size={11} className="text-vb-ink4 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className={`text-[11px] truncate ${i === mentionIdx ? 'text-vb-accent' : 'text-vb-ink2'}`}>{file.split('/').pop()}</div>
                    <div className="text-[9px] text-vb-ink4 truncate">{file}</div>
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
