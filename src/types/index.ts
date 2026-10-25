import { Mode } from '../constants/modes'
import { PlayMode } from './playMode'

// Re-export Mode type for convenience
export type { Mode }

// ---------------------------------------------------------------------------
// Expertise Level — Req 1.1, 1.2, 1.3
// ---------------------------------------------------------------------------

/** Ordered belt-grade progression from beginner to advanced. */
export type ExpertiseLevel =
  | 'yellow'
  | 'orange'
  | 'green'
  | 'blue'
  | 'brown'
  | 'black-dan-1'

/**
 * Authoritative ordered list of expertise levels — lowest first.
 * All rank comparisons, filter predicates, badge renderers, and UI option
 * lists MUST derive their data from this array (Req 10.1).
 */
export const EXPERTISE_LEVELS: readonly ExpertiseLevel[] = [
  'yellow', 'orange', 'green', 'blue', 'brown', 'black-dan-1',
]

/**
 * Returns the 0-based rank of `level` within `EXPERTISE_LEVELS`.
 * Returns 0 (yellow rank) for any unrecognised / missing value so that
 * defensive code paths treat unknown techniques as the lowest grade (Req 2.3).
 */
export function expertiseLevelRank(level: ExpertiseLevel | string): number {
  const idx = EXPERTISE_LEVELS.indexOf(level as ExpertiseLevel)
  return idx === -1 ? 0 : idx
}

// ---------------------------------------------------------------------------
// Technique-related types
// ---------------------------------------------------------------------------

export interface Technique {
  name: string
  file: string
  category: TechniqueCategory
  priority: PriorityLevel
  selected: boolean
  weight: number
  targetLevel: TargetLevel
  side: Side
  modes?: Mode[]
  /** Belt/grade level at which this technique is introduced — Req 2.1 */
  expertiseLevel: ExpertiseLevel
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
  | 'Knife'
  | 'Slip'
  | 'Defence'
  | 'Knee-Protection'
  | 'Take Down'
  | 'Elbow Strike'
  | 'Choke'
export type PriorityLevel = 'high' | 'medium' | 'low'

// Fight List Types
export interface FightList {
  id: string
  name: string
  techniques: FightListTechnique[]
  createdAt: string
  lastModified: string
  mode?: Mode
}

export type FightListTechnique = {
  id: string
  techniqueId: string
  priority: number // 1-5 scale
  selected: boolean
}

/**
 * Represents a single named fight-test configuration (adhoc today, named list in future).
 * The 'adhoc' record has id='adhoc' and name='Adhoc'.
 *
 * Migration note: when named Fight Tests are introduced, this type is unchanged —
 * a FightTestManager will manage a list of these records.
 */
export interface FightTest {
  /** Unique identifier. 'adhoc' for the single adhoc configuration. */
  id: string
  /** Display name. 'Adhoc' for the single adhoc configuration. */
  name: string
  /** Selected training mode. null means not yet chosen. */
  mode: Mode | null
  /** Empty array means "any target level". */
  targetLevels: TargetLevel[]
  /** Empty array means "any category". */
  categories: TechniqueCategory[]
  /** null or 'BOTH' means no side restriction. */
  side: Side | 'BOTH' | null
  /** Technique ordering strategy for the session. Defaults to 'Random'. */
  shuffleMode: PlayMode
  /**
   * Selected expertise-level filter. null means "any level" (no restriction) — Req 3.5 / 1.5.
   */
  expertiseLevel: ExpertiseLevel | null
  /**
   * Filter mode used when expertiseLevel is non-null.
   * 'strict'     — match only the selected level exactly.
   * 'cumulative' — match the selected level and all levels ranked below it.
   * Ignored when expertiseLevel is null.
   */
  expertiseLevelMode: 'strict' | 'cumulative'
}

/**
 * The subset of FightTest that the filter form owns.
 * Excludes identity fields (id, name) so the form has no opinion about record identity.
 * Converting form values to a FightTest is a trivial spread: { id, name, ...values }.
 */
export type FightTestFilterValues = Omit<FightTest, 'id' | 'name'>

export interface VoiceNote {
  id: string
  techniqueId: string
  mode: Mode
  title: string
  storageKey: string
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
  expandedNotesSections: string[]
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
  playNotes: boolean
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
  isPlayingInstructionAudio: boolean
  isWaitingForInstructionCompletion: boolean
  instructionAudioCompleted: boolean
  instructionAudioPlayedThisSession: boolean
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
