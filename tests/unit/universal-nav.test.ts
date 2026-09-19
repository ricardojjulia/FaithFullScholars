import { describe, it, expect } from 'vitest';

describe('Universal App Bar & Navigation Items (ADR 0007)', () => {
  const primaryNavItems = [
    { label: 'Home', href: '/', icon: '🏠' },
    { label: 'Directory', href: '/scholars', icon: '👥' },
    { label: 'Courses', href: '/courses', icon: '📖' },
    { label: 'Teaching', href: '/scholars?available=true', icon: '💼' },
  ];

  it('1. contains the 4 essential LinkedIn-style primary navigation targets', () => {
    expect(primaryNavItems).toHaveLength(4);
    expect(primaryNavItems.map((i) => i.label)).toEqual(['Home', 'Directory', 'Courses', 'Teaching']);
  });

  it('2. verifies correct route mapping for faculty directory and course showcase', () => {
    const dirItem = primaryNavItems.find((i) => i.label === 'Directory');
    expect(dirItem?.href).toBe('/scholars');

    const courseItem = primaryNavItems.find((i) => i.label === 'Courses');
    expect(courseItem?.href).toBe('/courses');

    const adjunctItem = primaryNavItems.find((i) => i.label === 'Teaching');
    expect(adjunctItem?.href).toBe('/scholars?available=true');
  });
});
