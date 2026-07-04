// Central list of games in the lab. Adding a new game = add an entry here and
// point `component` at its React component. `status: 'live'` makes it playable.
import ColorPatternGame from './colorPattern/ColorPatternGame.jsx'
import EleusisGame from './eleusis/EleusisGame.jsx'
import MindReaderGame from './mindReader/MindReaderGame.jsx'
import RandomNumberGame from './randomNumber/RandomNumberGame.jsx'
import ClickGridGame from './clickGrid/ClickGridGame.jsx'
import RpsGame from './rps/RpsGame.jsx'
import PrisonersDilemmaGame from './pd/PrisonersDilemmaGame.jsx'
import BankGame from './bank/BankGame.jsx'
import BehaviorProfile from './profile/BehaviorProfile.jsx'

export const GAMES = [
  {
    id: 'colorPattern',
    title: 'Color Pattern',
    tagline: 'Invent a secret rule. The AI figures out when you click.',
    description:
      'Colors flash by. You click whenever your secret pattern appears, and the AI deduces the exact rule in your head — then tells you what it is.',
    accent: '#8b5cf6',
    status: 'live',
    component: ColorPatternGame,
  },
  {
    id: 'eleusis',
    title: 'Guess My Rule',
    tagline: 'Think of a rule about numbers. It plays scientist.',
    description:
      'You hold a secret rule about numbers (even, prime, > 50…). The AI proposes numbers, asks if each fits, and induces your rule — the scientific method as a game.',
    accent: '#a855f7',
    status: 'live',
    component: EleusisGame,
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
    id: 'randomNumber',
    title: 'Pick a Random Number',
    tagline: 'Tap 1–10 randomly. It guesses each one.',
    description:
      'Choose numbers as randomly as you can. The AI predicts every pick and exposes the biases nobody thinks they have (everybody loves 7).',
    accent: '#06b6d4',
    status: 'live',
    component: RandomNumberGame,
  },
  {
    id: 'clickGrid',
    title: 'Where Will You Click?',
    tagline: 'Click a grid randomly. It predicts the cell.',
    description:
      'Click cells as unpredictably as you can. The AI learns your spatial habits — favourite spots, avoided repeats — and calls your next click.',
    accent: '#0ea5e9',
    status: 'live',
    component: ClickGridGame,
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
    id: 'pd',
    title: "Prisoner's Dilemma",
    tagline: 'Cooperate or defect. It reads your reciprocity.',
    description:
      'Iterated Prisoner\'s Dilemma against an AI that predicts your move and plays it back at you. It models tit-for-tat, grudges, and trust.',
    accent: '#ef4444',
    status: 'live',
    component: PrisonersDilemmaGame,
  },
  {
    id: 'bank',
    title: 'Bank',
    tagline: 'Push your luck. It learns when you cash out.',
    description:
      'The dice game BANK against simple AI opponents. Each round you roll on or bank your points — and a predictor learns exactly when you tend to cash out.',
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
