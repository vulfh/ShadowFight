import { FightList } from '../types'
import { StorageService } from './StorageService'
import { 
  STORAGE_KEYS, 
  MIGRATION_KEYS,
  CURRENT_FIGHT_LIST_VERSION 
} from '../constants/storage'
import { FIGHTLIST_MODES, TECHNIQUE_MODES } from '../constants/modes'
import { TechniqueManager } from '../managers/TechniqueManager'

/**
 * Pre-migration fightlist schema (without mode field)
 */
export interface PreMigrationFightList {
  id: string
  name: string
  techniques: Array<{
    id: string
    techniqueId: string
    priority: number
    selected: boolean
  }>
  createdAt: string
  lastModified: string
}

/**
 * Post-migration fightlist schema (with mode field)
 */
export interface PostMigrationFightList extends FightList {
  mode: 'PERFORMING' | 'RESPONDING'
  migrationTimestamp?: string
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean
  migratedFightLists: number
  migratedTechniques: number
  errors: string[]
  warnings: string[]
  timestamp: string
}

/**
 * Service for handling data migrations
 * Manages migration of fightlists and techniques to support the mode system
 */
export class MigrationService {
  private storageService: StorageService
  private techniqueManager: TechniqueManager | null = null

  constructor(storageService?: StorageService) {
    this.storageService = storageService || new StorageService()
  }

  /**
   * Set the technique manager for technique migrations
   * @param techniqueManager The TechniqueManager instance
   */
  setTechniqueManager(techniqueManager: TechniqueManager): void {
    this.techniqueManager = techniqueManager
  }

  /**
   * Check if migration is needed
   * @returns True if migration is needed, false otherwise
   */
  needsMigration(): boolean {
    try {
      const currentVersion = localStorage.getItem(STORAGE_KEYS.FIGHT_LIST_VERSION)
      const migrationVersion = localStorage.getItem(MIGRATION_KEYS.MIGRATION_VERSION)
      
      // If no version is set, migration is needed
      if (!currentVersion && !migrationVersion) {
        return true
      }
      
      // If versions don't match current, migration is needed
      const storedVersion = migrationVersion || currentVersion
      return storedVersion !== CURRENT_FIGHT_LIST_VERSION
    } catch (error) {
      console.error('Error checking migration status:', error)
      return false
    }
  }

  /**
   * Get the current migration version
   * @returns The current migration version or null if not set
   */
  getMigrationVersion(): string | null {
    try {
      return localStorage.getItem(MIGRATION_KEYS.MIGRATION_VERSION) || 
             localStorage.getItem(STORAGE_KEYS.FIGHT_LIST_VERSION)
    } catch (error) {
      console.error('Error getting migration version:', error)
      return null
    }
  }

