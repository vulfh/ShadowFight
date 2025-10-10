// Default configuration values
export const DEFAULT_CONFIG = {
  DURATION: 5,
  DELAY: 3,
  VOLUME: 80
} as const

// Default fight list values
export const DEFAULT_FIGHT_LIST = {
  NAME: 'My Techniques',
  PRIORITY: 3, // Medium priority
  MAX_TECHNIQUES: 100
} as const

// Default UI state
export const DEFAULT_UI_STATE = {
  isCreating: false,
  isEditing: false,
  selectedFightList: null,
  expandedFightLists: []
} as const
