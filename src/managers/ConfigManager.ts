import { UserConfig,
         SessionConfig,
         Technique,
         ValidationResult,
         FightList, 
         FightListTechnique } from '../types'
import { STORAGE_KEYS,
         SESSION_LIMITS,
         DEFAULT_CONFIG, 
         ERROR_MESSAGES, 
         WARNING_MESSAGES, 
         PRIORITY_LEVELS, 
         FIGHT_LIST_LIMITS } from '../constants'

export class ConfigManager {
  private config: UserConfig = {
    duration: DEFAULT_CONFIG.DURATION,
    delay: DEFAULT_CONFIG.DELAY,
    volume: DEFAULT_CONFIG.VOLUME,
    techniques: [],
    lastSaved: null,
    fightLists: [],
    currentFightListId: null
  }
  private isInitialized: boolean = false

  async init(): Promise<void> {
    this.loadConfig()
    this.isInitialized = true
  }

  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEYS.KRAV_MAGA_CONFIG)
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig)
        this.config = { ...this.config, ...parsed }
        if (!parsed.fightLists) {
            this.migrateToFightLists()
        }
      } else {
        this.migrateToFightLists() 
      }
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error)
    }
  }

  private migrateToFightLists(): void {
    const techniques = this.config.techniques || []
    if (this.config.fightLists.length > 0) return;

    const defaultFightList: FightList = {
      id: crypto.randomUUID(),
      name: 'My Techniques',
      techniques: techniques.map(t => ({
        id: crypto.randomUUID(),
        techniqueId: t.name,
        priority: 3,
        selected: t.selected
      })),
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    this.config.fightLists = [defaultFightList]
    this.config.currentFightListId = defaultFightList.id
    this.saveConfig()
  }

  saveConfig(): void {
    try {
      this.config.lastSaved = new Date().toISOString()
      localStorage.setItem(STORAGE_KEYS.KRAV_MAGA_CONFIG, JSON.stringify(this.config))
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
    const currentFightList = this.getCurrentFightList()
    const techniques = currentFightList
      ? this.config.techniques.filter(tech =>
          currentFightList.techniques.some(flTech => flTech.techniqueId === tech.name && flTech.selected)
        )
      : this.config.techniques.filter(t => t.selected)

    return {
      duration: this.config.duration,
      delay: this.config.delay,
      volume: this.config.volume,
      techniques
    }
  }

  resetConfig(): void {
    this.config = {
      duration: DEFAULT_CONFIG.DURATION,
      delay: DEFAULT_CONFIG.DELAY,
      volume: DEFAULT_CONFIG.VOLUME,
      techniques: [],
      lastSaved: null,
      fightLists: [],
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

  // Fight List Methods
  getFightLists(): FightList[] {
    return this.config.fightLists
  }

  getCurrentFightListId(): string | null {
    return this.config.currentFightListId
  }

  getCurrentFightList(): FightList | undefined {
    return this.config.fightLists.find(fl => fl.id === this.config.currentFightListId)
  }

  setCurrentFightListId(id: string | null): void {
    this.config.currentFightListId = id
  }

  createFightList(name: string): ValidationResult {
    const validation = this.validateFightListName(name)
    if (!validation.isValid) {
      return validation
    }

    const newFightList: FightList = {
      id: crypto.randomUUID(),
      name,
      techniques: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    this.config.fightLists.push(newFightList)
    return { isValid: true, errors: [], warnings: [] }
  }

  updateFightList(id: string, updates: Partial<Pick<FightList, 'name'>>): ValidationResult {
    const fightList = this.config.fightLists.find(fl => fl.id === id)
    if (!fightList) {
      return { isValid: false, errors: ['Fight list not found.'], warnings: [] }
    }

    if (updates.name) {
      const validation = this.validateFightListName(updates.name, id)
      if (!validation.isValid) {
        return validation
      }
      fightList.name = updates.name
    }

    fightList.lastModified = new Date().toISOString()
    return { isValid: true, errors: [], warnings: [] }
  }

  deleteFightList(id: string): void {
    this.config.fightLists = this.config.fightLists.filter(fl => fl.id !== id)
    if (this.config.currentFightListId === id) {
      this.config.currentFightListId = this.config.fightLists.length > 0 ? this.config.fightLists[0].id : null
    }
  }

  addTechniqueToFightList(fightListId: string, techniqueId: string): void {
    const fightList = this.config.fightLists.find(fl => fl.id === fightListId)
    if (fightList && !fightList.techniques.some(t => t.techniqueId === techniqueId)) {
      const newTechnique: FightListTechnique = {
        id: crypto.randomUUID(),
        techniqueId,
        priority: 3,
        selected: true
      }
      fightList.techniques.push(newTechnique)
      fightList.lastModified = new Date().toISOString()
    }
  }

  removeTechniqueFromFightList(fightListId: string, techniqueId: string): void {
    const fightList = this.config.fightLists.find(fl => fl.id === fightListId)
    if (fightList) {
      fightList.techniques = fightList.techniques.filter(t => t.techniqueId !== techniqueId)
      fightList.lastModified = new Date().toISOString()
    }
  }

  validateFightListName(name: string, idToExclude?: string): ValidationResult {
    const errors: string[] = []
    if (name.length < FIGHT_LIST_LIMITS.MIN_NAME_LENGTH || name.length > FIGHT_LIST_LIMITS.MAX_NAME_LENGTH) {
      errors.push(`Name must be between ${FIGHT_LIST_LIMITS.MIN_NAME_LENGTH} and ${FIGHT_LIST_LIMITS.MAX_NAME_LENGTH} characters.`)
    }

    const isDuplicate = this.config.fightLists.some(
      fl => fl.name.toLowerCase() === name.toLowerCase() && fl.id !== idToExclude
    )

    if (isDuplicate) {
      errors.push('A fight list with this name already exists.')
    }

    return { isValid: errors.length === 0, errors, warnings: [] }
  }
}

