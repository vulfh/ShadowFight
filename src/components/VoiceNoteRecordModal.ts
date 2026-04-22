import { Mode } from '../constants/modes';
import { VoiceNoteService } from '../services/VoiceNoteService';

export interface VoiceNoteRecordModalOptions {
  techniqueId: string;
  mode: Mode;
  voiceNoteService: VoiceNoteService;
  onApprove: (audioBlob: Blob, title: string) => void;
  onCancel?: () => void;
}

type RecordingState = 'initial' | 'countdown' | 'recording' | 'stopped' | 'approval';

export class VoiceNoteRecordModal {
  private modal: HTMLElement;
  private options: VoiceNoteRecordModalOptions;
  private state: RecordingState = 'initial';
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordedAudioBlob: Blob | null = null;
  private recordingStartTime: number = 0;
  private recordingTimer: number | null = null;
  private countdownTimer: number | null = null;
  private readonly MAX_RECORDING_DURATION = 60000; // 1 minute in milliseconds

  constructor(options: VoiceNoteRecordModalOptions) {
    this.options = options;
    this.modal = document.createElement('div');
    this.initializeModal();
  }

  private initializeModal(): void {
    this.modal.className = 'voice-note-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'voice-note-modal-title');

    this.renderInitialState();
    this.setupEventListeners();
  }

