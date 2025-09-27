import { FightList, FightListValidationResult } from '../types'
import { STORAGE_KEYS, CURRENT_FIGHT_LIST_VERSION } from '../constants/storage'

/**
 * Service class for handling fight list storage operations in localStorage
 */
export class StorageService {
  private readonly COMPRESSION_THRESHOLD = 1024 * 10 // 10KB
  private readonly MAX_STORAGE_SIZE = 1024 * 1024 * 5 // 5MB
  private readonly BATCH_SIZE = 10
  private compressionEnabled = true

  constructor(options: { compressionEnabled?: boolean } = {}) {
    this.compressionEnabled = options.compressionEnabled ?? true
  }

  /**
   * Saves a fight list to localStorage with optional compression
   * @param fightList The fight list to save
   * @returns true if save was successful, false otherwise
   * @throws Error if storage quota is exceeded or validation fails
   */
  public saveFightList(fightList: FightList): boolean {
    try {
      // Validate storage quota before saving
      if (!this.hasAvailableStorage()) {
        throw new Error('Storage quota exceeded. Please delete some fight lists.')
      }

      // Get existing fight lists
      const existingLists = this.getAllFightLists()
      
      // Update lastModified timestamp
      const updatedFightList = {
        ...fightList,
        lastModified: new Date().toISOString()
      }

      // Find and replace existing fight list or add new one
      const listIndex = existingLists.findIndex(list => list.id === fightList.id)
      if (listIndex >= 0) {
        existingLists[listIndex] = updatedFightList
      } else {
        existingLists.push(updatedFightList)
      }

      // Save with compression if needed
      this.saveWithCompression(STORAGE_KEYS.FIGHT_LISTS, existingLists)
      
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete some fight lists.')
      }
      throw error
    }
  }

  /**
   * Saves multiple fight lists in a batch operation
   * @param fightLists Array of fight lists to save
   * @returns Number of successfully saved fight lists
   */
  public saveFightListsBatch(fightLists: FightList[]): number {
    let savedCount = 0
    
    // Process in batches
    for (let i = 0; i < fightLists.length; i += this.BATCH_SIZE) {
      const batch = fightLists.slice(i, i + this.BATCH_SIZE)
      
      try {
        const existingLists = this.getAllFightLists()
        const updatedLists = [...existingLists]
        
        // Update each fight list in the batch
        batch.forEach(fightList => {
          const index = updatedLists.findIndex(list => list.id === fightList.id)
          const updatedFightList = {
            ...fightList,
            lastModified: new Date().toISOString()
          }
          
          if (index >= 0) {
            updatedLists[index] = updatedFightList
          } else {
            updatedLists.push(updatedFightList)
          }
          savedCount++
        })
        
        // Save the batch
        this.saveWithCompression(STORAGE_KEYS.FIGHT_LISTS, updatedLists)
      } catch (error) {
        console.error('Error saving batch:', error)
        break // Stop processing on error
      }
    }
    
    return savedCount
  }

  /**
   * Retrieves a specific fight list by ID
   * @param id The ID of the fight list to retrieve
   * @returns The fight list if found, null otherwise
   */
  public getFightList(id: string): FightList | null {
    try {
      const fightLists = this.getAllFightLists()
      return fightLists.find(list => list.id === id) || null
    } catch (error) {
      console.error('Error retrieving fight list:', error)
      return null
    }
  }

  /**
   * Retrieves all fight lists from localStorage
   * @returns Array of fight lists
   */
  public getAllFightLists(): FightList[] {
    try {
      const data = this.getWithDecompression(STORAGE_KEYS.FIGHT_LISTS)
      if (!data) {
        return []
      }

      const lists = JSON.parse(data)
      if (!Array.isArray(lists)) {
        console.error('Invalid fight lists data structure')
        return []
      }

      return lists
    } catch (error) {
      console.error('Error retrieving fight lists:', error)
      return []
    }
  }

  /**
   * Deletes a fight list by ID
   * @param id The ID of the fight list to delete
   * @returns true if deletion was successful, false otherwise
   */
  public deleteFightList(id: string): boolean {
    try {
      const fightLists = this.getAllFightLists()
      const filteredLists = fightLists.filter(list => list.id !== id)
      
      // If no lists were removed, return false
      if (filteredLists.length === fightLists.length) {
        return false
      }

      this.saveWithCompression(STORAGE_KEYS.FIGHT_LISTS, filteredLists)

      // If the deleted list was the current list, clear the current list
      const currentListId = localStorage.getItem(STORAGE_KEYS.CURRENT_FIGHT_LIST)
      if (currentListId === id) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_FIGHT_LIST)
      }

      return true
    } catch (error) {
      console.error('Error deleting fight list:', error)
      return false
    }
  }

  /**
   * Sets the current fight list
   * @param id The ID of the fight list to set as current
   * @returns true if successful, false if the fight list doesn't exist
   */
  public setCurrentFightList(id: string): boolean {
    try {
      // Verify the fight list exists
      const fightList = this.getFightList(id)
      if (!fightList) {
        return false
      }

      localStorage.setItem(STORAGE_KEYS.CURRENT_FIGHT_LIST, id)
      return true
    } catch (error) {
      console.error('Error setting current fight list:', error)
      return false
    }
  }

  /**
   * Gets the current fight list
   * @returns The current fight list or null if none is set
   */
  public getCurrentFightList(): FightList | null {
    try {
      const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_FIGHT_LIST)
      if (!currentId) {
        return null
      }

      return this.getFightList(currentId)
    } catch (error) {
      console.error('Error getting current fight list:', error)
      return null
    }
  }

  /**
   * Gets the current storage usage in bytes
   * @returns The current storage usage in bytes
   */
  public getStorageUsage(): number {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        total += localStorage.getItem(key)?.length ?? 0
      }
    }
    return total
  }

  /**
   * Checks if there's enough storage space available
   * @param additionalBytes Optional number of bytes to check for
   * @returns true if space is available, false otherwise
   */
  private hasAvailableStorage(additionalBytes = 0): boolean {
    const currentUsage = this.getStorageUsage()
    return (currentUsage + additionalBytes) <= this.MAX_STORAGE_SIZE
  }

  /**
   * Saves data with compression if needed
   * @param key Storage key
   * @param data Data to save
   */
  private saveWithCompression(key: string, data: any): void {
    const jsonString = JSON.stringify(data)
    
    if (this.compressionEnabled && jsonString.length > this.COMPRESSION_THRESHOLD) {
      const compressed = this.compress(jsonString)
      localStorage.setItem(key, compressed)
    } else {
      localStorage.setItem(key, jsonString)
    }
  }

  /**
   * Retrieves and decompresses data if needed
   * @param key Storage key
   * @returns Decompressed data or null
   */
  private getWithDecompression(key: string): string | null {
    const data = localStorage.getItem(key)
    if (!data) return null

    if (this.isCompressed(data)) {
      return this.decompress(data)
    }
    return data
  }

  /**
   * Simple compression using base64 and a flag
   * @param data Data to compress
   * @returns Compressed string
   */
  private compress(data: string): string {
    try {
      const compressed = btoa(encodeURIComponent(data))
      return `C:${compressed}` // Add compression flag
    } catch {
      return data // Fallback to uncompressed on error
    }
  }

  /**
   * Decompresses data if it was compressed
   * @param data Data to decompress
   * @returns Decompressed string
   */
  private decompress(data: string): string {
    if (!this.isCompressed(data)) return data
    
    try {
      const compressed = data.slice(2) // Remove compression flag
      return decodeURIComponent(atob(compressed))
    } catch {
      return data // Return original on error
    }
  }

  /**
   * Checks if data is compressed
   * @param data Data to check
   * @returns true if compressed, false otherwise
   */
  private isCompressed(data: string): boolean {
    return data.startsWith('C:')
  }

  /**
   * Validates fight list data structure version
   * @returns true if version is current, false otherwise
   * @todo Implement version checking in data migration system
   * @ts-ignore 
   */
  private validateVersion(): boolean {
    const version = localStorage.getItem(STORAGE_KEYS.FIGHT_LIST_VERSION)
    return version === CURRENT_FIGHT_LIST_VERSION
  }

  /**
   * Validates a fight list's data structure
   * @param fightList The fight list to validate
   * @returns Validation result
   * @ts-ignore
   */
  public validateFightList(fightList: any): FightListValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required fields
    if (!fightList.id) errors.push('Fight list must have an ID')
    if (!fightList.name) errors.push('Fight list must have a name')
    if (!Array.isArray(fightList.techniques)) {
      errors.push('Fight list must have a techniques array')
    }

    // Timestamps
    if (!fightList.createdAt) errors.push('Fight list must have a creation timestamp')
    if (!fightList.lastModified) warnings.push('Fight list should have a last modified timestamp')

    // Validate techniques
    if (fightList.techniques) {
      fightList.techniques.forEach((technique: any, index: number) => {
        if (!technique.id) errors.push(`Technique at index ${index} must have an ID`)
        if (!technique.techniqueId) errors.push(`Technique at index ${index} must have a technique ID`)
        if (typeof technique.priority !== 'number' || technique.priority < 1 || technique.priority > 5) {
          errors.push(`Technique at index ${index} must have a priority between 1 and 5`)
        }
        if (typeof technique.selected !== 'boolean') {
          errors.push(`Technique at index ${index} must have a selected state`)
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}