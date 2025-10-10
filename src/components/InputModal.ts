export interface InputModalOptions {
  title: string;
  placeholder?: string;
  inputLabel?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  inputType?: 'text' | 'email' | 'number' | 'tel';
  maxLength?: number;
  required?: boolean;
  validator?: (value: string) => { isValid: boolean; error?: string };
  onConfirm: (value: string) => void;
  onCancel?: () => void;
}

export class InputModal {
  private modal: HTMLElement;
  private input: HTMLInputElement;
  private errorElement: HTMLElement;
  private options: InputModalOptions;

  constructor(options: InputModalOptions) {
    this.options = {
      placeholder: '',
      inputLabel: '',
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel',
      inputType: 'text',
      required: true,
      ...options
    };
    this.modal = document.createElement('div');
    this.input = document.createElement('input');
    this.errorElement = document.createElement('div');
    this.initializeModal();
  }

  private initializeModal(): void {
    // Create modal container
    this.modal.className = 'input-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'input-modal-title');

    // Create modal content
    const modalContent = `
      <div class="input-modal__content">
        <header class="input-modal__header">
          <h2 id="input-modal-title">${this.options.title}</h2>
          <button type="button" class="input-modal__close" aria-label="Close modal">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div class="input-modal__body">
          ${this.options.inputLabel ? `<label class="input-modal__label" for="input-modal-input">${this.options.inputLabel}</label>` : ''}
          <input 
            type="${this.options.inputType}" 
            id="input-modal-input"
            class="input-modal__input" 
            placeholder="${this.options.placeholder || ''}"
            ${this.options.maxLength ? `maxlength="${this.options.maxLength}"` : ''}
            ${this.options.required ? 'required' : ''}
            aria-label="${this.options.inputLabel || this.options.placeholder || 'Input'}"
          />
          <div class="input-modal__error" role="alert" aria-live="polite"></div>
        </div>
        <footer class="input-modal__footer">
          <button type="button" class="input-modal__button input-modal__button--cancel">
            ${this.options.cancelButtonText}
          </button>
          <button type="button" class="input-modal__button input-modal__button--confirm">
            ${this.options.confirmButtonText}
          </button>
        </footer>
      </div>
    `;

    this.modal.innerHTML = modalContent;

    // Get references to elements
    this.input = this.modal.querySelector('#input-modal-input')!;
    this.errorElement = this.modal.querySelector('.input-modal__error')!;

    // Add event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.modal.querySelector('.input-modal__close');
    closeBtn?.addEventListener('click', () => this.cancel());

    // Cancel button
    const cancelBtn = this.modal.querySelector('.input-modal__button--cancel');
    cancelBtn?.addEventListener('click', () => this.cancel());

    // Confirm button
    const confirmBtn = this.modal.querySelector('.input-modal__button--confirm');
    confirmBtn?.addEventListener('click', () => this.confirm());

    // Enter key to confirm
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm();
      }
    });

    // Escape key to cancel
    document.addEventListener('keydown', this.handleEscapeKey);

    // Close on outside click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.cancel();
      }
    });

    // Clear error on input
    this.input.addEventListener('input', () => {
      this.clearError();
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
    const content = this.modal.querySelector('.input-modal__content')!;

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

  private validate(value: string): { isValid: boolean; error?: string } {
    // Check required
    if (this.options.required && !value.trim()) {
      return { isValid: false, error: 'This field is required' };
    }

    // Custom validator
    if (this.options.validator) {
      return this.options.validator(value);
    }

    return { isValid: true };
  }

  private showError(message: string): void {
    this.errorElement.textContent = message;
    this.errorElement.style.display = 'block';
    this.input.classList.add('input-modal__input--error');
    this.input.setAttribute('aria-invalid', 'true');
  }

  private clearError(): void {
    this.errorElement.textContent = '';
    this.errorElement.style.display = 'none';
    this.input.classList.remove('input-modal__input--error');
    this.input.removeAttribute('aria-invalid');
  }

  private confirm(): void {
    const value = this.input.value.trim();
    const validation = this.validate(value);

    if (!validation.isValid) {
      this.showError(validation.error || 'Invalid input');
      this.input.focus();
      return;
    }

    this.close();
    this.options.onConfirm(value);
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
    this.input.focus();
    document.body.style.overflow = 'hidden'; // Prevent body scroll
  }
}
