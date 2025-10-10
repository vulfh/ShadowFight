export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonClass?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
}

export class ConfirmModal {
  private modal: HTMLElement;
  private options: ConfirmModalOptions;

  constructor(options: ConfirmModalOptions) {
    this.options = {
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      confirmButtonClass: 'danger',
      ...options
    };
    this.modal = document.createElement('div');
    this.initializeModal();
  }

  private initializeModal(): void {
    // Create modal container
    this.modal.className = 'confirm-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'confirm-modal-title');

    // Create modal content
    const modalContent = `
      <div class="confirm-modal__content">
        <header class="confirm-modal__header">
          <h2 id="confirm-modal-title">${this.options.title}</h2>
          <button type="button" class="confirm-modal__close" aria-label="Close modal">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div class="confirm-modal__body">
          <p class="confirm-modal__message">${this.options.message}</p>
        </div>
        <footer class="confirm-modal__footer">
          <button type="button" class="confirm-modal__button confirm-modal__button--cancel">
            ${this.options.cancelButtonText}
          </button>
          <button type="button" class="confirm-modal__button confirm-modal__button--confirm confirm-modal__button--${this.options.confirmButtonClass}">
            ${this.options.confirmButtonText}
          </button>
        </footer>
      </div>
    `;

    this.modal.innerHTML = modalContent;

    // Add event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.modal.querySelector('.confirm-modal__close');
    closeBtn?.addEventListener('click', () => this.cancel());

    // Cancel button
    const cancelBtn = this.modal.querySelector('.confirm-modal__button--cancel');
    cancelBtn?.addEventListener('click', () => this.cancel());

    // Confirm button
    const confirmBtn = this.modal.querySelector('.confirm-modal__button--confirm');
    confirmBtn?.addEventListener('click', () => this.confirm());

    // Escape key to cancel
    document.addEventListener('keydown', this.handleEscapeKey);

    // Close on outside click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.cancel();
      }
    });

    // Touch events for mobile
    this.setupTouchEvents();
  }

  private handleEscapeKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.cancel();
    }
  };

  private setupTouchEvents(): void {
    let startY: number;
    const content = this.modal.querySelector('.confirm-modal__content')!;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      startY = touchEvent.touches[0].clientY;
    };

    const handleTouchMove = (e: Event) => {
      const touchEvent = e as TouchEvent;
      const deltaY = touchEvent.touches[0].clientY - startY;
      if (deltaY > 100) {
        this.cancel();
      }
    };

    content.addEventListener('touchstart', handleTouchStart, { passive: true });
    content.addEventListener('touchmove', handleTouchMove, { passive: true });
  }

  private confirm(): void {
    this.close();
    this.options.onConfirm();
  }

  private cancel(): void {
    this.close();
    if (this.options.onCancel) {
      this.options.onCancel();
    }
  }

  private close(): void {
    document.removeEventListener('keydown', this.handleEscapeKey);
    if (this.modal.parentElement) {
      document.body.removeChild(this.modal);
    }
    document.body.style.overflow = '';
  }

  public show(): void {
    document.body.appendChild(this.modal);
    document.body.style.overflow = 'hidden'; // Prevent body scroll
    
    // Focus the confirm button for accessibility
    const confirmBtn = this.modal.querySelector('.confirm-modal__button--confirm') as HTMLElement;
    if (confirmBtn) {
      confirmBtn.focus();
    }
  }
}