  /**
   * Migrate fightlists to support modes
   * All existing fightlists are migrated to RESPONDING mode
   * @returns Migration result
   */
  migrateFightListsToModes(): MigrationResult {
    const result: MigrationResult = {
      success: false,
      migratedFightLists: 0,
      migratedTechniques: 0,
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      console.log('Starting fightlist migration to mode system...')
      
      // Get all fightlists from storage
      const fightLists = this.storageService.getAllFightLists()
      
      if (fightLists.length === 0) {
        console.log('No fightlists to migrate')
        result.success = true
        return result
      }

      // Create backup before migration
      this.createBackup(fightLists)

      // Migrate each fightlist
      const migratedLists: FightList[] = []
      
      for (const fightList of fightLists) {
        try {
          // Check if already migrated (has mode field)
          if ('mode' in fightList && (fightList.mode === 'PERFORMING' || fightList.mode === 'RESPONDING')) {
            // Already migrated, skip
            migratedLists.push(fightList as FightList)
            continue
          }

          // Migrate to RESPONDING mode (as per requirements)
          const migratedList: PostMigrationFightList = {
            ...fightList,
            mode: FIGHTLIST_MODES.RESPONDING,
            migrationTimestamp: result.timestamp
          }

          migratedLists.push(migratedList)
          result.migratedFightLists++
        } catch (error) {
          const errorMsg = `Failed to migrate fightlist ${fightList.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(errorMsg, error)
        }
      }

      // Save migrated fightlists
      if (migratedLists.length > 0) {
        // Use batch save for better performance
        const savedCount = this.storageService.saveFightListsBatch(migratedLists)
        if (savedCount !== migratedLists.length) {
          result.warnings.push(`Only ${savedCount} of ${migratedLists.length} fightlists were saved`)
        }
      }

      // Update migration version
      localStorage.setItem(MIGRATION_KEYS.MIGRATION_VERSION, CURRENT_FIGHT_LIST_VERSION)
      localStorage.setItem(STORAGE_KEYS.FIGHT_LIST_VERSION, CURRENT_FIGHT_LIST_VERSION)
      localStorage.setItem(MIGRATION_KEYS.LAST_MIGRATION_TIMESTAMP, result.timestamp)

      result.success = result.errors.length === 0
      console.log(`Fightlist migration completed: ${result.migratedFightLists} fightlists migrated`)
      
      return result
    } catch (error) {
      const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMsg)
      console.error(errorMsg, error)
      result.success = false
      return result
    }
  }

  /**
   * Migrate techniques to support modes
   * All existing techniques default to support both modes
   * @returns Migration result
   */
  migrateTechniquesToModes(): MigrationResult {
    const result: MigrationResult = {
      success: false,
      migratedFightLists: 0,
      migratedTechniques: 0,
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      if (!this.techniqueManager) {
        result.errors.push('TechniqueManager not set. Cannot migrate techniques.')
        return result
      }

      console.log('Starting technique migration to mode system...')
      
      const techniques = this.techniqueManager.getTechniques()
      
      if (techniques.length === 0) {
        console.log('No techniques to migrate')
        result.success = true
        return result
      }

      let migratedCount = 0
      
      for (const technique of techniques) {
        try {
          // Check if already migrated (has modes field)
          if (technique.modes && Array.isArray(technique.modes) && technique.modes.length > 0) {
            // Validate modes
            const validModes = technique.modes.filter(m => 
              m === TECHNIQUE_MODES.PERFORMING || m === TECHNIQUE_MODES.RESPONDING
            )
            
            if (validModes.length === 0) {
              // Invalid modes, default to both
              technique.modes = [TECHNIQUE_MODES.PERFORMING, TECHNIQUE_MODES.RESPONDING]
              migratedCount++
            } else if (validModes.length !== technique.modes.length) {
              // Some invalid modes, update
              technique.modes = validModes
              migratedCount++
            }
            // Already has valid modes, skip
            continue
          }

          // Migrate: default to both modes
          technique.modes = [TECHNIQUE_MODES.PERFORMING, TECHNIQUE_MODES.RESPONDING]
          migratedCount++
        } catch (error) {
          const errorMsg = `Failed to migrate technique ${technique.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(errorMsg, error)
        }
      }

      result.migratedTechniques = migratedCount
      result.success = result.errors.length === 0
      
      console.log(`Technique migration completed: ${migratedCount} techniques migrated`)
      
      return result
    } catch (error) {
      const errorMsg = `Technique migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMsg)
      console.error(errorMsg, error)
      result.success = false
      return result
    }
  }

  /**
   * Validate migration result
   * @param result The migration result to validate
   * @returns True if migration is valid, false otherwise
   */
  validateMigration(result: MigrationResult): boolean {
    // Do not require result.success to be true before validation
    // Only check the data state

    // Validate fightlists have mode
    const fightLists = this.storageService.getAllFightLists()
    for (const fightList of fightLists) {
      if (!fightList.mode || (fightList.mode !== 'PERFORMING' && fightList.mode !== 'RESPONDING')) {
        return false
      }
    }

    // Validate techniques have modes
    if (this.techniqueManager) {
      const techniques = this.techniqueManager.getTechniques()
      for (const technique of techniques) {
        if (!technique.modes || technique.modes.length === 0) {
          return false
        }
        
        // Validate mode values
        for (const mode of technique.modes) {
          if (mode !== TECHNIQUE_MODES.PERFORMING && mode !== TECHNIQUE_MODES.RESPONDING) {
            return false
          }
        }
      }
    }

    return true
  }

  /**
   * Rollback migration (restore from backup)
   * @returns True if rollback was successful, false otherwise
   */
  rollbackMigration(): boolean {
    try {
      const backupData = localStorage.getItem(MIGRATION_KEYS.MIGRATION_BACKUP)
      if (!backupData) {
        console.error('No backup data found for rollback')
        return false
      }

      const backup = JSON.parse(backupData)
      
      // Restore fightlists
      if (backup.fightLists) {
        this.storageService.saveFightListsBatch(backup.fightLists)
      }

      // Restore migration version
      if (backup.migrationVersion) {
        localStorage.setItem(MIGRATION_KEYS.MIGRATION_VERSION, backup.migrationVersion)
      } else {
        localStorage.removeItem(MIGRATION_KEYS.MIGRATION_VERSION)
      }

      console.log('Migration rolled back successfully')
      return true
    } catch (error) {
      console.error('Rollback failed:', error)
      return false
    }
  }

  /**
   * Create backup of current data before migration
   * @param fightLists The fightlists to backup
   */
  private createBackup(fightLists: FightList[]): void {
    try {
      const backup = {
        fightLists: fightLists.map(list => ({ ...list })),
        migrationVersion: this.getMigrationVersion(),
        timestamp: new Date().toISOString()
      }
      
      localStorage.setItem(MIGRATION_KEYS.MIGRATION_BACKUP, JSON.stringify(backup))
      console.log('Backup created before migration')
    } catch (error) {
      console.error('Failed to create backup:', error)
      // Don't throw - backup failure shouldn't stop migration
    }
  }

  /**
   * Run complete migration (fightlists and techniques)
   * @returns Migration result
   */
  async runMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedFightLists: 0,
      migratedTechniques: 0,
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString()
    }

    try {
      console.log('Starting complete migration...')

      // Migrate fightlists
      const fightListResult = this.migrateFightListsToModes()
      result.migratedFightLists = fightListResult.migratedFightLists
      result.errors.push(...fightListResult.errors)
      result.warnings.push(...fightListResult.warnings)

      // Migrate techniques
      const techniqueResult = this.migrateTechniquesToModes()
      result.migratedTechniques = techniqueResult.migratedTechniques
      result.errors.push(...techniqueResult.errors)
      result.warnings.push(...techniqueResult.warnings)

      // Validate migration
      if (!this.validateMigration(result)) {
        result.errors.push('Migration validation failed')
        result.success = false
      } else {
        result.success = result.errors.length === 0
      }

      console.log('Complete migration finished:', result)
      return result
    } catch (error) {
      const errorMsg = `Complete migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMsg)
      console.error(errorMsg, error)
      result.success = false
      return result
    }
  }
}

