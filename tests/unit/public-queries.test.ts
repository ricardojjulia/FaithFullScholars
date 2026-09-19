import { describe, it, expect } from 'vitest';
import { PublicScholarCard } from '@/lib/domain/queries';

describe('Public Discovery Unit Tests — Filter & Transformation Logic', () => {
  const sampleScholars: PublicScholarCard[] = [
    {
      id: 'scholar-1',
      slug: 'calvin-edwards',
      full_name: 'Dr. Calvin Edwards',
      title: 'Professor of Historical Theology',
      current_institution: 'Covenant Theological Seminary',
      institutional_role: 'Professor of Historical Theology',
      location: 'St. Louis, MO',
      biography: 'Specialist in 17th century Post-Reformation Reformed Dogmatics.',
      profile_photo_path: null,
      disciplines: [
        { name: 'Historical Theology', slug: 'historical-theology', is_primary: true },
        { name: 'Systematic Theology', slug: 'systematic-theology', is_primary: false },
      ],
      traditions: [
        { name: 'Reformed / Presbyterian', slug: 'reformed-presbyterian', is_primary: true },
      ],
      confessions: [
        {
          name: 'Westminster Confession of Faith',
          slug: 'westminster-confession',
          adherence_level: 'full_subscription',
        },
      ],
      is_available_for_hire: true,
      opportunity_types: ['adjunct_teaching', 'intensives_modular'],
    },
    {
      id: 'scholar-2',
      slug: 'sarah-macarthur',
      full_name: 'Dr. Sarah MacArthur',
      title: 'Associate Professor of New Testament',
      current_institution: 'Trinity Evangelical Divinity School',
      institutional_role: 'Associate Professor of New Testament',
      location: 'Deerfield, IL',
      biography: 'Johannine literature and early Christology researcher.',
      profile_photo_path: null,
      disciplines: [
        { name: 'New Testament', slug: 'new-testament', is_primary: true },
      ],
      traditions: [
        { name: 'Evangelical Free / Independent', slug: 'evangelical-free', is_primary: true },
      ],
      confessions: [
        {
          name: 'Second London Baptist Confession (1689)',
          slug: '1689-london-baptist',
          adherence_level: 'strict_subscription',
        },
      ],
      is_available_for_hire: false,
      opportunity_types: ['guest_lectures'],
    },
  ];

  it('1. filters scholars by search query across name, title, and bio', () => {
    const filterBySearch = (list: PublicScholarCard[], search: string) => {
      const term = search.toLowerCase().trim();
      return list.filter(
        (s) =>
          s.full_name.toLowerCase().includes(term) ||
          (s.title && s.title.toLowerCase().includes(term)) ||
          (s.biography && s.biography.toLowerCase().includes(term)) ||
          (s.current_institution && s.current_institution.toLowerCase().includes(term))
      );
    };

    const searchCalvin = filterBySearch(sampleScholars, 'calvin');
    expect(searchCalvin).toHaveLength(1);
    expect(searchCalvin[0].slug).toBe('calvin-edwards');

    const searchJohannine = filterBySearch(sampleScholars, 'Johannine');
    expect(searchJohannine).toHaveLength(1);
    expect(searchJohannine[0].slug).toBe('sarah-macarthur');

    const searchTheology = filterBySearch(sampleScholars, 'Theology');
    expect(searchTheology).toHaveLength(1);
    expect(searchTheology[0].slug).toBe('calvin-edwards');
  });

  it('2. filters scholars by discipline slug', () => {
    const filterByDiscipline = (list: PublicScholarCard[], slug: string) =>
      list.filter((s) => s.disciplines.some((d) => d.slug === slug));

    const ntScholars = filterByDiscipline(sampleScholars, 'new-testament');
    expect(ntScholars).toHaveLength(1);
    expect(ntScholars[0].slug).toBe('sarah-macarthur');

    const histScholars = filterByDiscipline(sampleScholars, 'historical-theology');
    expect(histScholars).toHaveLength(1);
    expect(histScholars[0].slug).toBe('calvin-edwards');

    const otScholars = filterByDiscipline(sampleScholars, 'old-testament');
    expect(otScholars).toHaveLength(0);
  });

  it('3. filters scholars by confessional standard slug', () => {
    const filterByConfession = (list: PublicScholarCard[], slug: string) =>
      list.filter((s) => s.confessions.some((c) => c.slug === slug));

    const westminsterScholars = filterByConfession(sampleScholars, 'westminster-confession');
    expect(westminsterScholars).toHaveLength(1);
    expect(westminsterScholars[0].slug).toBe('calvin-edwards');

    const londonBaptistScholars = filterByConfession(sampleScholars, '1689-london-baptist');
    expect(londonBaptistScholars).toHaveLength(1);
    expect(londonBaptistScholars[0].slug).toBe('sarah-macarthur');

    const augsburgScholars = filterByConfession(sampleScholars, 'augsburg-confession');
    expect(augsburgScholars).toHaveLength(0);
  });

  it('4. filters scholars by availability for hire', () => {
    const available = sampleScholars.filter((s) => s.is_available_for_hire);
    expect(available).toHaveLength(1);
    expect(available[0].slug).toBe('calvin-edwards');
  });

  it('5. computes initials correctly handling titles like Dr.', () => {
    const getInitials = (name: string) =>
      name
        .replace(/^Dr\.\s*/i, '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    expect(getInitials('Dr. Calvin Edwards')).toBe('CE');
    expect(getInitials('Dr. Sarah MacArthur')).toBe('SM');
    expect(getInitials('Herman Bavinck')).toBe('HB');
    expect(getInitials('John')).toBe('J');
  });
});
