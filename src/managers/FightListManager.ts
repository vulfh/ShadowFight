import { 
  FightList, 
  FightListTechnique, 
  FightListValidationResult, 
  Technique,
  ValidationResult 
} from '../types'
import { STORAGE_KEYS, FIGHT_LIST_LIMITS, ERROR_MESSAGES } from '../constants'

/**
 * Manages fight lists - collections of techniques for training sessions
 * Handles CRUD operations, validation, and storage persistence
 */
export class FightListManager {
  private fightLists: FightList[] = []
  private currentFightListId: string | null = null
  private isInitialized: boolean = false

  /**
   * Initialize the FightListManager
   * Loads fight lists from localStorage and sets up default data if needed
   */
  async init(): Promise<void> {
    try {
      this.loadFightLists()
      this.loadCurrentFightList()
      
      // Create default fight list if none exist
      if (this.fightLists.length === 0) {
        await this.createDefaultFightList()
      }
      
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize FightListManager:', error)
      throw new Error('Failed to initialize FightListManager')
    }
  }

  /**
   * Load fight lists from localStorage
   */
  private loadFightLists(): void {
    try {
      const savedFightLists = localStorage.getItem(STORAGE_KEYS.FIGHT_LISTS)
      if (savedFightLists) {
        const parsed = JSON.parse(savedFightLists)
        if (Array.isArray(parsed)) {
          this.fightLists = parsed
        }
      }
    } catch (error) {
      console.warn('Failed to load fight lists from localStorage:', error)
      this.fightLists = []
    }
  }

