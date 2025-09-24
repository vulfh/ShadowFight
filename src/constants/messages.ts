// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
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
  CONFIGURE_SESSION: 'Please configure your session before starting.',
  
  // Fight List error messages
  FIGHT_LIST_NAME_REQUIRED: 'Fight list name is required',
  FIGHT_LIST_NAME_TOO_LONG: 'Fight list name must be 50 characters or less',
  FIGHT_LIST_NAME_EXISTS: 'A fight list with this name already exists',
  FIGHT_LIST_NOT_FOUND: 'Fight list not found',
  FIGHT_LIST_DELETE_CONFIRM: 'Are you sure you want to delete this fight list?',
  FIGHT_LIST_MAX_REACHED: 'Maximum number of fight lists reached (50)',
  TECHNIQUE_ALREADY_IN_LIST: 'This technique is already in the fight list',
  NO_TECHNIQUES_IN_FIGHT_LIST: 'Please select at least one technique in the fight list'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  WELCOME: 'Welcome to Krav Maga Shadow Fighting Trainer!',
  AUDIO_LOADED: 'Audio files loaded successfully!',
  CONFIG_SAVED: 'Configuration saved successfully!',
  SESSION_STARTED: 'Session started successfully!',
  SESSION_COMPLETED: 'Session completed successfully!',
  ALL_TECHNIQUES_SELECTED: 'All techniques selected!',
  ALL_TECHNIQUES_DESELECTED: 'All techniques deselected!',
  
  // Fight List success messages
  FIGHT_LIST_CREATED: 'Fight list created successfully!',
  FIGHT_LIST_UPDATED: 'Fight list updated successfully!',
  FIGHT_LIST_DELETED: 'Fight list deleted successfully!',
  TECHNIQUE_ADDED: 'Technique added to fight list!',
  TECHNIQUE_REMOVED: 'Technique removed from fight list!',
  FIGHT_LIST_SAVED: 'Fight list saved successfully!'
} as const

// Info messages
export const INFO_MESSAGES = {
  LOADING_AUDIO: 'Loading audio files...',
  SESSION_RESUMED: 'Session resumed!',
  SESSION_STOPPED: 'Session stopped!',
  SESSION_PAUSED: 'Session paused!',
  PREVIOUS_SESSION_RESTORED: 'Previous session restored. You can resume or start a new session.',
  STRATEGY_CHANGED: 'Technique selection strategy changed to:',
  
  // Fight List info messages
  FIGHT_LIST_LOADING: 'Loading fight lists...',
  TECHNIQUE_SEARCHING: 'Searching techniques...',
  FIGHT_LIST_EXPANDED: 'Fight list expanded',
  FIGHT_LIST_COLLAPSED: 'Fight list collapsed'
} as const

// Warning messages
export const WARNING_MESSAGES = {
  AUDIO_LOAD_FAILED: 'Some audio files failed to load. Check your internet connection.',
  ALL_TECHNIQUES_DESELECTED: 'All techniques deselected!',
  SESSION_PAUSED: 'Session paused!',
  NO_TECHNIQUES_SELECTED: 'No techniques are selected',
  
  // Fight List warning messages
  FIGHT_LIST_EMPTY: 'This fight list is empty',
  FIGHT_LIST_NO_SELECTED_TECHNIQUES: 'No techniques selected in this fight list',
  FIGHT_LIST_LAST_ONE: 'This is your last fight list. You cannot delete it.',
  TECHNIQUE_ALREADY_SELECTED: 'This technique is already selected'
} as const
