import { StorageService } from './StorageService'
import { MODES } from '../constants/modes'
import { FightList } from '../types'

/**
 * Service responsible for handling one-time data migrations
 */
export class MigrationService {
  private readonly MIGRATION_VERSION_KEY = 'migration_version'
  private readonly CURRENT_MIGRATION_VERSION = '1.0.0'
  private storageService: StorageService

  constructor() {
    this.storageService = new StorageService()
  }

  /**
   * Runs all necessary migrations
   * @returns Promise<boolean> - true if migrations were run, false if already up to date
   */
  public async run(): Promise<boolean> {
    try {
      const currentVersion = this.getCurrentMigrationVersion()
      
      if (currentVersion === this.CURRENT_MIGRATION_VERSION) {
        console.log('Migrations are up to date')
        return false
      }

      console.log('Running data migrations...')
      
      // Run migration to add modes to existing fight lists
      await this.migrateFightListModes()
      
      // Update migration version
      this.setMigrationVersion(this.CURRENT_MIGRATION_VERSION)
      
      console.log('Data migrations completed successfully')
      return true
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }

  /**
   * Migrates existing fight lists to include mode property
   * Sets all existing fight lists to RESPONDING mode for backward compatibility
   */
  private async migrateFightListModes(): Promise<void> {
    try {
      const fightLists = this.storageService.getAllFightLists()
      
      if (fightLists.length === 0) {
        console.log('No fight lists to migrate')
        return
      }

      console.log(`Migrating ${fightLists.length} fight lists to include mode property`)
      
      const migratedLists: FightList[] = fightLists.map(fightList => {
        // Only add mode if it doesn't already exist
        if (!fightList.mode) {
          return {
            ...fightList,
            mode: MODES.RESPONDING
          }
        }
        return fightList
      })

      // Save all migrated fight lists in batch
      const savedCount = this.storageService.saveFightListsBatch(migratedLists)
      
      if (savedCount !== migratedLists.length) {
        throw new Error(`Failed to save all migrated fight lists. Expected: ${migratedLists.length}, Saved: ${savedCount}`)
      }

      console.log(`Successfully migrated ${savedCount} fight lists`)
    } catch (error) {
      console.error('Failed to migrate fight list modes:', error)
      throw error
    }
  }

  /**
   * Gets the current migration version from localStorage
   */
  private getCurrentMigrationVersion(): string {
    return localStorage.getItem(this.MIGRATION_VERSION_KEY) || '0.0.0'
  }

  /**
   * Sets the migration version in localStorage
   */
  private setMigrationVersion(version: string): void {
    localStorage.setItem(this.MIGRATION_VERSION_KEY, version)
  }

  /**
   * Checks if migrations are needed
   */
  public isMigrationNeeded(): boolean {
    return this.getCurrentMigrationVersion() !== this.CURRENT_MIGRATION_VERSION
  }
}