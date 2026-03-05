import { FightList, 
        FightListTechnique,
        FightListUIState, 
        NotificationOptions, 
        Technique, 
        FightListUICallbacks,
        FightListManagerCallbacks, 
        FightListValidationResult,
        Mode } from '../types'
import { FIGHT_LIST_UI_ELEMENTS as UI } from '../constants/ui-elements'
import { MODES } from '../constants/modes'
import { FightListManager } from './FightListManager'
import { UIManager } from './UIManager'
import { TechniqueAddModal } from '../components/TechniqueAddModal'
import { ConfirmModal } from '../components/ConfirmModal'
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

  // Event flow callbacks
  private managerCallbacks: FightListManagerCallbacks | null = null

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
   * Set up manager callbacks for event flow
   */
  setManagerCallbacks(callbacks: FightListManagerCallbacks): void {
    this.managerCallbacks = callbacks
  }

  /**
   * Get UI callbacks for external components
   */
  getUICallbacks(): FightListUICallbacks {
    return {
      onCreateFightList: this.createFightList.bind(this),
      onUpdateFightList: this.updateFightList.bind(this),
      onDeleteFightList: this.deleteFightList.bind(this),
      onSetCurrentFightList: this.setCurrentFightList.bind(this),
      onAddTechnique: this.addTechnique.bind(this),
      onRemoveTechnique: this.removeTechnique.bind(this),
      onShowTechniqueModal: this.showTechniqueModal.bind(this),
      onValidateFightListName: this.validateFightListName.bind(this)
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
  async renderFightLists(): Promise<void> {
    const container = document.getElementById(UI.CONTAINER)
    if (!container) return

    const fightLists = this.fightListManager.getFightLists()
    const currentFightList = this.fightListManager.getCurrentFightList()

    container.innerHTML = ''

    // Add "Create New" button
    // const newButton = document.createElement('button')
    // newButton.id = UI.NEW_BTN
    // newButton.className = 'btn btn-primary mb-3'
    // newButton.innerHTML = '<i class="fas fa-plus"></i> Create New Fight List'
    // container.appendChild(newButton)

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
    
    // Create mode badge
    const modeBadge = fightList.mode ? 
      `<span class="badge bg-${fightList.mode === MODES.PERFORMING ? 'warning' : 'info'} me-2">
        ${fightList.mode}
      </span>` : ''
    
    element.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">
          <button class="btn btn-link text-decoration-none" type="button">
            <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'} me-2"></i>
            ${fightList.name}
          </button>
          ${modeBadge}
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
              <button class="btn btn-sm btn-outline-primary me-2 add-note-btn" 
                      title="Add Voice Note">
                <i class="fas fa-microphone"></i>
              </button>
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
    setCurrentBtn?.addEventListener('click', async () => {
      await this.setCurrentFightList(fightList.id)
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

    // Add note buttons
    const addNoteBtns = element.querySelectorAll('.add-note-btn')
    addNoteBtns.forEach(btn => {
      const techniqueItem = btn.closest('[data-id]') as HTMLElement
      if (techniqueItem) {
        btn.addEventListener('click', () => {
          this.showVoiceNoteRecordModal(fightList.id, techniqueItem.dataset.id!)
        })
      }
    })

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
      mode: fightList.mode, // Pass the fight list's mode for filtering
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
   * Show voice note recording modal
   * This will be implemented in T010 to wire up the VoiceNoteRecordModal component
   */
  private showVoiceNoteRecordModal(fightListId: string, techniqueId: string): void {
    // TODO: Implement in T010 - open VoiceNoteRecordModal with techniqueId and fight list mode
    console.log(`Add Note clicked for technique ${techniqueId} in fight list ${fightListId}`)
    this.showNotification({ 
      message: 'Voice note recording will be implemented in T008-T010', 
      type: 'info' 
    })
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
    const modal = new ConfirmModal({
      title: 'Delete Fight List',
      message: `Are you sure you want to delete "${fightList.name}"? This action cannot be undone.`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonClass: 'danger',
      onConfirm: () => {
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
      },
      onCancel: () => {
        // User cancelled, no action needed
      }
    })
    modal.show()
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
   * Show modal to create a new fight list
   */
  private showCreateFightListModal(): void {
    // Create a custom modal with mode selection
    const modalContainer = document.createElement('div')
    modalContainer.className = 'modal fade'
    modalContainer.id = 'createFightListModal'
    modalContainer.setAttribute('tabindex', '-1')
    modalContainer.setAttribute('aria-labelledby', 'createFightListModalLabel')
    modalContainer.setAttribute('aria-hidden', 'true')
    
    let selectedMode: Mode = MODES.RESPONDING // Default mode
    
    modalContainer.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="createFightListModalLabel">
              <i class="fas fa-plus-circle me-2"></i>Create New Fight List
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="createFightListForm">
              <div class="mb-3">
                <label for="fightListName" class="form-label">Fight List Name</label>
                <div class="input-group">
                  <span class="input-group-text">
                    <i class="fas fa-list"></i>
                  </span>
                  <input type="text" class="form-control" id="fightListName" required minlength="3" maxlength="50" placeholder="Enter fight list name">
                </div>
                <div class="form-text">3-50 characters, must be unique</div>
                <div class="invalid-feedback" id="nameError"></div>
              </div>
              <div class="mb-3">
                <label class="form-label">
                  <i class="fas fa-cog me-1"></i>Training Mode
                </label>
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="mode" id="modePerforming" value="${MODES.PERFORMING}">
                  <label class="form-check-label" for="modePerforming">
                    <strong><i class="fas fa-fist-raised me-1 text-warning"></i>Performing</strong>
                    <small class="d-block text-muted">Actively initiate techniques</small>
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="radio" name="mode" id="modeResponding" value="${MODES.RESPONDING}" checked>
                  <label class="form-check-label" for="modeResponding">
                    <strong><i class="fas fa-shield-alt me-1 text-info"></i>Responding</strong>
                    <small class="d-block text-muted">React to prompts and actions</small>
                  </label>
                </div>
                <div class="form-text">
                  <i class="fas fa-info-circle me-1"></i>Mode cannot be changed once techniques are added to the list.
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times me-1"></i>Cancel
            </button>
            <button type="button" class="btn btn-primary" id="createFightListBtn">
              <i class="fas fa-plus me-1"></i>Create Fight List
            </button>
          </div>
        </div>
      </div>
    `
    
    document.body.appendChild(modalContainer)
    
    // Set up event listeners
    const nameInput = modalContainer.querySelector('#fightListName') as HTMLInputElement
    const createBtn = modalContainer.querySelector('#createFightListBtn') as HTMLButtonElement
    const nameError = modalContainer.querySelector('#nameError') as HTMLElement
    const modeRadios = modalContainer.querySelectorAll('input[name="mode"]') as NodeListOf<HTMLInputElement>
    
    // Handle mode selection
    modeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          selectedMode = radio.value as Mode
        }
      })
    })
    
    // Validate name input
    const validateName = () => {
      const name = nameInput.value.trim()
      if (!name) {
        nameInput.classList.add('is-invalid')
        nameError.textContent = 'Fight list name is required'
        return false
      }
      
      if (name.length < 3) {
        nameInput.classList.add('is-invalid')
        nameError.textContent = 'Name must be at least 3 characters long'
        return false
      }
      
      const validation = this.fightListManager.validateFightListName(name)
      if (!validation.isValid) {
        nameInput.classList.add('is-invalid')
        nameError.textContent = validation.errors.join(', ')
        return false
      }
      
      nameInput.classList.remove('is-invalid')
      nameInput.classList.add('is-valid')
      nameError.textContent = ''
      return true
    }
    
    nameInput.addEventListener('input', validateName)
    nameInput.addEventListener('blur', validateName)
    
    // Handle create button
    createBtn.addEventListener('click', () => {
      if (!validateName()) return
      
      this.uiState.isCreating = true
      createBtn.disabled = true
      createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Creating...'
      
      try {
        const name = nameInput.value.trim()
        const created = this.fightListManager.createFightList(name, selectedMode)
        this.setCurrentFightList(created.id)
        this.renderFightLists()
        this.showNotification({ message: 'Fight list created successfully', type: 'success' })
        
        // Close modal
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalContainer)
        modal?.hide()
      } catch (error) {
        this.showNotification({ message: error instanceof Error ? error.message : 'Failed to create list', type: 'error' })
        createBtn.disabled = false
        createBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Create Fight List'
      } finally {
        this.uiState.isCreating = false
      }
    })
    
    // Handle form submission
    const form = modalContainer.querySelector('#createFightListForm') as HTMLFormElement
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      createBtn.click()
    })
    
    // Clean up modal when hidden
    modalContainer.addEventListener('hidden.bs.modal', () => {
      document.body.removeChild(modalContainer)
      this.uiState.isCreating = false
    })
    
    // Show modal
    const modal = new (window as any).bootstrap.Modal(modalContainer)
    modal.show()
    
    // Focus on name input
    modalContainer.addEventListener('shown.bs.modal', () => {
      nameInput.focus()
    })
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // New fight list button
    const newBtn = document.getElementById(UI.NEW_BTN)
    newBtn?.addEventListener('click', () => {
      this.showCreateFightListModal()
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

  // UI→Manager Callback Implementations
  private async createFightList(name: string, mode: Mode = MODES.RESPONDING): Promise<FightList> {
    try {
      const fightList = this.fightListManager.createFightList(name, mode)
      this.managerCallbacks?.onFightListsChanged(this.fightListManager.getFightLists())
      this.showNotification({ message: 'Fight list created', type: 'success' })
      return fightList
    } catch (error) {
      this.showNotification({ 
        message: error instanceof Error ? error.message : 'Failed to create fight list', 
        type: 'error' 
      })
      throw error
    }
  }

  private async updateFightList(id: string, updates: Partial<FightList>): Promise<void> {
    try {
      this.fightListManager.updateFightList(id, updates)
      this.managerCallbacks?.onFightListsChanged(this.fightListManager.getFightLists())
      this.showNotification({ message: 'Fight list updated', type: 'success' })
    } catch (error) {
      this.showNotification({ 
        message: error instanceof Error ? error.message : 'Failed to update fight list', 
        type: 'error' 
      })
      throw error
    }
  }

  private async deleteFightList(id: string): Promise<void> {
    try {
      this.fightListManager.deleteFightList(id)
      this.managerCallbacks?.onFightListsChanged(this.fightListManager.getFightLists())
      this.showNotification({ message: 'Fight list deleted', type: 'success' })
    } catch (error) {
      this.showNotification({ 
        message: error instanceof Error ? error.message : 'Failed to delete fight list', 
        type: 'error' 
      })
      throw error
    }
  }

  private async setCurrentFightList(id: string | null): Promise<void> {
    try {
      this.fightListManager.setCurrentFightList(id)
      this.managerCallbacks?.onCurrentFightListChanged(id)
      this.showNotification({ 
        message: id ? 'Current fight list updated' : 'Current fight list cleared', 
        type: 'info' 
      })
    } catch (error) {
      this.showNotification({ 
        message: error instanceof Error ? error.message : 'Failed to set current fight list', 
        type: 'error' 
      })
      throw error
    }
  }

  private async addTechnique(fightListId: string, technique: Technique, priority: number): Promise<void> {
    try {
      this.fightListManager.addTechniqueToFightList(fightListId, technique, priority)
      this.managerCallbacks?.onFightListsChanged(this.fightListManager.getFightLists())
      this.showNotification({ message: 'Technique added', type: 'success' })
    } catch (error) {
      this.showNotification({ 
        message: error instanceof Error ? error.message : 'Failed to add technique', 
        type: 'error' 
      })
      throw error
    }
  }

  private async removeTechnique(fightListId: string, techniqueId: string): Promise<void> {
    try {
      this.fightListManager.removeTechniqueFromFightList(fightListId, techniqueId)
      this.managerCallbacks?.onFightListsChanged(this.fightListManager.getFightLists())
      this.showNotification({ message: 'Technique removed', type: 'success' })
    } catch (error) {
      this.showNotification({ 
        message: error instanceof Error ? error.message : 'Failed to remove technique', 
        type: 'error' 
      })
      throw error
    }
  }

  private showTechniqueModal(fightListId: string): void {
    const fightList = this.fightListManager.getFightList(fightListId)
    if (fightList) {
      this.showTechniqueAddModal(fightList)
    }
  }

  private validateFightListName(name: string): FightListValidationResult {
    return this.fightListManager.validateFightListName(name)
  }
}