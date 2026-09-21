/**
 * Schema.org JSON-LD Structured Metadata Generators
 * Optimizes FaithFull Scholars for organic Google search indexing,
 * Academic Rich Snippets, and knowledge graph ingestion.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://faithfullscholars.com';

export interface BreadcrumbItem {
  name: string;
  item: string;
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.item.startsWith('http') ? crumb.item : `${BASE_URL}${crumb.item}`,
    })),
  };
}

export function generateDisciplineHubJsonLd(discipline: {
  name: string;
  description: string;
  slug: string;
}, facultyCount: number, coursesCount: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${discipline.name} Faculty & Syllabi Directory`,
    description: discipline.description,
    url: `${BASE_URL}/disciplines/${discipline.slug}`,
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'FaithFull Scholars',
      url: BASE_URL,
      description: 'Professional academic network for biblical and theological professors.',
    },
    about: {
      '@type': 'DefinedTerm',
      name: discipline.name,
      description: discipline.description,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: facultyCount,
      itemListElement: [
        {
          '@type': 'EducationalOccupationalProgram',
          name: `${discipline.name} Academic Faculty Cohort`,
          numberOfCredentials: facultyCount,
        },
        {
          '@type': 'Course',
          name: `${discipline.name} Prepared Syllabi Catalog`,
          numberOfCredentials: coursesCount,
        },
      ],
    },
  };
}

export function generateTraditionHubJsonLd(tradition: {
  name: string;
  description: string;
  slug: string;
}, standards: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${tradition.name} Theological Scholars & Confessional Standards`,
    description: tradition.description,
    url: `${BASE_URL}/traditions/${tradition.slug}`,
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'FaithFull Scholars',
      url: BASE_URL,
    },
    about: {
      '@type': 'Thing',
      name: tradition.name,
      description: tradition.description,
      sameAs: standards,
    },
  };
}

export function generateScholarPersonJsonLd(scholar: {
  fullName: string;
  title?: string | null;
  currentInstitution?: string | null;
  institutionalRole?: string | null;
  biography?: string | null;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: scholar.fullName,
    jobTitle: scholar.title || scholar.institutionalRole || 'Professor of Theology',
    worksFor: scholar.currentInstitution
      ? {
          '@type': 'EducationalOrganization',
          name: scholar.currentInstitution,
        }
      : undefined,
    description: scholar.biography || undefined,
    url: `${BASE_URL}/scholars/${scholar.slug}`,
  };
}
