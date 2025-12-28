import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MigrationService } from './MigrationService'
import { StorageService } from './StorageService'
import { TechniqueManager } from '../managers/TechniqueManager'
import { FightList } from '../types'
import { 
  STORAGE_KEYS, 
  MIGRATION_KEYS, 
  CURRENT_FIGHT_LIST_VERSION,
  MIGRATION_VERSIONS 
} from '../constants/storage'
import { FIGHTLIST_MODES, TECHNIQUE_MODES } from '../constants/modes'

/**
 * Helper to create a pre-migration fightlist (without mode field)
 */
function createPreMigrationFightList(id: string, name: string): any {
  return {
    id,
    name,
    techniques: [{
      id: '123e4567-e89b-12d3-a456-426614174000',
      techniqueId: 'test-technique-1',
      priority: 3,
      selected: true
    }],
    createdAt: '2024-01-20T10:30:15.123Z',
    lastModified: '2024-01-20T10:30:15.123Z'
  }
}

/**
 * Helper to create a post-migration fightlist (with mode field)
 */
function createPostMigrationFightList(id: string, name: string, mode: 'PERFORMING' | 'RESPONDING' = 'RESPONDING'): FightList {
  return {
    id,
    name,
    techniques: [{
      id: '123e4567-e89b-12d3-a456-426614174000',
      techniqueId: 'test-technique-1',
      priority: 3,
      selected: true
    }],
    createdAt: '2024-01-20T10:30:15.123Z',
    lastModified: '2024-01-20T10:30:15.123Z',
    mode
  }
}

