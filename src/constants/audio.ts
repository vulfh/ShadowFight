/**
 * Audio-related constants for the Krav Maga Shadow Fighting Trainer
 */

import { Mode } from '../types'
import { MODES } from './modes'

/**
 * Custom error class for audio-related errors
 */
export class AudioError extends Error {
  public readonly type: string
  public readonly filename?: string
  public readonly originalError?: Error

  constructor(
    message: string,
    type: string = 'unknown',
    filename?: string,
    originalError?: Error
  ) {
    super(message)
    this.name = 'AudioError'
    this.type = type
    this.filename = filename
    this.originalError = originalError
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AudioError)
    }
  }

  /**
   * Check if this error is retryable based on its type
   */
  isRetryable(): boolean {
    return AUDIO_RETRY_CONFIG.RETRYABLE_ERRORS.includes(this.message as any)
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case AUDIO_ERROR_TYPES.NETWORK:
        return 'Network connection issue. Please check your internet connection.'
      case AUDIO_ERROR_TYPES.DECODE:
        return 'Audio file format is not supported or corrupted.'
      case AUDIO_ERROR_TYPES.PLAYBACK:
        return 'Unable to play audio. Please try again.'
      case AUDIO_ERROR_TYPES.PERMISSION:
        return 'Audio playback permission denied. Please allow audio in your browser.'
      case AUDIO_ERROR_TYPES.INITIALIZATION:
        return 'Audio system initialization failed. Please refresh the page.'
      case AUDIO_ERROR_TYPES.TIMEOUT:
        return 'Audio loading timed out. Please try again.'
      default:
        return 'An audio error occurred. Please try again.'
    }
  }
}

/**
 * Instruction audio file paths for different fight list modes
 */
export const INSTRUCTION_AUDIO_FILES = {
  [MODES.PERFORMING]: '/Sounds/instruction-for-performer.wav',
  [MODES.RESPONDING]: '/Sounds/instruction-for-responder.wav'
} as const

/**
 * Audio file validation and utility functions
 */
export const AUDIO_CONFIG = {
  /**
   * Base path for all audio files
   */
  BASE_PATH: '/Sounds/',
  
  /**
   * Supported audio formats
   */
  SUPPORTED_FORMATS: ['wav', 'mp3', 'ogg'] as const,
  
  /**
   * Default audio settings
   */
  DEFAULT_VOLUME: 0.8,
  MIN_VOLUME: 0.0,
  MAX_VOLUME: 1.0,
  
  /**
   * Audio loading timeout in milliseconds
   */
  LOAD_TIMEOUT: 5000,
  
  /**
   * Audio preload strategy
   */
  PRELOAD_STRATEGY: 'metadata' as const
} as const

/**
 * Audio error messages
 */
export const AUDIO_ERRORS = {
  FILE_NOT_FOUND: 'Audio file not found',
  LOAD_FAILED: 'Failed to load audio file',
  PLAYBACK_FAILED: 'Audio playback failed',
  UNSUPPORTED_FORMAT: 'Unsupported audio format',
  NETWORK_ERROR: 'Network error while loading audio',
  PERMISSION_DENIED: 'Audio playback permission denied',
  CONTEXT_NOT_INITIALIZED: 'AudioContext not initialized',
  DECODE_FAILED: 'Failed to decode audio data',
  BUFFER_SOURCE_FAILED: 'Failed to create audio buffer source',
  GAIN_NODE_FAILED: 'Failed to create gain node',
  CONNECTION_FAILED: 'Failed to connect audio nodes',
  INVALID_VOLUME: 'Invalid volume value',
  TIMEOUT: 'Audio operation timed out',
  SUSPENDED_CONTEXT: 'AudioContext is suspended'
} as const

/**
 * Audio error types for categorizing different failure modes
 */
export const AUDIO_ERROR_TYPES = {
  NETWORK: 'network',
  DECODE: 'decode',
  PLAYBACK: 'playback',
  PERMISSION: 'permission',
  INITIALIZATION: 'initialization',
  VALIDATION: 'validation',
  TIMEOUT: 'timeout'
} as const

/**
 * Audio retry configuration
 */
