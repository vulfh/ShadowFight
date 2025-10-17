import { UserConfig, Technique, ValidationResult, SessionConfig } from '../types'
import { 
  STORAGE_KEYS, 
  SESSION_LIMITS, 
  DEFAULT_CONFIG, 
  PRIORITY_LEVELS, 
  ERROR_MESSAGES,
  WARNING_MESSAGES 
} from '../constants'

export class ConfigManager {
  private config: UserConfig = {
    duration: DEFAULT_CONFIG.DURATION,
    delay: DEFAULT_CONFIG.DELAY,
    volume: DEFAULT_CONFIG.VOLUME,
    techniques: [],
    lastSaved: null,
    currentFightListId: null
  }
  private isInitialized: boolean = false

  constructor() {}

  async init(): Promise<void> {
    await this.loadConfig()
    this.isInitialized = true
  }

  private async loadConfig(): Promise<void> {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEYS.KRAV_MAGA_CONFIG)
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig)
        // Only load the properties we want to keep in ConfigManager
        const { duration, delay, volume, techniques, lastSaved, currentFightListId } = parsed
        this.config = { 
          duration: duration ?? DEFAULT_CONFIG.DURATION,
          delay: delay ?? DEFAULT_CONFIG.DELAY,
          volume: volume ?? DEFAULT_CONFIG.VOLUME,
          techniques: techniques ?? [],
          lastSaved: lastSaved ?? null,
          currentFightListId: currentFightListId ?? null
        }
      }
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error)
    }
  }

  saveConfig(): void {
    try {
      this.config.lastSaved = new Date().toISOString()
      // Only save the properties we want to keep in ConfigManager
      const { fightLists, ...configToSave } = this.config as any
      localStorage.setItem(STORAGE_KEYS.KRAV_MAGA_CONFIG, JSON.stringify(configToSave))
    } catch (error) {
      console.error('Failed to save config to localStorage:', error)
    }
  }

  updateDuration(duration: number): void {
    this.config.duration = Math.max(SESSION_LIMITS.MIN_DURATION, Math.min(SESSION_LIMITS.MAX_DURATION, duration))
  }

  updateDelay(delay: number): void {
    this.config.delay = Math.max(SESSION_LIMITS.MIN_DELAY, Math.min(SESSION_LIMITS.MAX_DELAY, delay))
  }

  updateVolume(volume: number): void {
    this.config.volume = Math.max(SESSION_LIMITS.MIN_VOLUME, Math.min(SESSION_LIMITS.MAX_VOLUME, volume))
  }

  updateTechniqueSelection(name: string, selected: boolean): void {
    const technique = this.config.techniques.find(t => t.name === name)
    if (technique) {
      technique.selected = selected
    }
  }

  updateTechniquePriority(name: string, priority: typeof PRIORITY_LEVELS[keyof typeof PRIORITY_LEVELS]): void {
    const technique = this.config.techniques.find(t => t.name === name)
    if (technique) {
      technique.priority = priority
    }
  }

  updateTechniques(techniques: Technique[]): void {
    this.config.techniques = techniques
  }

  selectAllTechniques(): void {
    this.config.techniques.forEach(t => t.selected = true)
  }

  deselectAllTechniques(): void {
    this.config.techniques.forEach(t => t.selected = false)
  }

  getConfig(): UserConfig {
    return { ...this.config }
  }

  getSessionConfig(): SessionConfig {
    return {
      duration: this.config.duration,
      delay: this.config.delay,
      volume: this.config.volume,
      techniques: this.config.techniques.filter(t => t.selected)
    }
  }

  resetConfig(): void {
    this.config = {
      duration: DEFAULT_CONFIG.DURATION,
      delay: DEFAULT_CONFIG.DELAY,
      volume: DEFAULT_CONFIG.VOLUME,
      techniques: [],
      lastSaved: null,
      currentFightListId: null
    }
    this.saveConfig()
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2)
  }

  importConfig(configString: string): ValidationResult {
    try {
      const imported = JSON.parse(configString)
      const validation = this.validateConfig(imported)
      
      if (validation.isValid) {
        this.config = { ...this.config, ...imported }
        this.saveConfig()
      }
      
      return validation
    } catch (error) {
      return {
        isValid: false,
        errors: [ERROR_MESSAGES.INVALID_JSON_FORMAT],
        warnings: []
      }
    }
  }

  validateConfig(config?: UserConfig): ValidationResult {
    const configToValidate = config || this.config
    const errors: string[] = []
    const warnings: string[] = []

    // Validate duration
    if (configToValidate.duration < SESSION_LIMITS.MIN_DURATION || configToValidate.duration > SESSION_LIMITS.MAX_DURATION) {
      errors.push(ERROR_MESSAGES.DURATION_RANGE)
    }

    // Validate delay
    if (configToValidate.delay < SESSION_LIMITS.MIN_DELAY || configToValidate.delay > SESSION_LIMITS.MAX_DELAY) {
      errors.push(ERROR_MESSAGES.DELAY_RANGE)
    }

    // Validate volume
    if (configToValidate.volume < SESSION_LIMITS.MIN_VOLUME || configToValidate.volume > SESSION_LIMITS.MAX_VOLUME) {
      errors.push(ERROR_MESSAGES.VOLUME_RANGE)
    }

    // Validate techniques
    if (!Array.isArray(configToValidate.techniques)) {
      errors.push(ERROR_MESSAGES.TECHNIQUES_ARRAY)
    } else {
        const selectedTechniques = this.getSessionConfig().techniques;
        if (selectedTechniques.length === 0) {
            warnings.push(WARNING_MESSAGES.NO_TECHNIQUES_SELECTED);
        }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  getConfigStats(): { totalTechniques: number; selectedTechniques: number } {
    return {
      totalTechniques: this.config.techniques.length,
      selectedTechniques: this.config.techniques.filter(t => t.selected).length
    }
  }

  isReady(): boolean {
    return this.isInitialized
  }

  // Current Fight List Management
  getCurrentFightListId(): string | null {
    return this.config.currentFightListId
  }

  setCurrentFightListId(id: string | null): void {
    this.config.currentFightListId = id
    this.saveConfig()
  }
}
