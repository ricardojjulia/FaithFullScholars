'use client';

import React from 'react';

export interface TabDef<T extends string> {
  id: T;
  content: React.ReactNode;
}

/** Props for the single tabpanel that the active tab controls. */
export function tabPanelProps(idPrefix: string, activeId: string) {
  return {
    role: 'tabpanel' as const,
    id: `${idPrefix}-panel`,
    'aria-labelledby': `${idPrefix}-tab-${activeId}`,
  };
}

/** Pure: which tab an arrow / Home / End key moves to, or null when the key is not handled. */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

const VARIANTS = {
  pill: {
    list: 'flex flex-wrap gap-1',
    tab: (active: boolean) =>
      `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
        active
          ? 'bg-indigo-900 text-white shadow-xs'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`,
  },
  underline: {
    list: 'flex border-b border-slate-200 dark:border-slate-800 space-x-6',
    tab: (active: boolean) =>
      `pb-3 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
        active
          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`,
  },
} as const;

/**
 * Accessible tablist (WAI-ARIA tabs pattern): roving tabindex, arrow / Home /
 * End navigation with automatic activation, `aria-controls` pointing at the
 * panel rendered with `tabPanelProps(idPrefix, active)`.
 */
export function Tabs<T extends string>({
  idPrefix,
  label,
  tabs,
  active,
  onChange,
  variant = 'pill',
}: {
  idPrefix: string;
  label: string;
  tabs: readonly TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  variant?: keyof typeof VARIANTS;
}) {
  const styles = VARIANTS[variant];

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const next = nextTabIndex(event.key, index, tabs.length);
    if (next === null) return;
    event.preventDefault();
    const target = tabs[next];
    onChange(target.id);
    document.getElementById(`${idPrefix}-tab-${target.id}`)?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={styles.list}>
      {tabs.map((tab, index) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={styles.tab(isActive)}
          >
            {tab.content}
          </button>
        );
      })}
    </div>
  );
}