export const AUDIO_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
  BACKOFF_MULTIPLIER: 2,
  RETRYABLE_ERRORS: [
    AUDIO_ERRORS.NETWORK_ERROR,
    AUDIO_ERRORS.TIMEOUT,
    AUDIO_ERRORS.SUSPENDED_CONTEXT
  ]
} as const

/**
 * Audio event types
 */
export const AUDIO_EVENTS = {
  LOADED: 'audioloaded',
  STARTED: 'audiostarted',
  COMPLETED: 'audiocompleted',
  ERROR: 'audioerror',
  PAUSED: 'audiopaused',
  RESUMED: 'audioresumed'
} as const

/**
 * Get instruction audio file path for a given mode
 * @param mode - The fight list mode (PERFORMING or RESPONDING)
 * @returns The file path for the instruction audio
 */
export function getInstructionAudioPath(mode: Mode): string {
  return INSTRUCTION_AUDIO_FILES[mode]
}

/**
 * Validate if an audio file path exists in the instruction files
 * @param filePath - The file path to validate
 * @returns True if the file path is a valid instruction audio file
 */
export function isValidInstructionAudioPath(filePath: string): boolean {
  return Object.values(INSTRUCTION_AUDIO_FILES).includes(filePath as any)
}

/**
 * Get all instruction audio file paths
 * @returns Array of all instruction audio file paths
 */
export function getAllInstructionAudioPaths(): string[] {
  return Object.values(INSTRUCTION_AUDIO_FILES)
}

/**
 * Get the mode for a given instruction audio file path
 * @param filePath - The file path to get the mode for
 * @returns The mode associated with the file path, or null if not found
 */
export function getModeForInstructionAudio(filePath: string): Mode | null {
  for (const [mode, path] of Object.entries(INSTRUCTION_AUDIO_FILES)) {
    if (path === filePath) {
      return mode as Mode
    }
  }
  return null
}

/**
 * Sleep utility for retry delays
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry an async operation with exponential backoff
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @param backoffMultiplier - Multiplier for exponential backoff
 * @returns Promise that resolves with the operation result
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = AUDIO_RETRY_CONFIG.MAX_RETRIES,
  baseDelay: number = AUDIO_RETRY_CONFIG.RETRY_DELAY,
  backoffMultiplier: number = AUDIO_RETRY_CONFIG.BACKOFF_MULTIPLIER
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Check if error is retryable
      if (error instanceof AudioError && !error.isRetryable()) {
        break
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(backoffMultiplier, attempt)
      await sleep(delay)
    }
  }
  
  throw lastError!
}

/**
 * Create an AudioError from a generic error
 * @param error - The original error
 * @param filename - Optional filename context
 * @returns AudioError instance
 */
export function createAudioError(error: unknown, filename?: string): AudioError {
  if (error instanceof AudioError) {
    return error
  }
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  let type: string = AUDIO_ERROR_TYPES.PLAYBACK
  let message: string = AUDIO_ERRORS.PLAYBACK_FAILED
  
  // Categorize error based on message content
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('NetworkError')) {
    type = AUDIO_ERROR_TYPES.NETWORK
    message = AUDIO_ERRORS.NETWORK_ERROR
  } else if (errorMessage.includes('decode') || errorMessage.includes('DecodeError')) {
    type = AUDIO_ERROR_TYPES.DECODE
    message = AUDIO_ERRORS.DECODE_FAILED
  } else if (errorMessage.includes('permission') || errorMessage.includes('NotAllowedError')) {
    type = AUDIO_ERROR_TYPES.PERMISSION
    message = AUDIO_ERRORS.PERMISSION_DENIED
  } else if (errorMessage.includes('timeout') || errorMessage.includes('TimeoutError')) {
    type = AUDIO_ERROR_TYPES.TIMEOUT
    message = AUDIO_ERRORS.TIMEOUT
  } else if (errorMessage.includes('AudioContext') || errorMessage.includes('not initialized')) {
    type = AUDIO_ERROR_TYPES.INITIALIZATION
    message = AUDIO_ERRORS.CONTEXT_NOT_INITIALIZED
  }
  
  return new AudioError(
    message,
    type,
    filename,
    error instanceof Error ? error : undefined
  )
}