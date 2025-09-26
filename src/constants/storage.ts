/**
 * Constants for local storage keys used throughout the application.
 * These keys are used to store and retrieve data from browser's localStorage.
 * @namespace STORAGE_KEYS
 */
export const STORAGE_KEYS = {
  /** 
   * Key for storing the main application configuration
   * @type {string}
   * @constant
   */
  KRAV_MAGA_CONFIG: 'kravMagaConfig',
  
  /** 
   * Key for storing the current session state including active techniques
   * @type {string}
   * @constant
   */
  KRAV_MAGA_SESSION_STATE: 'kravMagaSessionState',
  
  /** 
   * Key for storing all fight lists. The value is an array of FightList objects
   * @type {string}
   * @constant
   * @see {@link FightList}
   */
  FIGHT_LISTS: 'kravMagaFightLists',
  
  /** 
   * Key for storing the currently selected fight list ID
   * @type {string}
   * @constant
   */
  CURRENT_FIGHT_LIST: 'kravMagaCurrentFightList',
  
  /** 
   * Key for storing the fight lists data structure version
   * Used for managing migrations and data structure updates
   * @type {string}
   * @constant
   */
  FIGHT_LIST_VERSION: 'kravMagaFightListVersion'
} as const;

/**
 * Audio file names used in the application.
 * These constants ensure consistent reference to audio resources.
 * @namespace AUDIO_FILES
 */
export const AUDIO_FILES = {
  /** 
   * Audio file for right leg roundhouse kick
   * @type {string}
   * @constant
   */
  REGEL_MAGAL_YAMIN: 'regel_magal_yamin.wav'
} as const;

/**
 * Current version of the fight lists data structure.
 * Used for migration and compatibility checks.
 * Should be updated whenever the fight list data structure changes.
 * @type {string}
 * @constant
 */
export const CURRENT_FIGHT_LIST_VERSION = '1.0.0';

/**
 * Keys for fight list timestamps.
 * These keys are used in the fight list metadata to track creation and modification times.
 * Each fight list must maintain these timestamps for data integrity and tracking purposes.
 * @namespace FIGHT_LIST_TIMESTAMPS
 */
export const FIGHT_LIST_TIMESTAMPS = {
  /** 
   * Key for storing the creation timestamp of a fight list.
   * This value should be set once when the fight list is created and never modified.
   * Format: ISO 8601 timestamp string
   * @type {string}
   * @constant
   * @example '2024-01-20T10:30:15.123Z'
   */
  CREATED: 'created',
  
  /** 
   * Key for storing the last modification timestamp of a fight list.
   * This value should be updated whenever the fight list content changes.
   * Format: ISO 8601 timestamp string
   * @type {string}
   * @constant
   * @example '2024-01-21T15:45:30.789Z'
   */
  LAST_MODIFIED: 'lastModified'
} as const;
