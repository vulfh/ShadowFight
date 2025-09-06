// Technique-related types
export interface Technique {
  name: string
  file: string
  category: TechniqueCategory
  priority: PriorityLevel
  selected: boolean
  weight: number
  targetLevel: TargetLevel
  side: Side
}

export type TargetLevel = 'HEAD' | 'NECK' | 'CHEST' | 'STOMACH' | 'GROIN' | 'HIP' | 'SHIN'

export type Side = 'LEFT' | 'RIGHT'

export type TechniqueCategory = 
  | 'Punches'
  | 'Strikes'
  | 'Kicks'
  | 'Knees'
  | 'Defenses/Grabs'
  | 'Weapons'

export type PriorityLevel = 'high' | 'medium' | 'low'

// Configuration types
export interface SessionConfig {
  duration: number // minutes
  delay: number // seconds
  volume: number // percentage
  techniques: Technique[]
}

export interface UserConfig {
  duration: number
  delay: number
  volume: number
  techniques: Technique[]
  lastSaved: string | null
}

// Session types
export interface SessionStats {
  totalTechniques: number
  techniquesByCategory: Record<TechniqueCategory, number>
  sessionDuration: number
}

export interface SessionStatus {
  isActive: boolean
  isPaused: boolean
  remainingTime: number
  sessionDuration: number
  currentTechnique: Technique | null
  techniquesUsed: number
  sessionStats: SessionStats
}

// Audio types
export interface AudioBuffer {
  duration: number
  numberOfChannels: number
  sampleRate: number
}

export interface AudioSource {
  source: AudioBufferSourceNode
  gainNode: GainNode
}

// Event types
export interface SessionEvent {
  type: 'start' | 'pause' | 'stop' | 'complete'
  timestamp: number
  data?: any
}

export interface TechniqueEvent {
  type: 'announced' | 'completed'
  technique: Technique
  timestamp: number
}

// UI types
export interface NotificationOptions {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export interface UIState {
  isConfiguring: boolean
  isTraining: boolean
  isLoading: boolean
  error: string | null
}

// PWA types
export interface PWAConfig {
  name: string
  shortName: string
  description: string
  themeColor: string
  backgroundColor: string
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'
}

// Validation types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// API types
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
