import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FightListManager } from '../managers/FightListManager'
import { StorageService } from '../services/StorageService'
import { FightList, Technique } from '../types'
import { MODES } from '../constants/modes'

// Mock StorageService
vi.mock('../services/StorageService')

describe('FightListManager', () => {
  let fightListManager: FightListManager
  let mockStorageService: StorageService

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    
    // Create mock storage service
    mockStorageService = {
      getAllFightLists: vi.fn(),
      saveFightList: vi.fn(),
      deleteFightList: vi.fn(),
      getCurrentFightList: vi.fn(),
      setCurrentFightList: vi.fn()
    } as unknown as StorageService

    // Mock the StorageService constructor
    vi.mocked(StorageService).mockImplementation(() => mockStorageService)

    fightListManager = new FightListManager()
    
    // Initialize the manager
    fightListManager['isInitialized'] = true
    fightListManager['storageService'] = mockStorageService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createFightList', () => {
    it('should create a fight list with RESPONDING mode by default', () => {
      const name = 'Test Fight List'
      
      vi.mocked(mockStorageService.saveFightList).mockReturnValue(true)

      const result = fightListManager.createFightList(name)

      expect(result.name).toBe(name)
      expect(result.mode).toBe(MODES.RESPONDING)
      expect(result.techniques).toEqual([])
      expect(result.id).toBeDefined()
      expect(result.createdAt).toBeDefined()
      expect(result.lastModified).toBeDefined()
      expect(mockStorageService.saveFightList).toHaveBeenCalledWith(
        expect.objectContaining({
          name,
          mode: MODES.RESPONDING,
          techniques: []
        })
      )
    })

    it('should create a fight list with specified mode', () => {
      const name = 'Test Fight List'
      const mode = MODES.PERFORMING
      
      vi.mocked(mockStorageService.saveFightList).mockReturnValue(true)

      const result = fightListManager.createFightList(name, mode)

      expect(result.mode).toBe(MODES.PERFORMING)
      expect(mockStorageService.saveFightList).toHaveBeenCalledWith(
        expect.objectContaining({
          name,
          mode: MODES.PERFORMING
        })
      )
    })

    it('should handle storage failure', () => {
      const name = 'Test Fight List'
      
      vi.mocked(mockStorageService.saveFightList).mockImplementation(() => {
        throw new Error('Storage failed')
      })

      expect(() => fightListManager.createFightList(name)).toThrow('Storage failed')
    })

    it('should handle storage exception', () => {
      const name = 'Test Fight List'
      const errorMessage = 'Storage quota exceeded'
      
      vi.mocked(mockStorageService.saveFightList).mockImplementation(() => {
        throw new Error(errorMessage)
      })

      expect(() => fightListManager.createFightList(name)).toThrow(errorMessage)
    })
  })

  describe('addTechniqueToFightList', () => {
    const mockFightList: FightList = {
      id: 'test-id',
      name: 'Test Fight List',
      mode: MODES.RESPONDING,
      techniques: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    const mockTechnique: Technique = {
      name: 'Test Technique',
      file: 'test.wav',
      modes: [MODES.RESPONDING, MODES.PERFORMING],
      category: 'Punches',
      priority: 'medium',
      selected: true,
      weight: 1,
      targetLevel: 'CHEST',
      side: 'RIGHT'
    }

    beforeEach(() => {
      // Reset the fight list to original state for each test
      const originalFightList = {
        id: 'test-id',
        name: 'Test Fight List',
        mode: MODES.RESPONDING,
        techniques: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
      // Mock the fightLists array directly with a fresh copy
      fightListManager['fightLists'] = [{ ...originalFightList }]
    })

    it('should successfully add compatible technique', () => {
      vi.mocked(mockStorageService.saveFightList).mockReturnValue(true)

      expect(() => fightListManager.addTechniqueToFightList(
        mockFightList.id,
        mockTechnique,
        3
      )).not.toThrow()

      expect(mockStorageService.saveFightList).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockFightList.id,
          techniques: expect.arrayContaining([
            expect.objectContaining({
              techniqueId: mockTechnique.name,
              priority: 3,
              selected: true
            })
          ])
        })
      )
    })

    it('should reject incompatible technique', () => {
      const incompatibleTechnique: Technique = {
        ...mockTechnique,
        name: 'Incompatible Technique', // Different name to avoid duplicate check
        modes: [MODES.PERFORMING] // Only PERFORMING, but fight list is RESPONDING
      }

      expect(() => fightListManager.addTechniqueToFightList(
        mockFightList.id,
        incompatibleTechnique,
        3
      )).toThrow('does not support RESPONDING mode')

      expect(mockStorageService.saveFightList).not.toHaveBeenCalled()
    })

    it('should handle fight list not found', () => {
      fightListManager['fightLists'] = [] // Empty array

      expect(() => fightListManager.addTechniqueToFightList(
        'non-existent-id',
        mockTechnique,
        3
      )).toThrow('Fight list not found')

      expect(mockStorageService.saveFightList).not.toHaveBeenCalled()
    })

    it('should handle storage failure', () => {
      // Use a fresh fight list for this test
      const freshFightList = {
        id: 'fresh-test-id',
        name: 'Fresh Test Fight List',
        mode: MODES.RESPONDING,
        techniques: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
      fightListManager['fightLists'] = [freshFightList]
      
      vi.mocked(mockStorageService.saveFightList).mockImplementation(() => {
        throw new Error('Storage failed')
      })

      expect(() => fightListManager.addTechniqueToFightList(
        freshFightList.id,
        mockTechnique,
        3
      )).toThrow('Storage failed')
    })

    it('should prevent duplicate techniques', () => {
      const fightListWithTechnique: FightList = {
        ...mockFightList,
        techniques: [{
          id: 'existing-tech',
          techniqueId: mockTechnique.name,
          priority: 2,
          selected: true
        }]
      }

      fightListManager['fightLists'] = [fightListWithTechnique]

      expect(() => fightListManager.addTechniqueToFightList(
        fightListWithTechnique.id,
        mockTechnique,
        3
      )).toThrow('Technique already exists in fight list')

      expect(mockStorageService.saveFightList).not.toHaveBeenCalled()
    })
  })

  describe('mode validation', () => {
    it('should validate PERFORMING mode compatibility', () => {
      const performingFightList: FightList = {
        id: 'test-id',
        name: 'Performing Fight List',
        mode: MODES.PERFORMING,
        techniques: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }

      const performingTechnique: Technique = {
        name: 'Performing Technique',
        file: 'test.wav',
        modes: [MODES.PERFORMING],
        category: 'Strikes',
        priority: 'high',
        selected: true,
        weight: 1,
        targetLevel: 'HEAD',
        side: 'LEFT'
      }

      const respondingOnlyTechnique: Technique = {
        name: 'Responding Only Technique',
        file: 'test2.wav',
        modes: [MODES.RESPONDING],
        category: 'Defenses/Grabs',
        priority: 'low',
        selected: true,
        weight: 1,
        targetLevel: 'CHEST',
        side: 'RIGHT'
      }

      fightListManager['fightLists'] = [performingFightList]
      vi.mocked(mockStorageService.saveFightList).mockReturnValue(true)

      // Should succeed with compatible technique
      expect(() => fightListManager.addTechniqueToFightList(
        performingFightList.id,
        performingTechnique,
        3
      )).not.toThrow()

      // Should fail with incompatible technique
      expect(() => fightListManager.addTechniqueToFightList(
        performingFightList.id,
        respondingOnlyTechnique,
        3
      )).toThrow('does not support PERFORMING mode')
    })

    it('should validate RESPONDING mode compatibility', () => {
      const respondingFightList: FightList = {
        id: 'test-id',
        name: 'Responding Fight List',
        mode: MODES.RESPONDING,
        techniques: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }

      const respondingTechnique: Technique = {
        name: 'Responding Technique',
        file: 'test.wav',
        modes: [MODES.RESPONDING],
        category: 'Kicks',
        priority: 'medium',
        selected: true,
        weight: 1,
        targetLevel: 'GROIN',
        side: 'LEFT'
      }

      const performingOnlyTechnique: Technique = {
        name: 'Performing Only Technique',
        file: 'test2.wav',
        modes: [MODES.PERFORMING],
        category: 'Knees',
        priority: 'high',
        selected: true,
        weight: 1,
        targetLevel: 'STOMACH',
        side: 'RIGHT'
      }

      fightListManager['fightLists'] = [respondingFightList]
      vi.mocked(mockStorageService.saveFightList).mockReturnValue(true)

      // Should succeed with compatible technique
      expect(() => fightListManager.addTechniqueToFightList(
        respondingFightList.id,
        respondingTechnique,
        3
      )).not.toThrow()

      // Should fail with incompatible technique
      expect(() => fightListManager.addTechniqueToFightList(
        respondingFightList.id,
        performingOnlyTechnique,
        3
      )).toThrow('does not support RESPONDING mode')
    })
  })
})