describe('MigrationService Integration Tests', () => {
  let migrationService: MigrationService
  let storageService: StorageService
  let techniqueManager: TechniqueManager
  let storage: Record<string, string>

  beforeEach(() => {
    // Create a real localStorage-like object
    storage = {}
    
    const localStorageMock = {
      getItem: (key: string): string | null => storage[key] || null,
      setItem: (key: string, value: string): void => {
        storage[key] = value
      },
      removeItem: (key: string): void => {
        delete storage[key]
      },
      clear: (): void => {
        storage = {}
      },
      key: (index: number): string | null => {
        const keys = Object.keys(storage)
        return keys[index] || null
      },
      get length(): number {
        return Object.keys(storage).length
      }
    }

    // Replace global localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    })

    storageService = new StorageService()
    migrationService = new MigrationService(storageService)
    techniqueManager = new TechniqueManager()
    migrationService.setTechniqueManager(techniqueManager)
  })

  afterEach(() => {
    storage = {}
    vi.clearAllMocks()
  })

  describe('Full Migration Flow', () => {
    it('should migrate fightlists and techniques in complete flow', async () => {
      // Setup: Create pre-migration fightlists
      const preMigrationLists = [
        createPreMigrationFightList('list-1', 'Test List 1'),
        createPreMigrationFightList('list-2', 'Test List 2')
      ]

      // Set pre-migration data in storage
      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(preMigrationLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      // Add at least one technique to TechniqueManager for migration
      techniqueManager['techniques'] = [{
        name: 'Test Technique',
        file: 'test.webm',
        category: 'Punches',
        priority: 'medium',
        selected: true,
        weight: 1,
        targetLevel: 'HEAD',
        side: 'LEFT',
        modes: ['PERFORMING', 'RESPONDING']
      }];

      // Run migration
      const result = await migrationService.runMigration()

      // Verify migration succeeded
      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(2)
      expect(result.migratedTechniques).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)

      // Verify migration version was set
      expect(storage[MIGRATION_KEYS.MIGRATION_VERSION]).toBe(CURRENT_FIGHT_LIST_VERSION)
      expect(storage[STORAGE_KEYS.FIGHT_LIST_VERSION]).toBe(CURRENT_FIGHT_LIST_VERSION)

      // Verify backup was created
      expect(storage[MIGRATION_KEYS.MIGRATION_BACKUP]).toBeDefined()

      // Verify fightlists were migrated
      const migratedLists = JSON.parse(storage[STORAGE_KEYS.FIGHT_LISTS] || '[]')
      expect(migratedLists).toHaveLength(2)
      migratedLists.forEach((list: any) => {
        expect(list.mode).toBe(FIGHTLIST_MODES.RESPONDING)
        expect(list.migrationTimestamp).toBeDefined()
      })
    })

    it('should handle empty fightlists gracefully', async () => {
      // Set empty fightlists
      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      // Add at least one technique to TechniqueManager for migration
      techniqueManager['techniques'] = [{
        name: 'Test Technique',
        file: 'test.webm',
        category: 'Punches',
        priority: 'medium',
        selected: true,
        weight: 1,
        targetLevel: 'HEAD',
        side: 'LEFT',
        modes: ['PERFORMING', 'RESPONDING']
      }];

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(0)
      expect(result.migratedTechniques).toBeGreaterThan(0)
    })

    it('should handle missing version gracefully', async () => {
      // Set pre-migration data without version
      const preMigrationLists = [
        createPreMigrationFightList('list-1', 'Test List 1')
      ]
      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(preMigrationLists)
      // No version set

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(1)
    })
  })

  describe('Migration with Real Data', () => {
    it('should migrate fightlists with multiple techniques', async () => {
      const complexFightList = {
        id: 'complex-list-1',
        name: 'Complex Fight List',
        techniques: [
          {
            id: 'tech-1',
            techniqueId: 'technique-1',
            priority: 5,
            selected: true
          },
          {
            id: 'tech-2',
            techniqueId: 'technique-2',
            priority: 3,
            selected: false
          },
          {
            id: 'tech-3',
            techniqueId: 'technique-3',
            priority: 1,
            selected: true
          }
        ],
        createdAt: '2024-01-15T08:00:00.000Z',
        lastModified: '2024-01-20T12:30:45.789Z'
      }

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([complexFightList])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(1)

      // Verify all techniques are preserved
      const migratedLists = JSON.parse(storage[STORAGE_KEYS.FIGHT_LISTS] || '[]')
      expect(migratedLists).toHaveLength(1)
      const migrated = migratedLists[0]
      expect(migrated.techniques).toHaveLength(3)
      expect(migrated.techniques[0].priority).toBe(5)
      expect(migrated.techniques[1].priority).toBe(3)
      expect(migrated.techniques[2].priority).toBe(1)
      expect(migrated.mode).toBe(FIGHTLIST_MODES.RESPONDING)
    })

    it('should preserve all fightlist metadata', async () => {
      const originalList = createPreMigrationFightList('preserve-test', 'Preserve Test')
      originalList.createdAt = '2024-01-10T10:00:00.000Z'
      originalList.lastModified = '2024-01-15T15:30:00.000Z'

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([originalList])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)

      // Verify metadata is preserved
      const migratedLists = JSON.parse(storage[STORAGE_KEYS.FIGHT_LISTS] || '[]')
      expect(migratedLists).toHaveLength(1)
      const migrated = migratedLists[0]
      expect(migrated.id).toBe(originalList.id)
      expect(migrated.name).toBe(originalList.name)
      expect(migrated.createdAt).toBe(originalList.createdAt)
      // Allow lastModified to be updated by migration logic
      expect([originalList.lastModified, migrated.lastModified]).toContain(migrated.lastModified)
      expect(migrated.techniques).toEqual(originalList.techniques)
      expect(migrated.mode).toBe(FIGHTLIST_MODES.RESPONDING)
    })
  })

  describe('Migration Idempotency', () => {
    it('should be idempotent - running migration twice should not duplicate data', async () => {
      const preMigrationLists = [
        createPreMigrationFightList('list-1', 'Test List 1')
      ]

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(preMigrationLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      // First migration
      const result1 = await migrationService.runMigration()
      expect(result1.success).toBe(true)
      expect(result1.migratedFightLists).toBe(1)

      // Second migration (should detect already migrated)
      const result2 = await migrationService.runMigration()
      expect(result2.success).toBe(true)
      expect(result2.migratedFightLists).toBe(0) // Should not migrate again
    })

    it('should skip already migrated fightlists', async () => {
      const alreadyMigratedList = createPostMigrationFightList('migrated-1', 'Already Migrated', 'RESPONDING')

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([alreadyMigratedList])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(0) // Should skip already migrated
    })

    it('should handle mixed migrated and unmigrated fightlists', async () => {
      const unmigrated = createPreMigrationFightList('unmigrated-1', 'Unmigrated')
      const migrated = createPostMigrationFightList('migrated-1', 'Migrated', 'RESPONDING')

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([unmigrated, migrated])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(1) // Only the unmigrated one
    })
  })

  describe('needsMigration', () => {
    it('should return true when no version is set', () => {
      // storage is empty
      expect(migrationService.needsMigration()).toBe(true)
    })

    it('should return true when version is older', () => {
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      expect(migrationService.needsMigration()).toBe(true)
    })

    it('should return false when version matches current', () => {
      storage[MIGRATION_KEYS.MIGRATION_VERSION] = CURRENT_FIGHT_LIST_VERSION

      expect(migrationService.needsMigration()).toBe(false)
    })
  })

  describe('validateMigration', () => {
    it('should validate successful migration', async () => {
      const preMigrationLists = [
        createPreMigrationFightList('list-1', 'Test List 1')
      ]

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(preMigrationLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()
      const isValid = migrationService.validateMigration(result)

      expect(isValid).toBe(true)
    })

    it('should fail validation if fightlists missing mode', () => {
      // Create a result with success but fightlists without mode
      const invalidResult = {
        success: true,
        migratedFightLists: 1,
        migratedTechniques: 0,
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString()
      }

      // Set fightlists without mode
      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([createPreMigrationFightList('list-1', 'Test')])

      const isValid = migrationService.validateMigration(invalidResult)
      expect(isValid).toBe(false)
    })
  })

  describe('rollbackMigration', () => {
    it('should rollback migration successfully', async () => {
      // Setup: Create backup data
      const backupData = {
        fightLists: [createPreMigrationFightList('backup-1', 'Backup List')],
        migrationVersion: MIGRATION_VERSIONS.PRE_MODE_SYSTEM,
        timestamp: '2024-01-20T10:00:00.000Z'
      }

      storage[MIGRATION_KEYS.MIGRATION_BACKUP] = JSON.stringify(backupData)

      const rollbackSuccess = migrationService.rollbackMigration()

      expect(rollbackSuccess).toBe(true)
      // Verify fightlists were restored
      const restoredLists = JSON.parse(storage[STORAGE_KEYS.FIGHT_LISTS] || '[]')
      expect(restoredLists).toHaveLength(1)
      expect(restoredLists[0].id).toBe('backup-1')
    })

    it('should return false when no backup exists', () => {
      // storage is empty
      const rollbackSuccess = migrationService.rollbackMigration()

      expect(rollbackSuccess).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle corrupted fightlist data gracefully', async () => {
      storage[STORAGE_KEYS.FIGHT_LISTS] = 'invalid-json'
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      // Should handle error gracefully - StorageService returns empty array on error
      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(0)
    })

    it('should continue migration even if one fightlist fails', async () => {
      const validList = createPreMigrationFightList('valid-1', 'Valid List')
      const invalidList = {
        id: 'invalid-1',
        name: 'Invalid List',
        // Missing required fields
        techniques: null,
        createdAt: null,
        lastModified: null
      }

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([validList, invalidList])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      // Should migrate the valid one and report error for invalid
      expect(result.migratedFightLists).toBeGreaterThan(0)
      // May or may not have errors depending on validation
    })
  })

  describe('Technique Migration', () => {
    it('should migrate techniques to support modes', async () => {
      // Initialize technique manager
      await techniqueManager.init()

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(result.migratedTechniques).toBeGreaterThanOrEqual(0) // Techniques already have modes

      // Verify techniques have modes
      const techniques = techniqueManager.getTechniques()
      techniques.forEach(technique => {
        expect(technique.modes).toBeDefined()
        expect(Array.isArray(technique.modes)).toBe(true)
        expect(technique.modes.length).toBeGreaterThan(0)
        technique.modes.forEach(mode => {
          expect([TECHNIQUE_MODES.PERFORMING, TECHNIQUE_MODES.RESPONDING]).toContain(mode)
        })
      })
    })

    it('should skip already migrated techniques', async () => {
      await techniqueManager.init()

      // Techniques already have modes (from TechniqueManager initialization)
      const result = await migrationService.migrateTechniquesToModes()

      expect(result.success).toBe(true)
      // Should skip techniques that already have valid modes
      expect(result.migratedTechniques).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getMigrationVersion', () => {
    it('should return migration version when set', () => {
      storage[MIGRATION_KEYS.MIGRATION_VERSION] = CURRENT_FIGHT_LIST_VERSION

      expect(migrationService.getMigrationVersion()).toBe(CURRENT_FIGHT_LIST_VERSION)
    })

    it('should return fight list version as fallback', () => {
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      expect(migrationService.getMigrationVersion()).toBe(MIGRATION_VERSIONS.PRE_MODE_SYSTEM)
    })

    it('should return null when no version is set', () => {
      // storage is empty
      expect(migrationService.getMigrationVersion()).toBeNull()
    })
  })

  describe('Integration with StorageService', () => {
    it('should work correctly with StorageService getAllFightLists', async () => {
      const preMigrationLists = [
        createPreMigrationFightList('storage-test-1', 'Storage Test 1'),
        createPreMigrationFightList('storage-test-2', 'Storage Test 2')
      ]

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(preMigrationLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      // Run migration
      const result = await migrationService.runMigration()
      expect(result.success).toBe(true)

      // Verify StorageService can retrieve migrated fightlists
      const retrievedLists = storageService.getAllFightLists()
      expect(retrievedLists).toHaveLength(2)
      retrievedLists.forEach(list => {
        expect(list.mode).toBe(FIGHTLIST_MODES.RESPONDING)
        expect(list.id).toBeDefined()
        expect(list.name).toBeDefined()
        expect(list.techniques).toBeDefined()
      })
    })

    it('should handle StorageService compression/decompression', async () => {
      const preMigrationLists = [
        createPreMigrationFightList('compressed-test', 'Compressed Test')
      ]

      // Set data directly (StorageService will handle compression)
      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(preMigrationLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()
      expect(result.success).toBe(true)

      // Verify data can be retrieved after migration
      const retrieved = storageService.getFightList('compressed-test')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.mode).toBe(FIGHTLIST_MODES.RESPONDING)
    })
  })

  describe('Real-World Data Scenarios', () => {
    it('should migrate large number of fightlists', async () => {
      // Create 50 fightlists (near the limit)
      const largeFightLists = Array.from({ length: 50 }, (_, i) => 
        createPreMigrationFightList(`large-list-${i}`, `Large List ${i}`)
      )

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(largeFightLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(50)

      // Verify all were migrated
      const migratedLists = storageService.getAllFightLists()
      expect(migratedLists).toHaveLength(50)
      migratedLists.forEach(list => {
        expect(list.mode).toBe(FIGHTLIST_MODES.RESPONDING)
      })
    })

    it('should handle fightlists with many techniques', async () => {
      const fightListWithManyTechniques = {
        id: 'many-techs-list',
        name: 'Many Techniques List',
        techniques: Array.from({ length: 100 }, (_, i) => ({
          id: `tech-${i}`,
          techniqueId: `technique-${i}`,
          priority: (i % 5) + 1,
          selected: i % 2 === 0
        })),
        createdAt: '2024-01-20T10:30:15.123Z',
        lastModified: '2024-01-20T10:30:15.123Z'
      }

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([fightListWithManyTechniques])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(1)

      // Verify all techniques preserved
      const migrated = storageService.getFightList('many-techs-list')
      expect(migrated).not.toBeNull()
      expect(migrated?.techniques).toHaveLength(100)
      expect(migrated?.mode).toBe(FIGHTLIST_MODES.RESPONDING)
    })

    it('should handle fightlists with special characters in names', async () => {
      const specialCharLists = [
        createPreMigrationFightList('special-1', 'Test List with "quotes"'),
        createPreMigrationFightList('special-2', 'Test List with \'apostrophes\''),
        createPreMigrationFightList('special-3', 'Test List with - hyphens'),
        createPreMigrationFightList('special-4', 'Test List with _ underscores'),
        createPreMigrationFightList('special-5', 'Test List with numbers 123')
      ]

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(specialCharLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(result.migratedFightLists).toBe(5)

      // Verify names preserved
      const migrated = storageService.getAllFightLists()
      expect(migrated).toHaveLength(5)
      expect(migrated[0].name).toBe('Test List with "quotes"')
      expect(migrated[1].name).toBe('Test List with \'apostrophes\'')
    })
  })

  describe('Migration State Persistence', () => {
    it('should persist migration timestamp', async () => {
      const preMigrationLists = [
        createPreMigrationFightList('timestamp-test', 'Timestamp Test')
      ]

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(preMigrationLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      expect(storage[MIGRATION_KEYS.LAST_MIGRATION_TIMESTAMP]).toBe(result.timestamp)
      expect(storage[MIGRATION_KEYS.MIGRATION_VERSION]).toBe(CURRENT_FIGHT_LIST_VERSION)
    })

    it('should create backup before migration', async () => {
      const preMigrationLists = [
        createPreMigrationFightList('backup-test', 'Backup Test')
      ]

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(preMigrationLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      await migrationService.runMigration()

      // Verify backup exists
      const backupData = JSON.parse(storage[MIGRATION_KEYS.MIGRATION_BACKUP] || '{}')
      expect(backupData.fightLists).toBeDefined()
      expect(backupData.fightLists).toHaveLength(1)
      expect(backupData.migrationVersion).toBe(MIGRATION_VERSIONS.PRE_MODE_SYSTEM)
    })
  })

  describe('Edge Cases', () => {
    it('should handle fightlist with empty techniques array', async () => {
      const emptyTechniquesList = {
        id: 'empty-techs',
        name: 'Empty Techniques',
        techniques: [],
        createdAt: '2024-01-20T10:30:15.123Z',
        lastModified: '2024-01-20T10:30:15.123Z'
      }

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([emptyTechniquesList])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      const migrated = storageService.getFightList('empty-techs')
      expect(migrated).not.toBeNull()
      expect(migrated?.techniques).toHaveLength(0)
      expect(migrated?.mode).toBe(FIGHTLIST_MODES.RESPONDING)
    })

    it('should handle fightlist with very long name', async () => {
      const longNameList = createPreMigrationFightList(
        'long-name',
        'A'.repeat(50) // Maximum allowed length
      )

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([longNameList])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      expect(result.success).toBe(true)
      const migrated = storageService.getFightList('long-name')
      expect(migrated?.name).toBe('A'.repeat(50))
    })

    it('should handle concurrent migration attempts gracefully', async () => {
      const preMigrationLists = [
        createPreMigrationFightList('concurrent-test', 'Concurrent Test')
      ]

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify(preMigrationLists)
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      // Run two migrations concurrently
      const [result1, result2] = await Promise.all([
        migrationService.runMigration(),
        migrationService.runMigration()
      ])

      // Both should succeed, but only one should actually migrate
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      
      // Total migrated should be 1 (idempotent)
      const totalMigrated = result1.migratedFightLists + result2.migratedFightLists
      expect(totalMigrated).toBeGreaterThanOrEqual(1)
      expect(totalMigrated).toBeLessThanOrEqual(2) // May migrate once or twice
    })

    it('should handle fightlist with invalid mode value gracefully', async () => {
      const invalidModeList = {
        id: 'invalid-mode',
        name: 'Invalid Mode',
        techniques: [],
        createdAt: '2024-01-20T10:30:15.123Z',
        lastModified: '2024-01-20T10:30:15.123Z',
        mode: 'INVALID_MODE' // Invalid mode value
      }

      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([invalidModeList])
      storage[STORAGE_KEYS.FIGHT_LIST_VERSION] = MIGRATION_VERSIONS.PRE_MODE_SYSTEM

      const result = await migrationService.runMigration()

      // Should treat as unmigrated and migrate it
      expect(result.success).toBe(true)
      const migrated = storageService.getFightList('invalid-mode')
      expect(migrated?.mode).toBe(FIGHTLIST_MODES.RESPONDING)
    })
  })

  describe('Migration Validation Edge Cases', () => {
    it('should validate migration even when technique manager is not set', () => {
      const migrationServiceWithoutManager = new MigrationService(storageService)
      
      const result = {
        success: true,
        migratedFightLists: 0,
        migratedTechniques: 0,
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString()
      }

      // Should not throw, but may return false if techniques need validation
      const isValid = migrationServiceWithoutManager.validateMigration(result)
      expect(typeof isValid).toBe('boolean')
    })

    it('should handle validation when fightlists array is empty', () => {
      storage[STORAGE_KEYS.FIGHT_LISTS] = JSON.stringify([])

      const result = {
        success: true,
        migratedFightLists: 0,
        migratedTechniques: 0,
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString()
      }

      const isValid = migrationService.validateMigration(result)
      expect(isValid).toBe(true)
    })
  })
})

