import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TechniqueAddModal } from '../components/TechniqueAddModal'
import { Technique, TechniqueCategory } from '../types'

describe('TechniqueAddModal', () => {
  let modal: TechniqueAddModal
  let mockTechniques: Technique[]
  const mockOnAdd = vi.fn()
  const mockOnClose = vi.fn()

  // Setup DOM elements needed for tests
  beforeEach(() => {
    // Clear mocks
    mockOnAdd.mockClear()
    mockOnClose.mockClear()

    // Setup mock DOM
    document.body.innerHTML = `
      <div id="techniqueAddModal">
        <div class="modal-content">
          <button class="btn-close"></button>
          <input id="techniqueSearch" type="text" />
          <div id="categoryFilters"></div>
          <div id="availableTechniques"></div>
          <button id="addSelectedTechniques">Add Selected</button>
        </div>
      </div>
    `

    // Setup mock techniques
    mockTechniques = [
      {
        name: 'Straight Punch',
        category: 'Punches',
        file: 'punch.mp3',
        priority: 'high',
        selected: true,
        weight: 1,
        targetLevel: 'HEAD',
        side: 'RIGHT'
      },
      {
        name: 'Front Kick',
        category: 'Kicks',
        file: 'kick.mp3',
        priority: 'medium',
        selected: true,
        weight: 1,
        targetLevel: 'STOMACH',
        side: 'LEFT'
      }
    ]

    // Create modal instance
    modal = new TechniqueAddModal({
      onAdd: mockOnAdd,
      onClose: mockOnClose
    })
  })

  it('should initialize with required elements', () => {
    expect(modal).toBeDefined()
  })

  it('should show modal with techniques', () => {
    modal.show(mockTechniques)
    
    const techniqueList = document.getElementById('availableTechniques')
    expect(techniqueList?.innerHTML).toContain('Straight Punch')
    expect(techniqueList?.innerHTML).toContain('Front Kick')
  })

  it('should filter techniques by search term', () => {
    modal.show(mockTechniques)
    
    const searchInput = document.getElementById('techniqueSearch') as HTMLInputElement
    searchInput.value = 'kick'
    searchInput.dispatchEvent(new Event('input'))

    const techniqueList = document.getElementById('availableTechniques')
    expect(techniqueList?.innerHTML).not.toContain('Straight Punch')
    expect(techniqueList?.innerHTML).toContain('Front Kick')
  })

  it('should filter techniques by category', () => {
    modal.show(mockTechniques)
    
    const categoryFilters = document.getElementById('categoryFilters')
    const kicksFilter = document.createElement('button')
    kicksFilter.dataset.category = 'Kicks'
    categoryFilters?.appendChild(kicksFilter)
    
    kicksFilter.click()

    const techniqueList = document.getElementById('availableTechniques')
    expect(techniqueList?.innerHTML).not.toContain('Straight Punch')
    expect(techniqueList?.innerHTML).toContain('Front Kick')
  })

  it('should handle technique selection', () => {
    modal.show(mockTechniques)
    
    const addButton = document.querySelector('.technique-item .add-btn')
    addButton?.click()

    const addSelectedButton = document.getElementById('addSelectedTechniques')
    addSelectedButton?.click()

    expect(mockOnAdd).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        techniqueId: 'Straight Punch',
        priority: expect.any(Number),
        selected: true
      })
    ]))
  })

  it('should handle modal close', () => {
    modal.show(mockTechniques)
    
    const closeButton = document.querySelector('.btn-close')
    closeButton?.click()

    expect(mockOnClose).toHaveBeenCalled()
    expect(document.getElementById('techniqueAddModal')?.style.display).toBe('none')
  })

  it('should handle priority selection', () => {
    modal.show(mockTechniques)
    
    const prioritySelect = document.querySelector('.priority-select') as HTMLSelectElement
    prioritySelect.value = '3'
    prioritySelect.dispatchEvent(new Event('change'))

    const addButton = document.querySelector('.technique-item .add-btn')
    addButton?.click()

    const addSelectedButton = document.getElementById('addSelectedTechniques')
    addSelectedButton?.click()

    expect(mockOnAdd).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        techniqueId: 'Straight Punch',
        priority: 3,
        selected: true
      })
    ]))
  })

  it('should disable existing techniques', () => {
    modal = new TechniqueAddModal({
      onAdd: mockOnAdd,
      onClose: mockOnClose,
      existingTechniques: ['Straight Punch']
    })

    modal.show(mockTechniques)
    
    const techniqueItems = document.querySelectorAll('.technique-item')
    expect(techniqueItems[0].classList.contains('disabled')).toBe(true)
    expect(techniqueItems[1].classList.contains('disabled')).toBe(false)
  })

  it('should clear selections on close', () => {
    modal.show(mockTechniques)
    
    // Select a technique
    const addButton = document.querySelector('.technique-item .add-btn')
    addButton?.click()

    // Close modal
    modal.close()

    // Reopen modal
    modal.show(mockTechniques)

    // Check that no techniques are selected
    const selectedTechniques = document.querySelectorAll('.technique-item.selected')
    expect(selectedTechniques.length).toBe(0)
  })
})