describe('per-FightList priority', () => {
  // Shared helpers
  const makeFightList = (id: string): FightList => ({
    id,
    name: `List ${id}`,
    mode: MODES.RESPONDING,
    techniques: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  })

  const makeTechnique = (name: string, priority: 'high' | 'medium' | 'low'): Technique => ({
    name,
    file: `${name}.wav`,
    modes: [MODES.RESPONDING, MODES.PERFORMING],
    category: 'Punches',
    priority,
    selected: true,
    weight: 1,
    targetLevel: 'CHEST',
    side: 'RIGHT'
  })

  // Maps the global PriorityLevel string to the numeric seed — mirrors globalPriorityToNumber
  const toNumber = (p: 'high' | 'medium' | 'low' | string): number => {
    if (p === 'low')  return 1
    if (p === 'high') return 5
    return 3
  }

  beforeEach(() => {
    vi.mocked(mockStorageService.saveFightList).mockReturnValue(true)
  })

  it("seeds priority 5 when global priority is 'high'", () => {
    const list = makeFightList('prio-high')
    fightListManager['fightLists'] = [list]
    const tech = makeTechnique('tech-high', 'high')

    fightListManager.addTechniqueToFightList(list.id, tech, toNumber(tech.priority))

    expect(list.techniques[0].priority).toBe(5)
  })

  it("seeds priority 3 when global priority is 'medium'", () => {
    const list = makeFightList('prio-medium')
    fightListManager['fightLists'] = [list]
    const tech = makeTechnique('tech-medium', 'medium')

    fightListManager.addTechniqueToFightList(list.id, tech, toNumber(tech.priority))

    expect(list.techniques[0].priority).toBe(3)
  })

  it("seeds priority 1 when global priority is 'low'", () => {
    const list = makeFightList('prio-low')
    fightListManager['fightLists'] = [list]
    const tech = makeTechnique('tech-low', 'low')

    fightListManager.addTechniqueToFightList(list.id, tech, toNumber(tech.priority))

    expect(list.techniques[0].priority).toBe(1)
  })

  it('seeds priority 3 for any unrecognised global priority string', () => {
    const list = makeFightList('prio-unknown')
    fightListManager['fightLists'] = [list]
    const tech = { ...makeTechnique('tech-unknown', 'medium'), priority: 'ultra' as any }

    fightListManager.addTechniqueToFightList(list.id, tech, toNumber('ultra'))

    expect(list.techniques[0].priority).toBe(3)
  })

  it('stores an explicit user-override priority and leaves global Technique.priority unchanged', () => {
    const list = makeFightList('prio-override')
    fightListManager['fightLists'] = [list]
    const tech = makeTechnique('tech-override', 'medium')
    const originalGlobalPriority = tech.priority

    fightListManager.addTechniqueToFightList(list.id, tech, 4)

    expect(list.techniques[0].priority).toBe(4)
    // Global Technique.priority must not have been mutated
    expect(tech.priority).toBe(originalGlobalPriority)
  })

  it('updating priority in one FightList does not affect the same technique in another FightList', () => {
    const listA = makeFightList('list-a')
    const listB = makeFightList('list-b')
    fightListManager['fightLists'] = [listA, listB]
    const tech = makeTechnique('shared-tech', 'medium')

    // Add the same technique to both lists, both seeded at 3
    fightListManager.addTechniqueToFightList(listA.id, tech, 3)
    fightListManager.addTechniqueToFightList(listB.id, tech, 3)

    // Simulate an edit-view update on listA: set its entry to priority 5
    const updatedTechniquesA = listA.techniques.map(t => ({ ...t, priority: 5 }))
    fightListManager.updateFightList(listA.id, { techniques: updatedTechniquesA })

    expect(listA.techniques[0].priority).toBe(5)
    expect(listB.techniques[0].priority).toBe(3)
  })

  it('updating a FightList technique priority does not mutate the global Technique object', () => {
    const list = makeFightList('list-isolation')
    fightListManager['fightLists'] = [list]
    const tech = makeTechnique('isolation-tech', 'medium')
    const originalGlobalPriority = tech.priority

    fightListManager.addTechniqueToFightList(list.id, tech, 3)
    const updatedTechniques = list.techniques.map(t => ({ ...t, priority: 5 }))
    fightListManager.updateFightList(list.id, { techniques: updatedTechniques })

    // The global Technique object must be untouched
    expect(tech.priority).toBe(originalGlobalPriority)
  })

  it('removing a technique deletes the entire FightListTechnique record', () => {
    const list = makeFightList('list-remove')
    fightListManager['fightLists'] = [list]
    const tech = makeTechnique('remove-tech', 'high')

    fightListManager.addTechniqueToFightList(list.id, tech, 5)
    const entry = list.techniques[0]
    const lengthBefore = list.techniques.length

    fightListManager.removeTechniqueFromFightList(list.id, entry.id)

    expect(list.techniques).toHaveLength(lengthBefore - 1)
    expect(list.techniques.find(t => t.techniqueId === tech.name)).toBeUndefined()
  })

  it('removing a technique does not affect the global Technique.priority', () => {
    const list = makeFightList('list-remove-global')
    fightListManager['fightLists'] = [list]
    const tech = makeTechnique('remove-global-tech', 'high')
    const originalGlobalPriority = tech.priority

    fightListManager.addTechniqueToFightList(list.id, tech, 5)
    const entry = list.techniques[0]
    fightListManager.removeTechniqueFromFightList(list.id, entry.id)

    expect(tech.priority).toBe(originalGlobalPriority)
  })
})
