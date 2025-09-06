// Strategy types
export const STRATEGY_TYPES = {
  RANDOM: 'random',
  ROUND_ROBIN: 'roundRobin',
  PRIORITY_BASED: 'priorityBased'
} as const

// Technique categories
export const TECHNIQUE_CATEGORIES = {
  PUNCHES: 'Punches',
  STRIKES: 'Strikes',
  KICKS: 'Kicks',
  KNEES: 'Knees',
  DEFENSES_GRABS: 'Defenses/Grabs',
  WEAPONS: 'Weapons'
} as const

// Priority levels
export const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const

// Local storage keys
export const STORAGE_KEYS = {
  KRAV_MAGA_CONFIG: 'kravMagaConfig',
  KRAV_MAGA_SESSION_STATE: 'kravMagaSessionState'
} as const

// Audio file names
export const AUDIO_FILES = {
  REGEL_MAGAL_YAMIN: 'regel_magal_yamin.wav'
} as const

// Session configuration limits
export const SESSION_LIMITS = {
  MIN_DURATION: 1,
  MAX_DURATION: 30,
  MIN_DELAY: 1,
  MAX_DELAY: 10,
  MIN_VOLUME: 0,
  MAX_VOLUME: 100,
  MAX_CONSECUTIVE_AUDIO_FAILURES: 3,
  SESSION_RESTORE_TIME_LIMIT: 5 * 60 * 1000, // 5 minutes in milliseconds
  SESSION_SAVE_INTERVAL: 30 // Save every 30 seconds
} as const

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
  TIMER_DISPLAY: 'timerDisplay'
} as const

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  SPACE: 'Space',
  ESCAPE: 'Escape'
} as const

// Default configuration values
export const DEFAULT_CONFIG = {
  DURATION: 5,
  DELAY: 3,
  VOLUME: 80
} as const

// Error messages
export const ERROR_MESSAGES = {
  SESSION_ALREADY_ACTIVE: 'Session already active',
  NO_TECHNIQUES_AVAILABLE: 'No techniques available for selection',
  FAILED_TO_INITIALIZE: 'Failed to initialize application. Please refresh the page.',
  FAILED_TO_START_SESSION: 'Failed to start session',
  AUDIO_FAILURE: 'Failed to play audio for technique',
  MULTIPLE_AUDIO_FAILURES: 'Session stopped due to multiple audio failures. Please check your audio files.',
  INVALID_JSON_FORMAT: 'Invalid JSON format',
  DURATION_RANGE: 'Duration must be between 1 and 30 minutes',
  DELAY_RANGE: 'Delay must be between 1 and 10 seconds',
  VOLUME_RANGE: 'Volume must be between 0 and 100',
  TECHNIQUES_ARRAY: 'Techniques must be an array',
  NO_TECHNIQUES_SELECTED: 'No techniques are selected',
  CONFIGURE_SESSION: 'Please configure your session before starting.'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  WELCOME: 'Welcome to Krav Maga Shadow Fighting Trainer!',
  AUDIO_LOADED: 'Audio files loaded successfully!',
  CONFIG_SAVED: 'Configuration saved successfully!',
  SESSION_STARTED: 'Session started successfully!',
  ALL_TECHNIQUES_SELECTED: 'All techniques selected!',
  ALL_TECHNIQUES_DESELECTED: 'All techniques deselected!'
} as const

// Info messages
export const INFO_MESSAGES = {
  LOADING_AUDIO: 'Loading audio files...',
  SESSION_RESUMED: 'Session resumed!',
  SESSION_STOPPED: 'Session stopped!',
  SESSION_PAUSED: 'Session paused!',
  PREVIOUS_SESSION_RESTORED: 'Previous session restored. You can resume or start a new session.',
  STRATEGY_CHANGED: 'Technique selection strategy changed to:'
} as const

// Warning messages
export const WARNING_MESSAGES = {
  AUDIO_LOAD_FAILED: 'Some audio files failed to load. Check your internet connection.',
  ALL_TECHNIQUES_DESELECTED: 'All techniques deselected!',
  SESSION_PAUSED: 'Session paused!',
  NO_TECHNIQUES_SELECTED: 'No techniques are selected'
} as const
