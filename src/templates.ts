import type { Layout } from './layout'

export interface Template {
  id: string
  name: string
  description: string
  layout: Layout
}

// Templates only contain structure and neutral starter text, never personal content.

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank journal',
    description: 'One empty page. Add pages and blocks yourself.',
    layout: {
      format: 'journal-layout',
      version: 1,
      journal: { eyebrow: '', title: 'My journal', subtitle: '' },
      pages: [{ title: 'Page 1', blocks: [] }],
    },
  },
  {
    id: 'challenge-kit',
    name: '30-day challenge',
    description: 'A 30-item challenge list, an idea board and a habit tracker.',
    layout: {
      format: 'journal-layout',
      version: 1,
      journal: {
        eyebrow: '30-day challenge',
        title: '30 days of brave asks',
        subtitle: 'One small brave thing a day. A "no" still counts, because the rep is the point.',
      },
      pages: [
        {
          title: '30 Days',
          blocks: [
            {
              type: 'challenge',
              title: 'The challenge',
              length: 30,
              noteLabel: 'What happened?',
              categories: [
                { id: 'career', label: 'Career', color: 'blue' },
                { id: 'business', label: 'Business', color: 'green' },
                { id: 'creative', label: 'Creative', color: 'purple' },
                { id: 'brave', label: 'Brave', color: 'red' },
              ],
              items: [],
            },
          ],
        },
        {
          title: 'Ideas',
          blocks: [
            { type: 'ideas', title: 'Ideas', items: [] },
            { type: 'notes', title: 'Answers & new ideas', placeholder: 'Write them down as they come…', body: '' },
          ],
        },
        {
          title: 'Habits',
          blocks: [
            { type: 'habits', title: 'Habits', intro: 'Each habit has its own weekly goal. Tap the days you showed up.', items: [] },
            { type: 'notes', title: 'Someday list', intro: 'Things to try, written down before you forget them.', placeholder: 'Something I want to try…', body: '' },
          ],
        },
      ],
    },
  },
  {
    id: 'habits',
    name: 'Habit tracker',
    description: 'Weekly habit goals with a page for reflections.',
    layout: {
      format: 'journal-layout',
      version: 1,
      journal: { eyebrow: 'Small steps', title: 'Habit journal', subtitle: 'Show up, tick the day, look back at the streak.' },
      pages: [
        {
          title: 'This week',
          blocks: [
            { type: 'habits', title: 'Habits', intro: 'Tap the days you practiced.', items: [] },
            { type: 'notes', title: 'Reflections', placeholder: 'What went well? What got in the way?', body: '' },
          ],
        },
      ],
    },
  },
  {
    id: 'ideas',
    name: 'Idea board',
    description: 'Key facts, idea cards and a list of next steps.',
    layout: {
      format: 'journal-layout',
      version: 1,
      journal: { eyebrow: 'Thinking out loud', title: 'Idea board', subtitle: 'Collect ideas, shape them, pick the next step.' },
      pages: [
        {
          title: 'Ideas',
          blocks: [
            { type: 'facts', title: 'At a glance', facts: [] },
            { type: 'ideas', title: 'Ideas', items: [] },
            { type: 'checklist', title: 'Next steps', items: [] },
          ],
        },
      ],
    },
  },
]
