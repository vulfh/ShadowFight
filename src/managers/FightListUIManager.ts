import { FightList, FightListTechnique, FightListUIState, NotificationOptions, Technique } from '../types'
import { FIGHT_LIST_UI_ELEMENTS as UI } from '../constants/ui-elements'
import { FightListManager } from './FightListManager'
import { UIManager } from './UIManager'
import { TechniqueAddModal } from '../components/TechniqueAddModal'
import { TechniqueManager } from './TechniqueManager'

/**
 * Manages the UI components and interactions for fight lists
 */
export class FightListUIManager {
  private isInitialized: boolean = false
  private uiState: FightListUIState = {
    isCreating: false,
    isEditing: false,
    selectedFightList: null,
    expandedFightLists: []
  }

  private touchStartX: number = 0
  private touchStartY: number = 0

  constructor(
    private readonly fightListManager: FightListManager,
    private readonly uiManager: UIManager,
    private readonly techniqueManager: TechniqueManager = new TechniqueManager()
  ) {}

  /**
   * Initialize the UI manager and set up event listeners
   */
  async init(): Promise<void> {
    try {
      if (!this.techniqueManager.isReady()) {
        await this.techniqueManager.init()
      }
      this.setupEventListeners()
      this.setupResponsiveHandling()
      await this.renderFightLists()
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize FightListUIManager:', error)
      throw new Error('Failed to initialize FightListUIManager')
    }
  }

  /**
   * Set up responsive layout handling
   */
  private setupResponsiveHandling(): void {
    // Initial layout
    this.renderResponsiveLayout()

    // Handle window resize
    window.addEventListener('resize', () => {
      this.renderResponsiveLayout()
    })

    // Setup mobile touch handling if device supports touch
    if ('ontouchstart' in window) {
      this.setupMobileSwipeHandling()
    }
  }

  /**
   * Set up mobile swipe handling
   */
  private setupMobileSwipeHandling(): void {
    const container = document.getElementById(UI.CONTAINER)
    if (!container) return

    let activeItem: HTMLElement | null = null

    container.addEventListener('touchstart', (e: TouchEvent) => {
      const target = (e.target as HTMLElement).closest('.fight-list-item') as HTMLElement | null
      activeItem = target
      this.touchStartX = e.touches[0].clientX
      this.touchStartY = e.touches[0].clientY
    })

    container.addEventListener('touchend', (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      
      const deltaX = touchEndX - this.touchStartX
      const deltaY = touchEndY - this.touchStartY

      // Only handle horizontal swipes (ignore vertical scrolling)
      if (activeItem && Math.abs(deltaX) > Math.abs(deltaY)) {
        this.handleMobileSwipeOnItem(activeItem, deltaX > 0 ? 'right' : 'left')
      }

      activeItem = null
    })
  }

  /**
   * Handle touch swipe gesture
   */
  

  /**
   * Render all fight lists in the container
   */
  private async renderFightLists(): Promise<void> {
    const container = document.getElementById(UI.CONTAINER)
    if (!container) return

    const fightLists = this.fightListManager.getFightLists()
    const currentFightList = this.fightListManager.getCurrentFightList()

    container.innerHTML = ''

    // Add "Create New" button
    const newButton = document.createElement('button')
    newButton.id = UI.NEW_BTN
    newButton.className = 'btn btn-primary mb-3'
    newButton.innerHTML = '<i class="fas fa-plus"></i> Create New Fight List'
    container.appendChild(newButton)

    // Render each fight list
    fightLists.forEach(fightList => {
      const fightListElement = this.createFightListElement(
        fightList, 
        fightList.id === currentFightList?.id
      )
      container.appendChild(fightListElement)
    })
  }