  /**
   * Load current fight list ID from localStorage
   */
  private loadCurrentFightList(): void {
    try {
      const savedCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT_FIGHT_LIST)
      if (savedCurrent) {
        this.currentFightListId = savedCurrent
      }
    } catch (error) {
      console.warn('Failed to load current fight list from localStorage:', error)
      this.currentFightListId = null
    }
  }

  /**
   * Save fight lists to localStorage
   */
  private saveFightLists(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FIGHT_LISTS, JSON.stringify(this.fightLists))
    } catch (error) {
      console.error('Failed to save fight lists to localStorage:', error)
      throw new Error('Failed to save fight lists')
    }
  }

  /**
   * Save current fight list ID to localStorage
   */
  private saveCurrentFightList(): void {
    try {
      if (this.currentFightListId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_FIGHT_LIST, this.currentFightListId)
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_FIGHT_LIST)
      }
    } catch (error) {
      console.error('Failed to save current fight list to localStorage:', error)
      throw new Error('Failed to save current fight list')
    }
  }

  /**
   * Create a default fight list with all available techniques
   */
  private async createDefaultFightList(): Promise<void> {
    const defaultFightList: FightList = {
      id: this.generateId(),
      name: 'My Techniques',
      techniques: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
    
    this.fightLists.push(defaultFightList)
    this.currentFightListId = defaultFightList.id
    this.saveFightLists()
    this.saveCurrentFightList()
  }

  /**
   * Generate a unique ID for fight lists and techniques
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Create a new fight list
   * @param name - Name of the fight list
   * @param techniques - Optional array of techniques to add
   * @returns The created fight list
   */
  createFightList(name: string, techniques?: Technique[]): FightList {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    const validation = this.validateFightListName(name)
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    if (this.fightLists.length >= FIGHT_LIST_LIMITS.MAX_FIGHT_LISTS) {
      throw new Error(ERROR_MESSAGES.FIGHT_LIST_MAX_REACHED)
    }

    const fightList: FightList = {
      id: this.generateId(),
      name: name.trim(),
      techniques: techniques ? this.convertTechniquesToFightListTechniques(techniques) : [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    this.fightLists.push(fightList)
    this.saveFightLists()
    
    return fightList
  }

  /**
   * Update an existing fight list
   * @param id - ID of the fight list to update
   * @param updates - Partial updates to apply
   */
  updateFightList(id: string, updates: Partial<FightList>): void {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    const fightListIndex = this.fightLists.findIndex(fl => fl.id === id)
    if (fightListIndex === -1) {
      throw new Error('Fight list not found')
    }

    // Validate name if being updated
    if (updates.name !== undefined) {
      const validation = this.validateFightListName(updates.name)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }
    }

    this.fightLists[fightListIndex] = {
      ...this.fightLists[fightListIndex],
      ...updates,
      lastModified: new Date().toISOString()
    }

    this.saveFightLists()
  }

  /**
   * Delete a fight list
   * @param id - ID of the fight list to delete
   */
  deleteFightList(id: string): void {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    if (this.fightLists.length <= 1) {
      throw new Error('Cannot delete the last remaining fight list')
    }

    const fightListIndex = this.fightLists.findIndex(fl => fl.id === id)
    if (fightListIndex === -1) {
      throw new Error('Fight list not found')
    }

    this.fightLists.splice(fightListIndex, 1)

    // Clear current fight list if it was deleted
    if (this.currentFightListId === id) {
      this.currentFightListId = this.fightLists.length > 0 ? this.fightLists[0].id : null
      this.saveCurrentFightList()
    }

    this.saveFightLists()
  }

  /**
   * Get all fight lists
   * @returns Array of all fight lists
   */
  getFightLists(): FightList[] {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    return [...this.fightLists]
  }

  /**
   * Get a specific fight list by ID
   * @param id - ID of the fight list
   * @returns The fight list or null if not found
   */
  getFightList(id: string): FightList | null {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    return this.fightLists.find(fl => fl.id === id) || null
  }

  /**
   * Set the current active fight list
   * @param id - ID of the fight list to set as current
   */
  setCurrentFightList(id: string | null): void {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    if (id !== null) {
      const fightList = this.getFightList(id)
      if (!fightList) {
        throw new Error('Fight list not found')
      }
    }

    this.currentFightListId = id
    this.saveCurrentFightList()
  }

  /**
   * Get the current active fight list
   * @returns The current fight list or null if none set
   */
  getCurrentFightList(): FightList | null {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    return this.currentFightListId ? this.getFightList(this.currentFightListId) : null
  }

  /**
   * Add a technique to a fight list
   * @param fightListId - ID of the fight list
   * @param technique - Technique to add
   * @param priority - Priority level (1-5)
   */
  addTechniqueToFightList(fightListId: string, technique: Technique, priority: number = 3): void {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    const fightList = this.getFightList(fightListId)
    if (!fightList) {
      throw new Error('Fight list not found')
    }

    if (fightList.techniques.length >= FIGHT_LIST_LIMITS.MAX_TECHNIQUES_PER_LIST) {
      throw new Error(ERROR_MESSAGES.MAX_TECHNIQUES_PER_LIST_REACHED)
    }

    // Check if technique already exists in fight list
    const existingTechnique = fightList.techniques.find(ft => ft.techniqueId === technique.name)
    if (existingTechnique) {
      throw new Error('Technique already exists in fight list')
    }

    const fightListTechnique: FightListTechnique = {
      id: this.generateId(),
      techniqueId: technique.name,
      priority: Math.max(1, Math.min(5, priority)),
      selected: true
    }

    fightList.techniques.push(fightListTechnique)
    fightList.lastModified = new Date().toISOString()
    
    this.saveFightLists()
  }

  /**
   * Remove a technique from a fight list
   * @param fightListId - ID of the fight list
   * @param techniqueId - ID of the technique to remove
   */
  removeTechniqueFromFightList(fightListId: string, techniqueId: string): void {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    const fightList = this.getFightList(fightListId)
    if (!fightList) {
      throw new Error('Fight list not found')
    }

    const techniqueIndex = fightList.techniques.findIndex(ft => ft.id === techniqueId)
    if (techniqueIndex === -1) {
      throw new Error('Technique not found in fight list')
    }

    fightList.techniques.splice(techniqueIndex, 1)
    fightList.lastModified = new Date().toISOString()
    
    this.saveFightLists()
  }

  /**
   * Validate a fight list name
   * @param name - Name to validate
   * @returns Validation result
   */
  validateFightListName(name: string): FightListValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!name || typeof name !== 'string') {
      errors.push('Fight list name is required')
      return { isValid: false, errors, warnings }
    }

    const trimmedName = name.trim()

    if (trimmedName.length < FIGHT_LIST_LIMITS.MIN_NAME_LENGTH) {
      errors.push(`Fight list name must be at least ${FIGHT_LIST_LIMITS.MIN_NAME_LENGTH} character long`)
    }

    if (trimmedName.length > FIGHT_LIST_LIMITS.MAX_NAME_LENGTH) {
      errors.push(`Fight list name must be no more than ${FIGHT_LIST_LIMITS.MAX_NAME_LENGTH} characters long`)
    }

    // Check for special characters (allow spaces, hyphens, underscores)
    const validNamePattern = /^[a-zA-Z0-9\s\-_]+$/
    if (!validNamePattern.test(trimmedName)) {
      errors.push('Fight list name can only contain letters, numbers, spaces, hyphens, and underscores')
    }

    // Check for uniqueness (case-insensitive)
    const existingFightList = this.fightLists.find(fl => 
      fl.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (existingFightList) {
      errors.push('A fight list with this name already exists')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Export all fight lists as JSON string
   * @returns JSON string of all fight lists
   */
  exportFightLists(): string {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    return JSON.stringify(this.fightLists, null, 2)
  }

  /**
   * Import fight lists from JSON string
   * @param data - JSON string containing fight lists
   * @returns Validation result
   */
  importFightLists(data: string): ValidationResult {
    if (!this.isInitialized) {
      throw new Error('FightListManager not initialized')
    }

    try {
      const importedFightLists = JSON.parse(data)
      
      if (!Array.isArray(importedFightLists)) {
        return {
          isValid: false,
          errors: ['Invalid data format. Expected array of fight lists'],
          warnings: []
        }
      }

      // Validate each fight list
      const errors: string[] = []
      const warnings: string[] = []

      for (const fightList of importedFightLists) {
        if (!fightList.id || !fightList.name) {
          errors.push('Invalid fight list: missing required fields')
          continue
        }

        const nameValidation = this.validateFightListName(fightList.name)
        if (!nameValidation.isValid) {
          errors.push(`Invalid fight list "${fightList.name}": ${nameValidation.errors.join(', ')}`)
        }
      }

      if (errors.length > 0) {
        return { isValid: false, errors, warnings }
      }

      // Replace existing fight lists
      this.fightLists = importedFightLists
      this.saveFightLists()

      return { isValid: true, errors: [], warnings }
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid JSON format'],
        warnings: []
      }
    }
  }

  /**
   * Convert Technique objects to FightListTechnique objects
   * @param techniques - Array of techniques to convert
   * @returns Array of fight list techniques
   */
  private convertTechniquesToFightListTechniques(techniques: Technique[]): FightListTechnique[] {
    return techniques.map(technique => ({
      id: this.generateId(),
      techniqueId: technique.name,
      priority: this.mapPriorityToNumber(technique.priority),
      selected: technique.selected
    }))
  }

  /**
   * Map priority level string to number
   * @param priority - Priority level string
   * @returns Priority number (1-5)
   */
  private mapPriorityToNumber(priority: string): number {
    switch (priority.toLowerCase()) {
      case 'low': return 1
      case 'medium': return 3
      case 'high': return 5
      default: return 3
    }
  }

  /**
   * Check if the manager is ready
   * @returns True if initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }
}
