import { Technique, FightListTechnique, TechniqueCategory } from '../types'

interface TechniqueAddModalOptions {
  onAdd: (techniques: FightListTechnique[]) => void
  onClose: () => void
  existingTechniques?: string[] // IDs of techniques already in the fight list
}

export class TechniqueAddModal {
    private modalElement!: HTMLElement
  private searchInput!: HTMLInputElement
  private techniqueList!: HTMLElement
  private selectedTechniques: Map<string, number> = new Map() // techniqueId -> priority
  private techniques: Technique[] = []
  private currentFilter: TechniqueCategory | 'all' = 'all'
  private readonly options: TechniqueAddModalOptions

  constructor(options: TechniqueAddModalOptions) {
    this.options = options
    this.initializeElements()
    this.setupEventListeners()
  }

  private initializeElements(): void {
    this.modalElement = document.getElementById('techniqueAddModal') as HTMLElement
    this.searchInput = document.getElementById('techniqueSearch') as HTMLInputElement
    this.techniqueList = document.getElementById('availableTechniques') as HTMLElement

    // Ensure all required elements exist
    if (!this.modalElement || !this.searchInput || !this.techniqueList) {
      throw new Error('Required modal elements not found')
    }

    // Set ARIA attributes
    this.modalElement.setAttribute('role', 'dialog')
    this.modalElement.setAttribute('aria-labelledby', 'modalTitle')
    this.modalElement.setAttribute('aria-modal', 'true')
    
    this.searchInput.setAttribute('role', 'searchbox')
    this.searchInput.setAttribute('aria-label', 'Search techniques')
    
    this.techniqueList.setAttribute('role', 'listbox')
    this.techniqueList.setAttribute('aria-label', 'Available techniques')
    this.techniqueList.setAttribute('aria-multiselectable', 'true')
  }

  private setupEventListeners(): void {
    // Search input
    this.searchInput.addEventListener('input', () => this.handleSearch())

    // Category filter buttons
    const filterContainer = document.getElementById('categoryFilters')
    if (filterContainer) {
      filterContainer.addEventListener('click', (e) => this.handleCategoryFilter(e))
    }

    // Add selected button
    const addButton = document.getElementById('addSelectedTechniques')
    if (addButton) {
      addButton.addEventListener('click', () => this.handleAddSelected())
    }

    // Close button
    const closeButton = this.modalElement.querySelector('.btn-close')
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close())
    }

    // Keyboard navigation
    this.modalElement.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e))

    // Mobile swipe to dismiss
    this.setupMobileSwipe()
  }

  private handleKeyboardNavigation(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close()
      return
    }

    if (e.key === 'Enter' && document.activeElement?.classList.contains('add-btn')) {
      (document.activeElement as HTMLButtonElement).click()
      return
    }

    // Arrow key navigation for technique items
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      const items = Array.from(this.techniqueList.querySelectorAll('.technique-item:not(.disabled)'))
      const currentIndex = items.indexOf(document.activeElement as HTMLElement)
      
      let nextIndex = currentIndex
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
      } else {
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
      }

      (items[nextIndex] as HTMLElement)?.focus()
    }
  }

  private setupMobileSwipe(): void {
    let startY = 0
    let currentY = 0
    
    this.modalElement.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY
    }, { passive: true })

    this.modalElement.addEventListener('touchmove', (e) => {
      currentY = e.touches[0].clientY
      const deltaY = currentY - startY

      if (deltaY > 0) { // Only allow downward swipe
        e.preventDefault()
        this.modalElement.style.transform = `translateY(${deltaY}px)`
      }
    })

    this.modalElement.addEventListener('touchend', () => {
      const deltaY = currentY - startY
      if (deltaY > 150) { // Threshold for closing
        this.close()
      } else {
        this.modalElement.style.transform = '' // Reset position
      }
    })
  }

  private handleSearch(): void {
    const searchTerm = this.searchInput.value.toLowerCase()
    this.renderTechniques(searchTerm)
    
    // Announce search results to screen readers
    const count = this.techniqueList.querySelectorAll('.technique-item:not(.filtered)').length
    this.announceToScreenReader(`Found ${count} matching techniques`)
  }

  private announceToScreenReader(message: string): void {
    const announcer = document.getElementById('srAnnouncer') || this.createAnnouncer()
    announcer.textContent = message
  }

  private createAnnouncer(): HTMLElement {
    const announcer = document.createElement('div')
    announcer.id = 'srAnnouncer'
    announcer.setAttribute('role', 'status')
    announcer.setAttribute('aria-live', 'polite')
    announcer.style.position = 'absolute'
    announcer.style.width = '1px'
    announcer.style.height = '1px'
    announcer.style.padding = '0'
    announcer.style.margin = '-1px'
    announcer.style.overflow = 'hidden'
    announcer.style.clip = 'rect(0, 0, 0, 0)'
    announcer.style.whiteSpace = 'nowrap'
    announcer.style.border = '0'
    document.body.appendChild(announcer)
    return announcer
  }

  private handleCategoryFilter(e: Event): void {
    const target = e.target as HTMLElement
    if (target.matches('[data-category]')) {
      const category = target.dataset.category as TechniqueCategory | 'all'
      this.currentFilter = category
      this.renderTechniques(this.searchInput.value.toLowerCase())

      // Update active state and ARIA attributes
      target.parentElement?.querySelectorAll('[data-category]').forEach(btn => {
        btn.classList.toggle('active', btn === target)
        btn.setAttribute('aria-pressed', (btn === target).toString())
      })

      // Announce filter change
      this.announceToScreenReader(`Filtered by ${category === 'all' ? 'all categories' : category}`)
    }
  }

  private handleAddSelected(): void {
    const selectedTechniques: FightListTechnique[] = Array.from(this.selectedTechniques.entries())
      .map(([techniqueId, priority]) => ({
        id: crypto.randomUUID(),
        techniqueId,
        priority,
        selected: true
      }))

    this.options.onAdd(selectedTechniques)
    this.announceToScreenReader(`Added ${selectedTechniques.length} techniques to fight list`)
    this.close()
  }

  private createTechniqueElement(technique: Technique): HTMLElement {
    const element = document.createElement('div')
    element.className = 'technique-item'
    element.setAttribute('role', 'option')
    element.setAttribute('tabindex', '0')
    
    const isExisting = this.options.existingTechniques?.includes(technique.name)
    const isSelected = this.selectedTechniques.has(technique.name)

    element.classList.toggle('selected', isSelected)
    element.classList.toggle('disabled', isExisting ?? false)
    element.setAttribute('aria-selected', isSelected.toString())
    element.setAttribute('aria-disabled', (isExisting ?? false).toString())

    element.innerHTML = `
      <div class="technique-content">
        <div class="technique-header">
          <span class="technique-name">${technique.name}</span>
          <span class="technique-category" role="note">${technique.category}</span>
        </div>
        <div class="technique-controls">
          <select class="priority-select" 
                  aria-label="Priority for ${technique.name}"
                  ${isExisting ? 'disabled' : ''}>
            ${Array.from({ length: 5 }, (_, i) => i + 1).map(num => 
              `<option value="${num}" ${this.selectedTechniques.get(technique.name) === num ? 'selected' : ''}>
                Priority ${num}
              </option>`
            ).join('')}
          </select>
          <button class="btn ${isSelected ? 'btn-success' : 'btn-outline-primary'} btn-sm add-btn"
                  aria-label="${isSelected ? 'Remove' : 'Add'} ${technique.name}"
                  ${isExisting ? 'disabled' : ''}>
            <i class="fas ${isSelected ? 'fa-check' : 'fa-plus'}" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `