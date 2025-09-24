// UI element IDs
export const UI_ELEMENTS = {
  CONFIG_FORM: 'configForm',
  FIGHT_DURATION: 'fightDuration',
  ACTION_DELAY: 'actionDelay',
  VOLUME_CONTROL: 'volumeControl',
  DURATION_VALUE: 'durationValue',
  DELAY_VALUE: 'delayValue',
  VOLUME_VALUE: 'volumeValue',
  SELECT_ALL: 'selectAll',
  DESELECT_ALL: 'deselectAll',
  START_BTN: 'startBtn',
  PAUSE_BTN: 'pauseBtn',
  STOP_BTN: 'stopBtn',
  TIMER_DISPLAY: 'timerDisplay',
  
  // New fight list elements
  FIGHT_LIST_CONTAINER: 'fightListContainer',
  NEW_FIGHT_LIST_BTN: 'newFightListBtn',
  TECHNIQUE_ADD_MODAL: 'techniqueAddModal',
  COLLAPSE_ALL_BTN: 'collapseAllBtn',
  EXPAND_ALL_BTN: 'expandAllBtn'
} as const

export const FIGHT_LIST_UI_ELEMENTS = {
  CONTAINER: 'fightListContainer',
  NEW_BTN: 'newFightListBtn',
  ITEM: 'fightListItem',
  ACTIONS: 'fightListActions',
  TECHNIQUE_SEARCH: 'techniqueSearch',
  TECHNIQUE_LIST: 'availableTechniques',
  ADD_SELECTED_BTN: 'addSelectedTechniques'
} as const

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  SPACE: 'Space',
  ESCAPE: 'Escape'
} as const
