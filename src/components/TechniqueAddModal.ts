import { Technique, FightListTechnique } from '../types';

export interface TechniqueAddModalOptions {
  onTechniqueSelect: (technique: FightListTechnique) => void;
  onAddAll?: (techniques: FightListTechnique[]) => void;
  onClose: () => void;
  existingTechniques?: FightListTechnique[];
}

const TECHNIQUE_CATEGORIES = [
  'Punches',
  'Strikes',
  'Kicks',
  'Knees',
  'Defenses/Grabs',
  'Weapons',
  'Hand-Grip'
] as const;

export class TechniqueAddModal {
  private modal: HTMLElement = document.createElement('div');
  private searchInput: HTMLInputElement = document.createElement('input');
  private categoryFilter: HTMLSelectElement = document.createElement('select');
  private techniqueList: HTMLElement = document.createElement('div');
  private techniques: Technique[];
  private filteredTechniques: Technique[];
  private options: TechniqueAddModalOptions;

  constructor(techniques: Technique[], options: TechniqueAddModalOptions) {
    this.techniques = techniques;
    this.filteredTechniques = [...techniques];
    this.options = options;
    this.initializeModal();
  }

  private initializeModal(): void {
    // Create modal container
    this.modal = document.createElement('div');
    this.modal.className = 'technique-add-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'modal-title');

    // Create modal content
    const modalContent = `
      <div class="technique-add-modal__content">
        <header class="technique-add-modal__header">
          <h2 id="modal-title">Add Techniques</h2>
          <button type="button" class="technique-add-modal__close" aria-label="Close modal">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div class="technique-add-modal__search">
          <input type="search" 
                 placeholder="Search techniques..." 
                 aria-label="Search techniques"
                 class="technique-add-modal__search-input" />
          <select class="technique-add-modal__category-filter" aria-label="Filter by category">
            <option value="">All Categories</option>
            ${TECHNIQUE_CATEGORIES.map(category => 
              `<option value="${category}">${category}</option>`
            ).join('')}
          </select>
          <button type="button" class="technique-add-modal__add-all" aria-label="Add all filtered">
            Add All
          </button>
        </div>
        <div class="technique-add-modal__list" role="listbox"></div>
      </div>
    `;

    this.modal.innerHTML = modalContent;

    // Get references to elements
    this.searchInput = this.modal.querySelector('.technique-add-modal__search-input')!;
    this.categoryFilter = this.modal.querySelector('.technique-add-modal__category-filter')!;
    this.techniqueList = this.modal.querySelector('.technique-add-modal__list')!;

    // Add event listeners
    this.setupEventListeners();
    
    // Initial render
    this.renderTechniqueList();
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.modal.querySelector('.technique-add-modal__close');
    closeBtn?.addEventListener('click', () => this.close());

    // Search input
    this.searchInput.addEventListener('input', () => this.handleSearch());

    // Category filter
    this.categoryFilter.addEventListener('change', () => this.handleFilter());

    // Add All
    const addAllBtn = this.modal.querySelector('.technique-add-modal__add-all') as HTMLButtonElement | null;
    if (addAllBtn) {
      addAllBtn.addEventListener('click', () => this.handleAddAll());
    }

    // Close on outside click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Handle keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });

    // Touch events for mobile
    this.setupTouchEvents();
  }

  private setupTouchEvents(): void {
    let startY: number;
    const content = this.modal.querySelector('.technique-add-modal__content')!;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      startY = touchEvent.touches[0].clientY;
    };

    const handleTouchMove = (e: Event) => {
      const touchEvent = e as TouchEvent;
      const deltaY = touchEvent.touches[0].clientY - startY;
      if (deltaY > 100) {
        this.close();
      }
    };

    content.addEventListener('touchstart', handleTouchStart, { passive: true });
    content.addEventListener('touchmove', handleTouchMove, { passive: true });
  }

  private handleSearch(): void {
    this.filterTechniques();
  }

  private handleFilter(): void {
    this.filterTechniques();
  }

  private filterTechniques(): void {
    const searchTerm = this.searchInput.value.toLowerCase();
    const categoryFilter = this.categoryFilter.value;

    this.filteredTechniques = this.techniques.filter(technique => {
      const matchesSearch = technique.name.toLowerCase().includes(searchTerm);
      const matchesCategory = !categoryFilter || technique.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    this.renderTechniqueList();
  }

  private renderTechniqueList(): void {
    this.techniqueList.innerHTML = '';

    this.filteredTechniques.forEach(technique => {
      const isExisting = this.options.existingTechniques?.some(
        t => t.techniqueId === technique.name
      );

      const item = document.createElement('div');
      item.className = 'technique-add-modal__item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', isExisting ? 'true' : 'false');
      
      item.innerHTML = `
        <div class="technique-item__info">
          <h3>${technique.name}</h3>
          <span class="technique-category">${technique.category}</span>
        </div>
        <div class="technique-item__actions">
          ${isExisting ? `
            <span class="technique-item__added">Added</span>
          ` : `
            <div class="technique-item__priority">
              <label>Priority:</label>
              <select class="priority-select" aria-label="Select priority">
                ${[1, 2, 3, 4, 5].map(p => 
                  `<option value="${p}">${p}</option>`
                ).join('')}
              </select>
            </div>
            <button class="technique-item__add" aria-label="Add technique">
              Add
            </button>
          `}
        </div>
      `;

      if (!isExisting) {
        const addButton = item.querySelector('.technique-item__add');
        const prioritySelect = item.querySelector('.priority-select') as HTMLSelectElement;

        addButton?.addEventListener('click', () => {
          const priority = parseInt(prioritySelect.value);
          this.handleTechniqueSelect(technique, priority);
        });
      }

      this.techniqueList.appendChild(item);
    });

    // If no results found
    if (this.filteredTechniques.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'technique-add-modal__no-results';
      noResults.textContent = 'No techniques found';
      this.techniqueList.appendChild(noResults);
    }
  }

  private handleTechniqueSelect(technique: Technique, priority: number): void {
    const fightListTechnique: FightListTechnique = {
      id: crypto.randomUUID(), // Generate unique ID
      techniqueId: technique.name,
      priority,
      selected: true
    };

    this.options.onTechniqueSelect(fightListTechnique);
    this.renderTechniqueList(); // Re-render to update UI
  }

  private handleAddAll(): void {
    if (!this.options.onAddAll) return;
    const toAdd: FightListTechnique[] = this.filteredTechniques
      .filter(t => !this.options.existingTechniques?.some(et => et.techniqueId === t.name))
      .map(t => ({ id: crypto.randomUUID(), techniqueId: t.name, priority: 3, selected: true }));
    if (toAdd.length > 0) {
      this.options.onAddAll(toAdd);
      this.renderTechniqueList();
    }
  }

  public show(): void {
    document.body.appendChild(this.modal);
    this.searchInput.focus();
    document.body.style.overflow = 'hidden'; // Prevent body scroll
  }

  public close(): void {
    document.body.removeChild(this.modal);
    document.body.style.overflow = '';
    this.options.onClose();
  }

  // Public method to update existing techniques list
  public updateExistingTechniques(techniques: FightListTechnique[]): void {
    this.options.existingTechniques = techniques;
    this.renderTechniqueList();
  }
}