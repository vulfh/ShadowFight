import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MigrationService } from '../services/MigrationService'
import { StorageService } from '../services/StorageService'
import { FightList } from '../types'
import { MODES } from '../constants/modes'

// Mock StorageService
vi.mock('../services/StorageService')

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('MigrationService', () => {
  let migrationService: MigrationService
  let mockStorageService: StorageService

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    
    // Create mock storage service
    mockStorageService = {
      getAllFightLists: vi.fn(),
      saveFightListsBatch: vi.fn()
    } as unknown as StorageService

    // Mock the StorageService constructor
    vi.mocked(StorageService).mockImplementation(() => mockStorageService)

    migrationService = new MigrationService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('run', () => {
    it('should skip migration if already up to date', async () => {
      // Mock that migration is already at current version
      vi.mocked(localStorageMock.getItem).mockReturnValue('1.0.0')

      const result = await migrationService.run()

      expect(result).toBe(false)
      expect(mockStorageService.getAllFightLists).not.toHaveBeenCalled()
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should run migration when version is outdated', async () => {
      // Mock that no migration version exists (first run)
      vi.mocked(localStorageMock.getItem).mockReturnValue(null)
      
      // Mock empty fight lists
      vi.mocked(mockStorageService.getAllFightLists).mockReturnValue([])
      
      const result = await migrationService.run()

      expect(result).toBe(true)
      expect(mockStorageService.getAllFightLists).toHaveBeenCalled()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('migration_version', '1.0.0')
    })

    it('should migrate fight lists without mode property', async () => {
      // Mock outdated version
      vi.mocked(localStorageMock.getItem).mockReturnValue('0.0.0')
      
      // Mock fight lists without mode property
      const fightListsWithoutMode = [
        {
          id: '1',
          name: 'Fight List 1',
          techniques: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          lastModified: '2023-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          name: 'Fight List 2',
          techniques: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          lastModified: '2023-01-01T00:00:00.000Z'
        }
      ] as FightList[]

      vi.mocked(mockStorageService.getAllFightLists).mockReturnValue(fightListsWithoutMode)
      vi.mocked(mockStorageService.saveFightListsBatch).mockReturnValue(2)

      const result = await migrationService.run()

      expect(result).toBe(true)
      expect(mockStorageService.saveFightListsBatch).toHaveBeenCalledWith([
        {
          ...fightListsWithoutMode[0],
          mode: MODES.RESPONDING
        },
        {
          ...fightListsWithoutMode[1],
          mode: MODES.RESPONDING
        }
      ])
      expect(localStorageMock.setItem).toHaveBeenCalledWith('migration_version', '1.0.0')
    })

    it('should not modify fight lists that already have mode property', async () => {
      // Mock outdated version
      vi.mocked(localStorageMock.getItem).mockReturnValue('0.0.0')
      
      // Mock fight lists with existing mode property
      const fightListsWithMode: FightList[] = [
        {
          id: '1',
          name: 'Fight List 1',
          mode: MODES.PERFORMING,
          techniques: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          lastModified: '2023-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          name: 'Fight List 2',
          mode: MODES.RESPONDING,
          techniques: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          lastModified: '2023-01-01T00:00:00.000Z'
        }
      ]

      vi.mocked(mockStorageService.getAllFightLists).mockReturnValue(fightListsWithMode)
      vi.mocked(mockStorageService.saveFightListsBatch).mockReturnValue(2)

      const result = await migrationService.run()

      expect(result).toBe(true)
      expect(mockStorageService.saveFightListsBatch).toHaveBeenCalledWith(fightListsWithMode)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('migration_version', '1.0.0')
    })

    it('should handle mixed fight lists (some with mode, some without)', async () => {
      // Mock outdated version
      vi.mocked(localStorageMock.getItem).mockReturnValue('0.0.0')
      
      // Mock mixed fight lists
      const mixedFightLists = [
        {
          id: '1',
          name: 'Fight List 1',
          mode: MODES.PERFORMING, // Already has mode
          techniques: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          lastModified: '2023-01-01T00:00:00.000Z'
        },
        {
          id: '2',
          name: 'Fight List 2',
          // No mode property
          techniques: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          lastModified: '2023-01-01T00:00:00.000Z'
        }
      ] as FightList[]

      vi.mocked(mockStorageService.getAllFightLists).mockReturnValue(mixedFightLists)
      vi.mocked(mockStorageService.saveFightListsBatch).mockReturnValue(2)

      const result = await migrationService.run()

      expect(result).toBe(true)
      expect(mockStorageService.saveFightListsBatch).toHaveBeenCalledWith([
        mixedFightLists[0], // Unchanged
        {
          ...mixedFightLists[1],
          mode: MODES.RESPONDING // Added mode
        }
      ])
    })

    it('should handle empty fight lists', async () => {
      // Mock outdated version
      vi.mocked(localStorageMock.getItem).mockReturnValue('0.0.0')
      
      // Mock empty fight lists
      vi.mocked(mockStorageService.getAllFightLists).mockReturnValue([])

      const result = await migrationService.run()

      expect(result).toBe(true)
      expect(mockStorageService.saveFightListsBatch).not.toHaveBeenCalled()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('migration_version', '1.0.0')
    })

    it('should handle storage batch save failure', async () => {
      // Mock outdated version
      vi.mocked(localStorageMock.getItem).mockReturnValue('0.0.0')
      
      // Mock fight lists
      const fightLists = [
        {
          id: '1',
          name: 'Fight List 1',
          techniques: [],
          createdAt: '2023-01-01T00:00:00.000Z',
          lastModified: '2023-01-01T00:00:00.000Z'
        }
      ] as FightList[]

      vi.mocked(mockStorageService.getAllFightLists).mockReturnValue(fightLists)
      vi.mocked(mockStorageService.saveFightListsBatch).mockReturnValue(0) // Failed to save

      await expect(migrationService.run()).rejects.toThrow(
        'Failed to save all migrated fight lists. Expected: 1, Saved: 0'
      )
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should handle storage service errors', async () => {
      // Mock outdated version
      vi.mocked(localStorageMock.getItem).mockReturnValue('0.0.0')
      
      // Mock storage service error
      const errorMessage = 'Storage service error'
      vi.mocked(mockStorageService.getAllFightLists).mockImplementation(() => {
        throw new Error(errorMessage)
      })

      await expect(migrationService.run()).rejects.toThrow(errorMessage)
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  describe('isMigrationNeeded', () => {
    it('should return true when no migration version exists', () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue(null)

      const result = migrationService.isMigrationNeeded()

      expect(result).toBe(true)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('migration_version')
    })

    it('should return true when migration version is outdated', () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue('0.9.0')

      const result = migrationService.isMigrationNeeded()

      expect(result).toBe(true)
    })

    it('should return false when migration version is current', () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue('1.0.0')

      const result = migrationService.isMigrationNeeded()

      expect(result).toBe(false)
    })
  })
})