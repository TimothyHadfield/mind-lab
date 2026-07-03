// The color palette shared by both play modes (live stream + grid batch).
// Names match the player's mental model; hexes stay distinct on a light square.
export const PALETTE = [
  { id: 'red', name: 'red', hex: '#e5484d' },
  { id: 'green', name: 'green', hex: '#30a46c' },
  { id: 'black', name: 'black', hex: '#1f2430' },
  { id: 'blue', name: 'blue', hex: '#3b82f6' },
]

export const FULL_MASK = (1 << PALETTE.length) - 1
