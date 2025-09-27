import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FightListUIManager } from '../managers/FightListUIManager'
import { FightListManager } from '../managers/FightListManager'
import { UIManager } from '../managers/UIManager'
import { FightList } from '../types'

describe('FightListUIManager', () => {
  let fightListUIManager: FightListUIManager
  let mockContainer: HTMLElement
  let mockFightListManager: FightListManager
  let mockUIManager: UIManager

  beforeEach(() => {
    // Create mock DOM elements
    mockContainer = document.createElement('div')
    mockContainer.id = 'fightListContainer'
    document.body.appendChild(mockContainer)

    // Create mock managers with proper type assertions for vi.fn()
    mockFightListManager = {
      getFightLists: vi.fn() as unknown as () => FightList[],
      getCurrentFightList: vi.fn() as unknown as () => FightList | null,
      setCurrentFightList: vi.fn() as unknown as (id: string) => void,
      updateFightList: vi.fn() as unknown as (id: string, updates: Partial<FightList>) => void,
      removeTechniqueFromFightList: vi.fn() as unknown as (fightListId: string, techniqueId: string) => void,
      deleteFightList: vi.fn() as unknown as (id: string) => void,
      init: vi.fn() as unknown as () => Promise<void>,
      isReady: vi.fn(() => true) as unknown as () => boolean
    } as FightListManager

    mockUIManager = {
      showNotification: vi.fn() as unknown as (options: any) => void,
      init: vi.fn() as unknown as () => Promise<void>,
      isReady: vi.fn(() => true) as unknown as () => boolean
    } as UIManager

    fightListUIManager = new FightListUIManager(mockFightListManager, mockUIManager)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('should initialize successfully', async () => {
    const mockFightLists: FightList[] = [{
      id: '1',
      name: 'Test List',
      techniques: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }]

    vi.mocked(mockFightListManager.getFightLists).mockReturnValue(mockFightLists)
    vi.mocked(mockFightListManager.getCurrentFightList).mockReturnValue(null)

    await fightListUIManager.init()

    expect(fightListUIManager.isReady()).toBe(true)
    expect(mockFightListManager.getFightLists).toHaveBeenCalled()
    expect(mockContainer.innerHTML).toContain('Create New Fight List')
    expect(mockContainer.innerHTML).toContain('Test List')
  })

  it('should handle fight list expansion', async () => {
    const mockFightLists: FightList[] = [{
      id: '1',
      name: 'Test List',
      techniques: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }]

    vi.mocked(mockFightListManager.getFightLists).mockReturnValue(mockFightLists)
    await fightListUIManager.init()

    const toggleButton = mockContainer.querySelector('.btn-link') as HTMLElement
    toggleButton.click()

    // Check if expansion state is updated
    expect(mockContainer.querySelector('.collapse')?.classList.contains('show')).toBe(true)
  })

  it('should handle setting current fight list', async () => {
    const mockFightLists: FightList[] = [{
      id: '1',
      name: 'Test List',
      techniques: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }]

    vi.mocked(mockFightListManager.getFightLists).mockReturnValue(mockFightLists)
    await fightListUIManager.init()

    const setCurrentButton = mockContainer.querySelector('.set-current') as HTMLElement
    setCurrentButton.click()

    expect(mockFightListManager.setCurrentFightList).toHaveBeenCalledWith('1')
  })

  it('should handle technique removal', async () => {
    const mockFightLists: FightList[] = [{
      id: '1',
      name: 'Test List',
      techniques: [{
        id: 'tech1',
        techniqueId: 'Test Technique',
        priority: 3,
        selected: true
      }],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }]

    vi.mocked(mockFightListManager.getFightLists).mockReturnValue(mockFightLists)
    await fightListUIManager.init()

    const removeButton = mockContainer.querySelector('.remove-technique') as HTMLElement
    removeButton.click()

    expect(mockFightListManager.removeTechniqueFromFightList).toHaveBeenCalledWith('1', 'tech1')
  })

  it('should handle priority updates', async () => {
    const mockFightLists: FightList[] = [{
      id: '1',
      name: 'Test List',
      techniques: [{
        id: 'tech1',
        techniqueId: 'Test Technique',
        priority: 3,
        selected: true
      }],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }]

    vi.mocked(mockFightListManager.getFightLists).mockReturnValue(mockFightLists)
    await fightListUIManager.init()

    const prioritySelect = mockContainer.querySelector('.priority-select') as HTMLSelectElement
    prioritySelect.value = '5'
    prioritySelect.dispatchEvent(new Event('change'))

    expect(mockFightListManager.updateFightList).toHaveBeenCalledWith('1', {
      techniques: [{
        id: 'tech1',
        techniqueId: 'Test Technique',
        priority: 5,
        selected: true
      }]
    })
  })

  it('should handle delete confirmation', async () => {
    const mockFightLists: FightList[] = [{
      id: '1',
      name: 'Test List',
      techniques: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }]

    vi.mocked(mockFightListManager.getFightLists).mockReturnValue(mockFightLists)
    await fightListUIManager.init()

    // Mock confirm dialog
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const deleteButton = mockContainer.querySelector('.delete') as HTMLElement
    deleteButton.click()

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Test List"?')
    expect(mockFightListManager.deleteFightList).toHaveBeenCalledWith('1')
  })

  it('should handle mobile touch events', async () => {
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', { value: () => {} })

    const mockFightLists: FightList[] = [{
      id: '1',
      name: 'Test List',
      techniques: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }]

    vi.mocked(mockFightListManager.getFightLists).mockReturnValue(mockFightLists)
    await fightListUIManager.init()

    const fightListItem = mockContainer.querySelector('.fight-list-item') as HTMLElement
    
    // Simulate left swipe
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 200, clientY: 100 } as Touch]
    })

    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 100, clientY: 100 } as Touch]
    })

    fightListItem.dispatchEvent(touchStart)
    fightListItem.dispatchEvent(touchEnd)

    // Actions should be visible
    expect(fightListItem.querySelector('.btn-group')?.classList.contains('show')).toBe(true)
    expect(fightListItem.classList.contains('actions-visible')).toBe(true)
  })

  it('should handle responsive layout changes', async () => {
    const mockFightLists: FightList[] = [{
      id: '1',
      name: 'Test List',
      techniques: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }]

    vi.mocked(mockFightListManager.getFightLists).mockReturnValue(mockFightLists)
    await fightListUIManager.init()

    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
    window.dispatchEvent(new Event('resize'))

    expect(mockContainer.classList.contains('mobile-layout')).toBe(true)
    expect(mockContainer.querySelector('.btn')?.classList.contains('btn-sm')).toBe(true)

    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    window.dispatchEvent(new Event('resize'))

    expect(mockContainer.classList.contains('desktop-layout')).toBe(true)
    expect(mockContainer.querySelector('.btn')?.classList.contains('btn-sm')).toBe(false)
  })
})