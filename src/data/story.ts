// The About page tells the trajectory as chapters: it starts like a manuscript
// and becomes more digital with each step.
export interface Chapter {
  n: string;
  period: string;
  title: string;
  place: string;
  placeNote?: string;
  era: 'manuscript' | 'transition' | 'digital';
  body: string[];
}

export const intro = [
  "I'm an AI/ML engineer and researcher from Belo Horizonte, Brazil. I work on both sides of applied AI: in industry, I build the platforms and agents that make ML and LLM systems usable, observable and safe to operate; in research, I run the experiments that tell you whether they actually work.",
  'What connects the two is that I care whether a system really works. That means measuring it against a baseline, knowing how it fails, and keeping it running reliably for the people who depend on it. I start from the problem, not the model.',
];

export const chapters: Chapter[] = [
  {
    n: 'I',
    period: 'Before 2023',
    title: 'A detour through the humanities',
    place: 'History, Universidade Federal de Minas Gerais',
    era: 'manuscript',
    body: [
      "I didn't start in computing. I prepared for medical school, then started a history degree at UFMG, and I liked both. History taught me to read sources critically and to ask where a claim comes from, habits I still use every time I look at a metric.",
      'But the problems I kept thinking about were about data and systems. At 23, I left history, studied for six months for Brazil’s national entrance exam, and came back to UFMG in a computing program, ranked first in my admission class.',
    ],
  },
  {
    n: 'II',
    period: '2023 – 2027',
    title: 'Learning to build',
    place: 'B.Sc. in Information Systems, UFMG',
    placeNote: 'Core curriculum shared with Computer Science · graduating July 2027',
    era: 'transition',
    body: [
      "UFMG's Computer Science department is one of Brazil's strongest (top national rating, CAPES 7/7), and a spin-off from it became Google's engineering center in Belo Horizonte. I joined a research lab in my first year.",
    ],
  },
  {
    n: 'III',
    period: 'Dec 2023 – present',
    title: 'Research: measuring what works',
    place: 'SPEED Lab, Computer Science Department, UFMG',
    placeNote: 'Advised by Prof. Wagner Meira Jr. and Prof. Gisele Pappa',
    era: 'transition',
    body: [
      'At the SPEED Lab I have co-authored six peer-reviewed papers: Transformers for tabular data with heavy missingness, efficient fine-tuning of compressed language models (as first author), clinical ML on ECGs and ICU data, and an NLP analysis of 453,000 parliamentary speeches that I presented at AAAI ICWSM 2026 in Los Angeles.',
      'Research taught me to distrust a single good number, to run many seeds, and to say clearly what did not work.',
    ],
  },
  {
    n: 'IV',
    period: 'Feb 2025 – Feb 2026',
    title: 'Industry: making LLMs usable for a whole company',
    place: 'Localiza&Co, GenAI Platform',
    placeNote: "Latin America's largest car-rental and fleet company",
    era: 'digital',
    body: [
      'On the GenAI platform team I owned observability for the retrieval services, the migration of our vector store, and the governance flow that cut access approval from four hours to fifteen minutes. Production taught me that latency, cost and access matter as much as accuracy.',
    ],
  },
  {
    n: 'V',
    period: 'Feb 2026 – present',
    title: 'Agents that operate real infrastructure',
    place: 'iFood, ML Platform',
    placeNote: "Latin America's largest food-delivery platform",
    era: 'digital',
    body: [
      "Today I build LLM agents on the team behind iFood's ML platform: agents that triage support requests and carry out routine infrastructure changes, with a person approving every change before it reaches production.",
    ],
  },
];

export const talks = [
  { what: 'Paper presentation', where: 'AAAI ICWSM 2026, Los Angeles' },
  { what: 'Internal talk', where: 'Architecture of the access-automation agents, company-wide AI platform review, iFood (2026)' },
  { what: 'Moderator', where: '“AI Movement: From Hardware to Business Value”, Localiza Fusca Talks, with Dell Technologies (2025)' },
  { what: 'Panelist', where: 'WoMakersCode Women in Tech Meetup, Belo Horizonte (2025)' },
  { what: 'Teaching assistant', where: '30-hour course on Generative AI in Healthcare, UFMG (2025)' },
  { what: 'Volunteer', where: 'Google Developer Groups Belo Horizonte; designed the official DevFest BH 2025 T-shirt' },
];

export const awards = [
  { title: '1st place', where: 'Ruptura 2024 Hackathon, Localiza&Co challenge' },
  { title: '2nd place', where: 'Google Gemini Challenge, UFMG DCC Week 2025' },
  { title: 'Research fellowship', where: 'FUNDEP, UFMG (2024)' },
  { title: 'Ranked 1st', where: 'Admission to UFMG Information Systems (2023)' },
];

export const sheet = [
  { k: 'Class', v: 'Scholar-Engineer' },
  { k: 'Guild', v: 'iFood · ML Platform' },
  { k: 'Academy', v: 'UFMG · SPEED Lab' },
  { k: 'Origin', v: 'Belo Horizonte, Brazil' },
  { k: 'Familiar', v: 'A small red dragon who reads' },
];
