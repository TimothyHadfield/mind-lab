// The color palette. Default is 3 clearly-distinct colors; the "more colors"
// setting adds three more (all still easy to tell apart).
export const ALL_COLORS = [
  { id: 'red', name: 'red', hex: '#e5484d' },
  { id: 'green', name: 'green', hex: '#30a46c' },
  { id: 'yellow', name: 'yellow', hex: '#f5d90a' },
  { id: 'pink', name: 'pink', hex: '#ec4899' },
  { id: 'purple', name: 'purple', hex: '#8e4ec6' },
  { id: 'blue', name: 'blue', hex: '#3b82f6' },
]

export const DEFAULT_PALETTE = ALL_COLORS.slice(0, 3)

export const fullMaskFor = (palette) => (1 << palette.length) - 1
