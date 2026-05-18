"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, FileText, X } from 'lucide-react';

/**
 * Chat input with @ file mention support.
 * When user types @, shows a dropdown of matching files.
 * Selected files are attached as context chips above the input.
 */
export default function ChatInput({ query, setQuery, onSend, loading, onStop, fileTree = [] }) {
  const [inputFocused, setInputFocused] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const inputRef = useRef(null);

  // All blob files for mention search
  const allFiles = fileTree.filter(f => f.type === 'blob').map(f => f.path);

  // Filtered mention results
  const mentionResults = mentionQuery
    ? allFiles.filter(f => f.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
    : [];

  // Detect @ trigger
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    // Check if user just typed @ or is in a mention
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
    // Remove the @query from input
    const cursorPos = inputRef.current?.selectionStart || query.length;
    const textBefore = query.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');
    const newQuery = query.slice(0, atIdx) + query.slice(cursorPos);
    setQuery(newQuery.trim());

    // Add to attached files
    if (!attachedFiles.includes(filePath)) {
      setAttachedFiles(prev => [...prev, filePath]);
    }
    setMentionOpen(false);
    setMentionQuery('');
    inputRef.current?.focus();
  }, [query, attachedFiles, setQuery]);

  // Remove attached file
  const removeFile = (filePath) => {
    setAttachedFiles(prev => prev.filter(f => f !== filePath));
  };

  // Send with attached files as context
  const handleSend = () => {
    const q = query.trim();
    if (!q && attachedFiles.length === 0) return;
    // Build the actual query with file context
    onSend(q, attachedFiles);
    setAttachedFiles([]);
  };

  return (
    <div className="flex-shrink-0 px-6 pb-8 pt-4">
      <div className={`mx-auto transition-all duration-300 ease-out ${inputFocused ? 'max-w-3xl' : 'max-w-2xl'}`}>
        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attachedFiles.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] bg-vb-accent/[0.08] border border-vb-accent/20 text-vb-accent">
                <FileText size={10} />
                <span className="truncate max-w-[150px]">{f.split('/').pop()}</span>
                <button onClick={() => removeFile(f)} className="hover:text-vb-ink transition-colors"><X size={9} /></button>
              </span>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="relative">
          <div className={`flex items-center border rounded-xl px-5 py-3.5 transition-all duration-300 ${inputFocused ? 'border-vb-accent/30 bg-vb-bg3 shadow-[0_0_24px_rgba(224,252,16,0.06)]' : 'border-white/[0.14] bg-vb-bg2 shadow-[0_-2px_12px_rgba(0,0,0,0.2)] hover:border-white/[0.2] hover:shadow-[0_-2px_16px_rgba(0,0,0,0.3)]'}`}>
            <Send size={15} className={`mr-3 flex-shrink-0 transition-colors duration-200 ${inputFocused ? 'text-vb-accent' : 'text-vb-ink4'}`} />
            <input
              ref={inputRef}
              type="text"
              value={query || ''}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (mentionOpen && mentionResults.length > 0) {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionResults.length - 1)); return; }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
                  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectMention(mentionResults[mentionIdx]); return; }
                  if (e.key === 'Escape') { setMentionOpen(false); return; }
                }
                if (e.key === 'Enter' && !mentionOpen) {
                  if (loading) onStop?.();
                  handleSend();
                }
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => { setInputFocused(false); setTimeout(() => setMentionOpen(false), 200); }}
              placeholder="Ask about the codebase... (@ to attach files)"
              className="flex-1 bg-transparent text-[14px] text-vb-ink placeholder:text-vb-ink4 outline-none caret-vb-accent"
            />
            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
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
                  <FileText size={12} className="text-vb-ink4 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className={`text-[12px] truncate ${i === mentionIdx ? 'text-vb-accent' : 'text-vb-ink2'}`}>{file.split('/').pop()}</div>
                    <div className="text-[10px] text-vb-ink4 truncate">{file}</div>
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