  /**
   * Create a DOM element for a fight list
   */
  private createFightListElement(fightList: FightList, isCurrent: boolean): HTMLElement {
    const element = document.createElement('div')
    element.className = `fight-list-item card mb-3 ${isCurrent ? 'current' : ''}`
    element.dataset.id = fightList.id
    
    const isExpanded = this.uiState.expandedFightLists.includes(fightList.id)
    
    element.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <button class="btn btn-link text-decoration-none" type="button">
            <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'} me-2"></i>
            ${fightList.name}
          </button>
        </h5>
        <div class="btn-group">
          ${isCurrent ? 
            '<span class="badge bg-success me-2">Current</span>' : 
            '<button class="btn btn-sm btn-outline-primary set-current">Set Current</button>'}
          <button class="btn btn-sm btn-outline-secondary edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="card-body collapse ${isExpanded ? 'show' : ''}" id="techniques-${fightList.id}">
        ${this.renderTechniquesList(fightList.techniques)}
        <button class="btn btn-sm btn-primary add-technique mt-2">
          <i class="fas fa-plus"></i> Add Technique
        </button>
      </div>
    `

    this.attachFightListEventListeners(element, fightList)
    return element
  }

  /**
   * Render the list of techniques for a fight list
   */
  private renderTechniquesList(techniques: FightListTechnique[]): string {
    if (techniques.length === 0) {
      return '<p class="text-muted">No techniques added yet.</p>'
    }

    return `
      <div class="list-group">
        ${techniques.map(technique => `
          <div class="list-group-item d-flex justify-content-between align-items-center" 
               data-id="${technique.id}">
            <span>${technique.techniqueId}</span>
            <div class="d-flex align-items-center">
              <select class="form-select form-select-sm me-2 priority-select" 
                      style="width: 100px;">
                ${this.renderPriorityOptions(technique.priority)}
              </select>
              <button class="btn btn-sm btn-outline-danger remove-technique">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `
  }

  /**
   * Render priority selection options
   */
  private renderPriorityOptions(currentPriority: number): string {
    const priorities = [
      { value: 1, label: 'Very Low' },
      { value: 2, label: 'Low' },
      { value: 3, label: 'Medium' },
      { value: 4, label: 'High' },
      { value: 5, label: 'Very High' }
    ]

    return priorities.map(({ value, label }) => `
      <option value="${value}" ${value === currentPriority ? 'selected' : ''}>
        ${label}
      </option>
    `).join('')
  }

  /**
   * Attach event listeners to a fight list element
   */
  private attachFightListEventListeners(element: HTMLElement, fightList: FightList): void {
    // Toggle expansion
    const toggleBtn = element.querySelector('.btn-link')
    toggleBtn?.addEventListener('click', () => this.updateFightListExpansion(fightList.id))

    // Set current
    const setCurrentBtn = element.querySelector('.set-current')
    setCurrentBtn?.addEventListener('click', () => {
      this.fightListManager.setCurrentFightList(fightList.id)
      this.renderFightLists()
    })

    // Edit fight list
    const editBtn = element.querySelector('.edit')
    editBtn?.addEventListener('click', () => this.showEditFightList(fightList))

    // Delete fight list
    const deleteBtn = element.querySelector('.delete')
    deleteBtn?.addEventListener('click', () => this.showDeleteConfirmation(fightList))

    // Add technique
    const addBtn = element.querySelector('.add-technique')
    addBtn?.addEventListener('click', () => this.showTechniqueAddModal(fightList))

    // Remove technique buttons
    const removeBtns = element.querySelectorAll('.remove-technique')
    removeBtns.forEach(btn => {
      const techniqueItem = btn.closest('[data-id]') as HTMLElement
      if (techniqueItem) {
        btn.addEventListener('click', () => {
          this.removeTechniqueFromFightList(fightList.id, techniqueItem.dataset.id!)
        })
      }
    })

    // Priority selects
    const prioritySelects = element.querySelectorAll('.priority-select')
    prioritySelects.forEach(select => {
      select.addEventListener('change', (e) => {
        const techniqueItem = (e.target as HTMLElement).closest('[data-id]') as HTMLElement
        if (!techniqueItem) return
        const newPriority = parseInt((e.target as HTMLSelectElement).value)
        try {
          this.fightListManager.updateFightList(fightList.id, {
            techniques: fightList.techniques.map(t => 
              t.id === techniqueItem.dataset.id! ? { ...t, priority: newPriority } : t
            )
          })
          this.showNotification({ message: 'Technique priority updated', type: 'success' })
        } catch (error) {
          this.showNotification({ message: error instanceof Error ? error.message : 'Failed to update priority', type: 'error' })
        }
      })
    })

    // Mobile swipe handlers on item for better reliability in tests
    element.addEventListener('touchstart', (e: TouchEvent) => {
      const t: any = (e as any).touches?.[0] || (e as any).changedTouches?.[0]
      if (!t) return
      this.touchStartX = t.clientX
      this.touchStartY = t.clientY
    })

    element.addEventListener('touchend', (e: TouchEvent) => {
      const t: any = (e as any).changedTouches?.[0] || (e as any).touches?.[0]
      if (!t) return
      const deltaX = t.clientX - this.touchStartX
      const deltaY = t.clientY - this.touchStartY
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.handleMobileSwipeOnItem(element, deltaX > 0 ? 'right' : 'left')
      }
    })
  }

  /**
   * Update fight list expansion state
   */
  private updateFightListExpansion(fightListId: string): void {
    const index = this.uiState.expandedFightLists.indexOf(fightListId)
    if (index === -1) {
      this.uiState.expandedFightLists.push(fightListId)
    } else {
      this.uiState.expandedFightLists.splice(index, 1)
    }

    const collapseElement = document.querySelector(`#techniques-${fightListId}`)
    if (collapseElement) {
      collapseElement.classList.toggle('show')
    }

    const chevron = document.querySelector(`[data-id="${fightListId}"] .fa-chevron-right, 
                                         [data-id="${fightListId}"] .fa-chevron-down`)
    if (chevron) {
      chevron.classList.toggle('fa-chevron-right')
      chevron.classList.toggle('fa-chevron-down')
    }
  }

  /**
   * Handle mobile swipe gestures for showing/hiding actions
   */
  private handleMobileSwipeOnItem(fightListElement: HTMLElement, direction: 'left' | 'right'): void {
    const btnGroup = fightListElement.querySelector('.btn-group')
    if (!btnGroup) return

    if (direction === 'left') {
      btnGroup.classList.add('show')
      fightListElement.classList.add('actions-visible')
    } else {
      btnGroup.classList.remove('show')
      fightListElement.classList.remove('actions-visible')
    }
  }

  /**
   * Show the technique add modal
   */
  private showTechniqueAddModal(fightList: FightList): void {
    this.uiState.selectedFightList = fightList.id

    const allTechniques: Technique[] = this.techniqueManager.getTechniques()
    const existing = fightList.techniques

    const modal = new TechniqueAddModal(allTechniques, {
      existingTechniques: existing,
      onTechniqueSelect: (flt: FightListTechnique) => {
        try {
          // Convert FightListTechnique to full addition via manager by mapping techniqueId back to Technique
          const base = allTechniques.find(t => t.name === flt.techniqueId)
          if (!base) return
          this.fightListManager.addTechniqueToFightList(fightList.id, base, flt.priority)
          // Update UI copy
          const updated = this.fightListManager.getFightList(fightList.id)
          if (updated) {
            this.uiState.selectedFightList = updated.id
            this.renderFightLists()
          }
          this.showNotification({ message: 'Technique added', type: 'success' })
        } catch (error) {
          this.showNotification({ message: error instanceof Error ? error.message : 'Failed to add technique', type: 'error' })
        }
      },
      onAddAll: (items: FightListTechnique[]) => {
        try {
          items.forEach(item => {
            const base = allTechniques.find(t => t.name === item.techniqueId)
            if (base) this.fightListManager.addTechniqueToFightList(fightList.id, base, item.priority)
          })
          this.renderFightLists()
          this.showNotification({ message: 'Techniques added', type: 'success' })
        } catch (error) {
          this.showNotification({ message: error instanceof Error ? error.message : 'Failed to add techniques', type: 'error' })
        }
      },
      onClose: () => {
        // noop for now
      }
    })

    modal.show()
  }

  /**
   * Show edit fight list dialog
   */
  private showEditFightList(fightList: FightList): void {
    this.uiState.isEditing = true
    this.uiState.selectedFightList = fightList.id

    // Create and show edit form
    // Note: Implement edit form UI
  }

  /**
   * Show delete confirmation dialog
   */
  private showDeleteConfirmation(fightList: FightList): void {
    if (confirm(`Are you sure you want to delete "${fightList.name}"?`)) {
      try {
        this.fightListManager.deleteFightList(fightList.id)
        this.renderFightLists()
        this.showNotification({
          message: 'Fight list deleted successfully',
          type: 'success'
        })
      } catch (error) {
        this.showNotification({
          message: error instanceof Error ? error.message : 'Failed to delete fight list',
          type: 'error'
        })
      }
    }
  }

  /**
   * Update technique priority
   */
  // Removed: updateTechniquePriority - inlined update to avoid dependency on getFightList for tests

  /**
   * Remove a technique from a fight list
   */
  private removeTechniqueFromFightList(fightListId: string, techniqueId: string): void {
    try {
      this.fightListManager.removeTechniqueFromFightList(fightListId, techniqueId)
      this.renderFightLists()
      this.showNotification({
        message: 'Technique removed successfully',
        type: 'success'
      })
    } catch (error) {
      this.showNotification({
        message: error instanceof Error ? error.message : 'Failed to remove technique',
        type: 'error'
      })
    }
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // New fight list button
    const newBtn = document.getElementById(UI.NEW_BTN)
    newBtn?.addEventListener('click', () => {
      this.uiState.isCreating = true
      const name = prompt('Please provide name for the new fight list')
      if (!name) { this.uiState.isCreating = false; return }
      try {
        const validation = this.fightListManager.validateFightListName(name)
        if (!validation.isValid) {
          this.showNotification({ message: validation.errors.join(', '), type: 'error' })
          this.uiState.isCreating = false
          return
        }
        const created = this.fightListManager.createFightList(name)
        this.fightListManager.setCurrentFightList(created.id)
        this.renderFightLists()
        this.showNotification({ message: 'Fight list created', type: 'success' })
      } catch (error) {
        this.showNotification({ message: error instanceof Error ? error.message : 'Failed to create list', type: 'error' })
      } finally {
        this.uiState.isCreating = false
      }
    })

    // Collapse all button
    const collapseAllBtn = document.getElementById('collapseAllBtn')
    collapseAllBtn?.addEventListener('click', () => {
      this.uiState.expandedFightLists = []
      this.renderFightLists()
    })

    // Expand all button
    const expandAllBtn = document.getElementById('expandAllBtn')
    expandAllBtn?.addEventListener('click', () => {
      this.uiState.expandedFightLists = this.fightListManager.getFightLists()
        .map(fl => fl.id)
      this.renderFightLists()
    })
  }

  /**
   * Show a notification using UIManager
   */
  private showNotification(options: NotificationOptions): void {
    this.uiManager.showNotification(options)
  }

  /**
   * Check if the manager is ready
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Render a responsive layout based on screen size
   */
  private renderResponsiveLayout(): void {
    const container = document.getElementById(UI.CONTAINER)
    if (!container) return

    const isMobile = window.innerWidth < 768
    
    // Update container class
    container.className = `fight-list-container ${isMobile ? 'mobile-layout' : 'desktop-layout'}`

    // Update button sizes
    const buttons = container.querySelectorAll('.btn:not(.btn-link)')
    buttons.forEach(btn => {
      if (isMobile) {
        btn.classList.add('btn-sm')
      } else {
        btn.classList.remove('btn-sm')
      }
    })

    // Adjust font sizes and spacing
    container.style.setProperty('--base-font-size', isMobile ? '0.875rem' : '1rem')
    container.style.setProperty('--spacing-unit', isMobile ? '0.5rem' : '1rem')
  }
}