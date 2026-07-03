// Central list of games in the lab. Adding a new game = add an entry here and
// point `component` at its React component. `status: 'live'` makes it playable.
import ColorPatternGame from './colorPattern/ColorPatternGame.jsx'
import MindReaderGame from './mindReader/MindReaderGame.jsx'
import RpsGame from './rps/RpsGame.jsx'
import BankGame from './bank/BankGame.jsx'
import BehaviorProfile from './profile/BehaviorProfile.jsx'

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
    status: 'live',
    component: MindReaderGame,
  },
  {
    id: 'rps',
    title: 'Rock · Paper · Scissors',
    tagline: 'An opponent that learns your habits and adapts.',
    description:
      'A Markov-ensemble opponent that models how you react to winning, losing, and tying — and exploits it. Try to stay unpredictable.',
    accent: '#30a46c',
    status: 'live',
    component: RpsGame,
  },
  {
    id: 'bank',
    title: 'Bank',
    tagline: 'Push your luck. It learns when you cash out.',
    description:
      'The dice game BANK against simple AI opponents. Every round you choose to roll on or bank your points — and a predictor learns exactly when you tend to cash out, guessing each choice before you make it.',
    accent: '#14b8a6',
    status: 'live',
    component: BankGame,
  },
  {
    id: 'profile',
    title: 'Behavior Profile',
    tagline: 'Your cross-game predictability, scored.',
    description:
      'Aggregate traits across every game you play: repetition, tilt-after-losing, and how predictable you are overall.',
    accent: '#f59e0b',
    status: 'live',
    component: BehaviorProfile,
  },
]