  private renderInitialState(): void {
    const modalContent = `
      <div class="voice-note-modal__content">
        <header class="voice-note-modal__header">
          <h2 id="voice-note-modal-title">Record Note</h2>
          <button type="button" class="voice-note-modal__close" aria-label="Close modal">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div class="voice-note-modal__body">
          <input 
            type="text" 
            id="voice-note-title-input"
            class="voice-note-modal__input" 
            placeholder="Enter note title here"
            aria-label="Note title"
          />
          <div class="voice-note-modal__error" id="mic-error" role="alert" aria-live="polite" style="display: none;"></div>
          <div class="voice-note-modal__status" id="recording-status"></div>
          <div class="voice-note-modal__progress-container" id="progress-container" style="display: none;">
            <div class="voice-note-modal__progress-bar" id="progress-bar"></div>
            <div class="voice-note-modal__progress-text" id="progress-text">0:00 / 1:00</div>
          </div>
        </div>
        <footer class="voice-note-modal__footer">
          <button type="button" class="voice-note-modal__button voice-note-modal__button--cancel" id="cancel-btn">
            Cancel
          </button>
          <button type="button" class="voice-note-modal__button voice-note-modal__button--primary" id="action-btn">
            Start Recording
          </button>
        </footer>
      </div>
    `;

    this.modal.innerHTML = modalContent;
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.modal.querySelector('.voice-note-modal__close');
    closeBtn?.addEventListener('click', () => this.cancel());

    // Cancel button
    const cancelBtn = this.modal.querySelector('#cancel-btn');
    cancelBtn?.addEventListener('click', () => this.handleCancelClick());

    // Action button (Start Recording / Stop)
    const actionBtn = this.modal.querySelector('#action-btn');
    actionBtn?.addEventListener('click', () => this.handleActionClick());

    // Escape key to cancel
    document.addEventListener('keydown', this.handleEscapeKey);

    // Close on outside click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.cancel();
      }
    });
  }

  private handleEscapeKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.cancel();
    }
  };

  private handleCancelClick(): void {
    if (this.state === 'countdown') {
      this.stopCountdown();
    }
    if (this.state === 'recording') {
      this.stopRecording();
    }
    this.cancel();
  }

  private async handleActionClick(): Promise<void> {
    if (this.state === 'initial') {
      await this.startCountdown();
    } else if (this.state === 'recording') {
      this.stopRecording();
    }
  }

  private async startCountdown(): Promise<void> {
    this.state = 'countdown';
    const statusElement = this.modal.querySelector('#recording-status') as HTMLElement;
    const actionBtn = this.modal.querySelector('#action-btn') as HTMLButtonElement;
    
    actionBtn.disabled = true;
    actionBtn.textContent = 'Starting...';

    let count = 5;
    statusElement.textContent = `Recording starts in ${count}...`;

    this.countdownTimer = window.setInterval(() => {
      count--;
      if (count > 0) {
        statusElement.textContent = `Recording starts in ${count}...`;
      } else {
        this.stopCountdown();
        this.startRecording();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.state = 'recording';
      this.recordingStartTime = Date.now();

      const statusElement = this.modal.querySelector('#recording-status') as HTMLElement;
      const actionBtn = this.modal.querySelector('#action-btn') as HTMLButtonElement;
      const progressContainer = this.modal.querySelector('#progress-container') as HTMLElement;

      statusElement.textContent = 'Recording started...';
      actionBtn.disabled = false;
      actionBtn.textContent = 'Stop';
      actionBtn.classList.remove('voice-note-modal__button--primary');
      actionBtn.classList.add('voice-note-modal__button--danger');
      progressContainer.style.display = 'block';

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();

      // Update progress bar
      this.recordingTimer = window.setInterval(() => {
        this.updateProgress();
      }, 100);

      // Auto-stop after 1 minute
      setTimeout(() => {
        if (this.state === 'recording') {
          this.stopRecording();
        }
      }, this.MAX_RECORDING_DURATION);

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.state = 'initial';
      this.showMicError(error instanceof Error ? error.message : 'Microphone unavailable');

      const actionBtn = this.modal.querySelector('#action-btn') as HTMLButtonElement;
      actionBtn.disabled = true;
      actionBtn.textContent = 'Start Recording';

      const statusElement = this.modal.querySelector('#recording-status') as HTMLElement;
      statusElement.textContent = '';
    }
  }

  private updateProgress(): void {
    const elapsed = Date.now() - this.recordingStartTime;
    const percentage = Math.min((elapsed / this.MAX_RECORDING_DURATION) * 100, 100);
    const elapsedSeconds = Math.floor(elapsed / 1000);
    const totalSeconds = Math.floor(this.MAX_RECORDING_DURATION / 1000);

    const progressBar = this.modal.querySelector('#progress-bar') as HTMLElement;
    const progressText = this.modal.querySelector('#progress-text') as HTMLElement;

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }

    if (progressText) {
      progressText.textContent = `${this.formatTime(elapsedSeconds)} / ${this.formatTime(totalSeconds)}`;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private stopRecording(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.mediaRecorder && this.state === 'recording') {
      this.state = 'stopped';
      
      this.mediaRecorder.onstop = () => {
        this.recordedAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.showApprovalStep();
      };

      this.mediaRecorder.stop();
    }
  }

  private showApprovalStep(): void {
    this.state = 'approval';
    
    // Get the title from the initial input
    const initialTitleInput = this.modal.querySelector('#voice-note-title-input') as HTMLInputElement;
    const initialTitle = initialTitleInput?.value.trim() || '';

    const modalContent = `
      <div class="voice-note-modal__content">
        <header class="voice-note-modal__header">
          <h2 id="voice-note-modal-title">Note Approval</h2>
          <button type="button" class="voice-note-modal__close" aria-label="Close modal">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div class="voice-note-modal__body">
          <input 
            type="text" 
            id="approval-title-input"
            class="voice-note-modal__input" 
            placeholder="Note name"
            value="${initialTitle}"
            aria-label="Note title"
          />
          <div class="voice-note-modal__error" id="approval-error" role="alert" aria-live="polite"></div>
          <button type="button" class="voice-note-modal__button voice-note-modal__button--secondary" id="play-note-btn">
            <i class="fas fa-play me-2"></i>Play the note
          </button>
        </div>
        <footer class="voice-note-modal__footer">
          <button type="button" class="voice-note-modal__button voice-note-modal__button--cancel" id="dismiss-btn">
            Dismiss
          </button>
          <button type="button" class="voice-note-modal__button voice-note-modal__button--primary" id="approve-btn">
            Approve
          </button>
        </footer>
      </div>
    `;

    this.modal.innerHTML = modalContent;
    this.setupApprovalEventListeners();
  }

  private setupApprovalEventListeners(): void {
    // Close button
    const closeBtn = this.modal.querySelector('.voice-note-modal__close');
    closeBtn?.addEventListener('click', () => this.dismiss());

    // Dismiss button
    const dismissBtn = this.modal.querySelector('#dismiss-btn');
    dismissBtn?.addEventListener('click', () => this.dismiss());

    // Approve button
    const approveBtn = this.modal.querySelector('#approve-btn');
    approveBtn?.addEventListener('click', () => this.approve());

    // Play note button
    const playBtn = this.modal.querySelector('#play-note-btn');
    playBtn?.addEventListener('click', () => this.playRecordedNote());

    // Escape key to dismiss
    document.addEventListener('keydown', this.handleApprovalEscapeKey);

    // Close on outside click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.dismiss();
      }
    });

    // Clear error on input
    const titleInput = this.modal.querySelector('#approval-title-input') as HTMLInputElement;
    titleInput?.addEventListener('input', () => {
      this.clearApprovalError();
    });
  }

  private handleApprovalEscapeKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.dismiss();
    }
  };

  private playRecordedNote(): void {
    if (!this.recordedAudioBlob) {
      return;
    }

    const audioUrl = URL.createObjectURL(this.recordedAudioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      console.error('Error playing recorded note:', error);
      this.showApprovalError('Failed to play the note');
    };

    audio.play().catch(error => {
      console.error('Failed to play audio:', error);
      this.showApprovalError('Failed to play the note');
    });
  }

  private approve(): void {
    const titleInput = this.modal.querySelector('#approval-title-input') as HTMLInputElement;
    const title = titleInput.value.trim();

    // Validate non-empty title
    if (!title) {
      this.showApprovalError('Note title cannot be empty');
      titleInput.focus();
      return;
    }

    // Validate unique title per technique+mode
    if (!this.options.voiceNoteService.isTitleUnique(this.options.techniqueId, this.options.mode, title)) {
      this.showApprovalError('A note with this title already exists for this technique and mode');
      titleInput.focus();
      return;
    }

    if (!this.recordedAudioBlob) {
      this.showApprovalError('No recording available');
      return;
    }

    this.close();
    this.options.onApprove(this.recordedAudioBlob, title);
  }

  private dismiss(): void {
    this.close();
    if (this.options.onCancel) {
      this.options.onCancel();
    }
  }

  private showApprovalError(message: string): void {
    const errorElement = this.modal.querySelector('#approval-error') as HTMLElement;
    const titleInput = this.modal.querySelector('#approval-title-input') as HTMLInputElement;
    
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
    
    if (titleInput) {
      titleInput.classList.add('voice-note-modal__input--error');
      titleInput.setAttribute('aria-invalid', 'true');
    }
  }

  private clearApprovalError(): void {
    const errorElement = this.modal.querySelector('#approval-error') as HTMLElement;
    const titleInput = this.modal.querySelector('#approval-title-input') as HTMLInputElement;
    
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
    
    if (titleInput) {
      titleInput.classList.remove('voice-note-modal__input--error');
      titleInput.removeAttribute('aria-invalid');
    }
  }

  private showMicError(systemMessage: string): void {
    const errorElement = this.modal.querySelector('#mic-error') as HTMLElement;
    
    if (errorElement) {
      errorElement.textContent = `Microphone unavailable: ${systemMessage}`;
      errorElement.style.display = 'block';
    }
  }

  private cancel(): void {
    this.stopCountdown();
    
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.close();
    if (this.options.onCancel) {
      this.options.onCancel();
    }
  }

  private close(): void {
    document.removeEventListener('keydown', this.handleEscapeKey);
    document.removeEventListener('keydown', this.handleApprovalEscapeKey);
    if (this.modal.parentElement) {
      document.body.removeChild(this.modal);
    }
    // Restore body overflow and padding
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  public show(): void {
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.body.appendChild(this.modal);
    document.body.style.overflow = 'hidden';
    
    // Add padding to compensate for removed scrollbar
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    // Focus the title input
    const titleInput = this.modal.querySelector('#voice-note-title-input') as HTMLInputElement;
    if (titleInput) {
      titleInput.focus();
    }
  }
}
