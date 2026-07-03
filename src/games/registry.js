// Central list of games in the lab. Adding a new game = add an entry here and
// point `component` at its React component. `status: 'live'` makes it playable;
// anything else renders as a "coming soon" card on the home screen.
import ColorPatternGame from './colorPattern/ColorPatternGame.jsx'

export const GAMES = [
  {
    id: 'colorPattern',
    title: 'Color Pattern',
    tagline: 'Invent a secret rule. The AI figures out when you click.',
    description:
      'Colors flash by. You click whenever your secret pattern appears. The AI watches your clicks and deduces the exact rule in your head — then tells you what it is.',
    accent: '#8b5cf6',
    status: 'live',
    component: ColorPatternGame,
  },
  {
    id: 'mindReader',
    title: 'Mind Reader',
    tagline: 'Press left or right "randomly". It guesses first.',
    description:
      'The Aaronson Oracle: an AI that predicts your next keypress ~70% of the time, because humans are terrible at being random.',
    accent: '#3b82f6',
    status: 'coming-soon',
    component: null,
  },
  {
    id: 'rps',
    title: 'Rock · Paper · Scissors',
    tagline: 'An opponent that learns your habits and adapts.',
    description:
      'A Markov-ensemble opponent that models how you react to winning, losing, and tying — and exploits it.',
    accent: '#30a46c',
    status: 'coming-soon',
    component: null,
  },
  {
    id: 'profile',
    title: 'Behavior Profile',
    tagline: 'Your cross-game predictability, scored.',
    description:
      'Aggregate traits across every game: repetitiveness, tilt-when-losing, contrarianism, and how predictable you are overall.',
    accent: '#f59e0b',
    status: 'coming-soon',
    component: null,
  },
]
