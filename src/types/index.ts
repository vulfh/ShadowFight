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

export type TargetLevel = 'HEAD' | 'NECK' | 'CHEST' | 'STOMACH' | 'GROIN' | 'HIP' | 'SHIN' | 'BACK' | 'FOOT'

export type Side = 'LEFT' | 'RIGHT'

export type TechniqueCategory = 
  | 'Punches'
  | 'Strikes'
  | 'Kicks'
  | 'Knees'
  | 'Defenses/Grabs'
  | 'Weapons'
  | 'Hand-Grip'
  |'Knife'

export type PriorityLevel = 'high' | 'medium' | 'low'

// Fight List Types
export interface FightList {
  id: string
  name: string
  techniques: FightListTechnique[]
  createdAt: string
  lastModified: string
}

export type FightListTechnique = {
  id: string
  techniqueId: string
  priority: number // 1-5 scale
  selected: boolean
}

export type FightListManager = {
  fightLists: FightList[]
  currentFightList: string | null
}

// UI State Extensions (using type for data structure)
export type FightListUIState = {
  isCreating: boolean
  isEditing: boolean
  selectedFightList: string | null
  expandedFightLists: string[]
}

// Fight List Validation
export interface FightListValidationResult extends ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Fight List Events
export interface FightListEvent {
  type: 'created' | 'updated' | 'deleted' | 'techniqueAdded' | 'techniqueRemoved'
  fightListId: string
  timestamp: number
  data?: any
}

// Event Flow Contracts
export interface FightListUICallbacks {
  onCreateFightList: (name: string) => Promise<FightList>
  onUpdateFightList: (id: string, updates: Partial<FightList>) => Promise<void>
  onDeleteFightList: (id: string) => Promise<void>
  onSetCurrentFightList: (id: string | null) => Promise<void>
  onAddTechnique: (fightListId: string, technique: Technique, priority: number) => Promise<void>
  onRemoveTechnique: (fightListId: string, techniqueId: string) => Promise<void>
  onShowTechniqueModal: (fightListId: string) => void
  onValidateFightListName: (name: string) => FightListValidationResult
}

export interface FightListManagerCallbacks {
  onFightListsChanged: (fightLists: FightList[]) => void
  onCurrentFightListChanged: (fightListId: string | null) => void
  onFightListExpanded: (fightListId: string, expanded: boolean) => void
  onNotification: (options: NotificationOptions) => void
}

export interface SessionUICallbacks {
  onSessionStarted: (fightListId?: string) => void
  onSessionStopped: () => void
  onSessionPaused: () => void
  onSessionResumed: () => void
  onSessionCompleted: () => void
  onTechniqueAnnounced: (technique: Technique) => void
}

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
  currentFightListId: string | null
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
