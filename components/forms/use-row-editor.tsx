'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { moveItem } from '@/lib/profiles/profile-rows';

let rowCounter = 0;
const newRowId = () => `r${++rowCounter}`;

/**
 * Focus request applied after the next render, once the DOM reflects the change.
 * `selectors` are tried in order; the first enabled match is focused.
 */
export function useFocusAfterRender() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pending = useRef<string[] | null>(null);

  const requestFocus = useCallback((...selectors: string[]) => {
    pending.current = selectors;
  }, []);

  useEffect(() => {
    const selectors = pending.current;
    if (!selectors || !containerRef.current) return;
    pending.current = null;
    for (const selector of selectors) {
      let el: HTMLElement | null = null;
      try {
        el = containerRef.current.querySelector<HTMLElement>(selector);
      } catch {
        // A raw legacy value containing quotes can make the selector invalid; try the next one.
      }
      if (el && !(el as HTMLButtonElement).disabled) {
        el.focus();
        return;
      }
    }
  });

  return { containerRef, requestFocus };
}

interface UseRowEditorOptions<T> {
  value: T[];
  onChange: (rows: T[]) => void;
  makeEmpty: () => T;
  /** Singular noun for announcements, e.g. "credential". */
  noun: string;
  /** From useFocusAfterRender, called by the editor so the container ref stays out of this hook's result. */
  requestFocus: (...selectors: string[]) => void;
}

/**
 * Shared behaviour of the credential and publication editors: stable client row
 * ids (the saved shape is unchanged), focus after add, remove and move, a polite
 * announcement of each, and a record of which fields the scholar has touched so
 * a brand-new empty row does not announce a wall of errors.
 */
export function useRowEditor<T>({ value, onChange, makeEmpty, noun, requestFocus }: UseRowEditorOptions<T>) {
  const [ids, setIds] = useState<string[]>(() => value.map(newRowId));
  const [announcement, setAnnouncement] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // The parent can replace the list (e.g. a CV import): keep ids in step with its length.
  let rowIds = ids;
  if (ids.length !== value.length) {
    rowIds = value.map((_, i) => ids[i] ?? newRowId());
    setIds(rowIds);
  }

  const rowSelector = (id: string) => `[data-row-id="${id}"]`;

  function add() {
    const id = newRowId();
    setIds([...rowIds, id]);
    onChange([...value, makeEmpty()]);
    requestFocus(`${rowSelector(id)} [data-first-field]`);
    setAnnouncement(`${noun[0].toUpperCase()}${noun.slice(1)} ${value.length + 1} added.`);
  }

  function remove(index: number) {
    const nextIds = rowIds.filter((_, i) => i !== index);
    setIds(nextIds);
    onChange(value.filter((_, i) => i !== index));
    const next = nextIds[index];
    requestFocus(...(next ? [`${rowSelector(next)} [data-first-field]`] : []), '[data-add-button]');
    setAnnouncement(`${noun[0].toUpperCase()}${noun.slice(1)} ${index + 1} removed. ${nextIds.length} remaining.`);
  }

  function move(index: number, direction: -1 | 1) {
    const to = index + direction;
    if (to < 0 || to >= value.length) return;
    const id = rowIds[index];
    setIds(moveItem(rowIds, index, to));
    onChange(moveItem(value, index, to));
    const control = direction === -1 ? 'up' : 'down';
    const other = direction === -1 ? 'down' : 'up';
    // At the end of the list the pressed control becomes disabled: fall back to its partner.
    requestFocus(`${rowSelector(id)} [data-control="${control}"]`, `${rowSelector(id)} [data-control="${other}"]`);
    setAnnouncement(`${noun[0].toUpperCase()}${noun.slice(1)} moved to position ${to + 1} of ${value.length}.`);
  }

  function update(index: number, patch: Partial<T>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const touch = (rowId: string, field: string) =>
    setTouched((prev) => (prev[`${rowId}:${field}`] ? prev : { ...prev, [`${rowId}:${field}`]: true }));
  const isTouched = (rowId: string, field: string) => !!touched[`${rowId}:${field}`];

  return { ids: rowIds, announcement, add, remove, move, update, touch, isTouched };
}

/** Polite live region for list changes; visually hidden. */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="sr-only" data-testid="row-live-region">
      {message}
    </div>
  );
}

/** Field error text. It announces (role=alert) once the scholar has interacted with the field. */
export function FieldError({ id, message, announce }: { id: string; message?: string; announce: boolean }) {
  if (!message) return null;
  return (
    <p id={id} role={announce ? 'alert' : undefined} className="mt-1 text-[11px] text-rose-700">
      {message}
    </p>
  );
}
