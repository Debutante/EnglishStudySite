export const DEMO_CATEGORIES = [
  { slug: 'technology', name: 'Technology', description: 'Technology, AI and the changing workplace.' },
  { slug: 'economics', name: 'Economics', description: 'Markets, incentives and economic systems.' },
  { slug: 'cities', name: 'Cities', description: 'Urban systems, mobility and planning.' },
];

export const DEMO_ARTICLES = [
  {
    slug: 'ai-is-changing-where-productivity-comes-from',
    category: 'technology',
    date: '2026-09-18',
    level: 'Upper intermediate',
    readingTime: 5,
    title: 'AI is changing where productivity comes from',
    dek: 'The next gains may come less from faster software and more from better decisions about how work is organised.',
    tags: ['AI', 'work', 'productivity'],
    coverImageUrl: '/assets/thumb-technology.svg',
    paragraphs: [
      [
        'Companies once looked to new software mainly for faster execution.',
        'Increasingly, the bigger opportunity is to decide which work should be automated, which should remain human and which should be redesigned altogether.',
      ],
      [
        'That shift matters because the cost of generating a first draft, query or analysis is falling rapidly.',
        'The scarce resource is becoming the judgement required to turn those outputs into useful decisions.',
      ],
      [
        'Managers therefore need to treat AI as a change to the workflow, not simply as another tool in the toolbox.',
        'Teams that redesign their processes around the technology may see larger gains than teams that merely add a chatbot to an existing routine.',
      ],
    ],
  },
  {
    slug: 'cities-are-learning-to-price-scarce-energy',
    category: 'economics',
    date: '2026-09-16',
    level: 'Advanced',
    readingTime: 6,
    title: 'Cities are learning to price scarce energy',
    dek: 'As electricity demand grows, local systems are experimenting with signals that encourage consumers to move usage away from crowded periods.',
    tags: ['energy', 'cities', 'economics'],
    coverImageUrl: '/assets/thumb-economics.svg',
    paragraphs: [
      [
        'Electricity networks are built to meet demand at the busiest moments, even though those moments may occur for only a few hours each year.',
        'That makes peak demand unusually expensive and creates a strong incentive to spread consumption over time.',
      ],
      [
        'Digital meters make it easier to send households and businesses a price signal that changes during the day.',
        'The idea is simple, but its effects depend on whether consumers understand the signal and have practical ways to respond.',
      ],
      [
        'The challenge for city governments is to balance efficiency with fairness.',
        'A pricing system can reduce pressure on the grid, yet it should not leave households with limited flexibility paying the highest costs.',
      ],
    ],
  },
  {
    slug: 'better-mobility-data-can-change-the-shape-of-a-city',
    category: 'cities',
    date: '2026-09-12',
    level: 'Upper intermediate',
    readingTime: 4,
    title: 'Better mobility data can change the shape of a city',
    dek: 'Transport planning is moving from counting vehicles towards understanding how people actually move between places.',
    tags: ['mobility', 'data', 'urban planning'],
    coverImageUrl: '/assets/thumb-cities.svg',
    paragraphs: [
      [
        'For decades, transport agencies often measured success by counting vehicles, estimating travel times and expanding roads where congestion appeared.',
        'Newer datasets can reveal a more complicated picture of how people move across a city.',
      ],
      [
        'When planners combine travel records with land-use and demographic information, they can see which neighbourhoods have good access to jobs and which do not.',
        'That can shift the conversation from moving cars faster to improving access to opportunities.',
      ],
      [
        'The hardest part is not collecting another dataset.',
        'It is deciding how several imperfect sources should be combined without creating false precision or overlooking people who generate little digital trace.',
      ],
    ],
  },
];
