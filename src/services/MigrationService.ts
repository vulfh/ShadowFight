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
      console.log(`MigrationService: Current migration version: ${currentVersion}`)
      console.log(`MigrationService: Target migration version: ${this.CURRENT_MIGRATION_VERSION}`)
      
      if (currentVersion === this.CURRENT_MIGRATION_VERSION) {
        console.log('MigrationService: Migrations are up to date')
        return false
      }

      console.log('MigrationService: Running data migrations...')
      
      // Check localStorage before migration
      const beforeData = localStorage.getItem('kravMagaFightLists')
      console.log('MigrationService: Data before migration:', beforeData ? `${beforeData.length} chars` : 'null')
      
      // Run migration to add modes to existing fight lists
      await this.migrateFightListModes()
      
      // Check localStorage after migration
      const afterData = localStorage.getItem('kravMagaFightLists')
      console.log('MigrationService: Data after migration:', afterData ? `${afterData.length} chars` : 'null')
      
      // Update migration version
      this.setMigrationVersion(this.CURRENT_MIGRATION_VERSION)
      
      console.log('MigrationService: Data migrations completed successfully')
      return true
    } catch (error) {
      console.error('MigrationService: Migration failed:', error)
      throw error
    }
  }

  /**
   * Migrates existing fight lists to include mode property
   * Sets all existing fight lists to RESPONDING mode for backward compatibility
   */
  private async migrateFightListModes(): Promise<void> {
    try {
      console.log('MigrationService: Starting fight list mode migration...')
      
      const fightLists = this.storageService.getAllFightLists()
      console.log(`MigrationService: Found ${fightLists.length} fight lists to check for migration`)
      
      if (fightLists.length === 0) {
        console.log('MigrationService: No fight lists to migrate')
        return
      }

      // Check if any fight lists actually need migration
      const needsMigration = fightLists.some(fl => !fl.mode)
      if (!needsMigration) {
        console.log('MigrationService: All fight lists already have mode property, skipping migration')
        return
      }

      console.log(`MigrationService: Migrating ${fightLists.length} fight lists to include mode property`)
      
      const migratedLists: FightList[] = fightLists.map(fightList => {
        // Only add mode if it doesn't already exist
        if (!fightList.mode) {
          console.log(`MigrationService: Adding RESPONDING mode to fight list "${fightList.name}"`)
          return {
            ...fightList,
            mode: MODES.RESPONDING
          }
        }
        console.log(`MigrationService: Fight list "${fightList.name}" already has mode: ${fightList.mode}`)
        return fightList
      })

      // Save all migrated fight lists in batch
      console.log('MigrationService: Saving migrated fight lists...')
      const savedCount = this.storageService.saveFightListsBatch(migratedLists)
      
      if (savedCount !== migratedLists.length) {
        throw new Error(`Failed to save all migrated fight lists. Expected: ${migratedLists.length}, Saved: ${savedCount}`)
      }

      console.log(`MigrationService: Successfully migrated ${savedCount} fight lists`)
    } catch (error) {
      console.error('MigrationService: Failed to migrate fight list modes:', error)
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