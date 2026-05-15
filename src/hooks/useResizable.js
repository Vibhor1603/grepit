"use client";
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for resizable panels with drag handles.
 * Returns width state and mouse event handlers for the resize handle.
 */
export function useResizable({ defaultWidth = 240, minWidth = 160, maxWidth = 400, storageKey }) {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const initialized = useRef(false);

  // Load saved width after mount (avoids hydration mismatch)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) setWidth(Math.max(minWidth, Math.min(maxWidth, parseInt(saved, 10))));
    }
  }, []);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + diff));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (storageKey) localStorage.setItem(storageKey, String(width));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [width, minWidth, maxWidth, storageKey]);

  return { width: collapsed ? 0 : width, collapsed, setCollapsed, onMouseDown, setWidth };
}

/**
 * Same but for right-side panels (drag direction is inverted).
 */
export function useResizableRight({ defaultWidth = 240, minWidth = 160, maxWidth = 400, storageKey }) {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) setWidth(Math.max(minWidth, Math.min(maxWidth, parseInt(saved, 10))));
    }
  }, []);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const diff = startX.current - e.clientX; // inverted for right panel
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + diff));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (storageKey) localStorage.setItem(storageKey, String(width));
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [width, minWidth, maxWidth, storageKey]);

  return { width: collapsed ? 0 : width, collapsed, setCollapsed, onMouseDown, setWidth };
}
