/**
 * AudioRecordingService
 * Provides audio recording functionality using the MediaRecorder API.
 * Supports WebM/Opus format, state management, and error handling.
 *
 * Usage:
 *   const recorder = new AudioRecordingService();
 *   await recorder.startRecording();
 *   // ...
 *   const audioBlob = await recorder.stopRecording();
 */

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

/**
 * AudioRecordingService provides in-app audio recording for voice notes using the MediaRecorder API.
 *
 * - Records in WebM/Opus format for browser compatibility and efficient storage (see requirements.md).
 * - Manages recording state (idle, recording, paused, stopped), duration, and file size.
 * - Handles browser compatibility and errors gracefully, invoking error callbacks as needed.
 * - Designed for use in both desktop and mobile browsers, supporting offline recording.
 *
 * @class AudioRecordingService
 */
export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private state: RecordingState = 'idle';
  private mimeType: string = 'audio/webm;codecs=opus';
  private stream: MediaStream | null = null;
  private startTime: number | null = null;
  private stopTime: number | null = null;
  private duration: number = 0; // in milliseconds
  private fileSize: number = 0; // in bytes
  private lastError: Error | null = null;
  private errorCallback: ((err: Error) => void) | null = null;

  /**
   * Set a callback to be invoked on recording errors.
   */
  /**
   * Set a callback to be invoked on recording errors.
   *
   * @param cb Callback function receiving an Error object.
   */
  setErrorHandler(cb: (err: Error) => void) {
    this.errorCallback = cb;
  }

  /**
   * Get the last error that occurred during recording, if any.
   */
  /**
   * Get the last error that occurred during recording, if any.
   *
   * @returns The last Error encountered, or null if none.
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Get the current recording state.
   *
   * @returns The current state: 'idle', 'recording', 'paused', or 'stopped'.
   */
  getRecordingState(): RecordingState {
    return this.state;
  }

  /**
   * Returns the current recording duration in milliseconds.
   * If recording is active, returns elapsed time. If stopped, returns total duration.
   */
  /**
   * Returns the current recording duration in milliseconds.
   * If recording is active, returns elapsed time. If stopped, returns total duration.
   *
   * @returns Duration in milliseconds.
   */
  getRecordingDuration(): number {
    if (this.state === 'recording' && this.startTime !== null) {
      return Date.now() - this.startTime;
    }
    if (this.state === 'paused' && this.startTime !== null && this.stopTime !== null) {
      return this.stopTime - this.startTime;
    }
    return this.duration;
  }

  /**
   * Returns the current file size in bytes (sum of all chunks so far).
   */
  /**
   * Returns the current file size in bytes (sum of all chunks so far).
   *
   * @returns File size in bytes.
   */
  getRecordingFileSize(): number {
    return this.chunks.reduce((acc, chunk) => acc + (chunk instanceof Blob ? chunk.size : (typeof chunk === 'string' ? chunk.length : 0)), 0);
  }

  /**
   * Start recording audio using the MediaRecorder API.
   *
   * - Requests microphone access (prompts user if needed).
   * - Uses WebM/Opus format for compatibility and quality.
   * - Handles browser compatibility and errors (see requirements.md).
   * - Updates state, duration, and file size.
   *
   * @throws Error if already recording, microphone access denied, or browser unsupported.
   * @returns Promise that resolves when recording starts.
   */
  async startRecording(): Promise<void> {
    if (this.state === 'recording') throw new Error('Already recording');
    this.lastError = null;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const error = new Error('Microphone access denied or unavailable.');
      this.lastError = error;
      if (this.errorCallback) this.errorCallback(error);
      throw error;
    }
    if (!MediaRecorder.isTypeSupported(this.mimeType)) {
      const error = new Error('WebM/Opus format not supported by this browser');
      this.lastError = error;
      if (this.errorCallback) this.errorCallback(error);
      this.cleanupStream();
      throw error;
    }
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    } catch (err) {
      const error = new Error('Failed to initialize MediaRecorder: ' + (err instanceof Error ? err.message : String(err)));
      this.lastError = error;
      if (this.errorCallback) this.errorCallback(error);
      this.cleanupStream();
      throw error;
    }
    this.chunks = [];
    this.startTime = Date.now();
    this.stopTime = null;
    this.duration = 0;
    this.fileSize = 0;
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
        this.fileSize += e.data.size;
      }
    };
    this.mediaRecorder.onstop = () => {
      this.state = 'stopped';
      this.stopTime = Date.now();
      this.duration = this.startTime !== null && this.stopTime !== null ? this.stopTime - this.startTime : 0;
      this.fileSize = this.getRecordingFileSize();
      this.cleanupStream();
    };
    this.mediaRecorder.onerror = (e) => {
      this.state = 'idle';
      this.cleanupStream();
      const error = e.error || new Error('Recording error');
      this.lastError = error;
      if (this.errorCallback) this.errorCallback(error);
      // Do not throw here, as it is an event handler
    };
    try {
      this.mediaRecorder.start();
      this.state = 'recording';
    } catch (err) {
      const error = new Error('Failed to start recording: ' + (err instanceof Error ? err.message : String(err)));
      this.lastError = error;
      if (this.errorCallback) this.errorCallback(error);
      this.cleanupStream();
      throw error;
    }
  }

  /**
   * Pause the current recording if active.
   *
   * - Only valid if currently recording.
   * - Updates state and duration.
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause();
      this.state = 'paused';
      this.stopTime = Date.now();
      this.duration = this.startTime !== null && this.stopTime !== null ? this.stopTime - this.startTime : 0;
    }
  }

  /**
   * Resume a paused recording.
   *
   * - Only valid if currently paused.
   * - Updates state and adjusts duration.
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume();
      this.state = 'recording';
      // Adjust startTime so duration is correct after pause/resume
      if (this.startTime !== null && this.stopTime !== null) {
        const pausedDuration = Date.now() - this.stopTime;
        this.startTime += pausedDuration;
        this.stopTime = null;
      }
    }
  }

  /**
   * Stop the current recording and return the audio as a Blob.
   *
   * - Only valid if recording or paused.
   * - Updates state, duration, and file size.
   * - Handles errors and invokes error callback if needed.
   *
   * @throws Error if no recording is in progress.
   * @returns Promise resolving to a Blob containing the recorded audio (WebM/Opus).
   */
  async stopRecording(): Promise<Blob> {
    if (!this.mediaRecorder || (this.state !== 'recording' && this.state !== 'paused')) {
      const error = new Error('No recording in progress');
      this.lastError = error;
      if (this.errorCallback) this.errorCallback(error);
      throw error;
    }
    return new Promise<Blob>((resolve, reject) => {
      this.mediaRecorder!.onstop = () => {
        this.state = 'stopped';
        this.stopTime = Date.now();
        this.duration = this.startTime !== null && this.stopTime !== null ? this.stopTime - this.startTime : 0;
        this.fileSize = this.getRecordingFileSize();
        this.cleanupStream();
        resolve(new Blob(this.chunks, { type: this.mimeType }));
      };
      this.mediaRecorder!.onerror = (e) => {
        this.state = 'idle';
        this.cleanupStream();
        const error = e.error || new Error('Recording error');
        this.lastError = error;
        if (this.errorCallback) this.errorCallback(error);
        reject(error);
      };
      try {
        this.mediaRecorder!.stop();
      } catch (err) {
        const error = new Error('Failed to stop recording: ' + (err instanceof Error ? err.message : String(err)));
        this.lastError = error;
        if (this.errorCallback) this.errorCallback(error);
        this.cleanupStream();
        reject(error);
      }
    });
  }

  /**
   * Cancel the current recording and discard all recorded data.
   *
   * - Stops recording if active or paused.
   * - Resets state, duration, and file size.
   * - Does not return a Blob.
   */
  cancelRecording(): void {
    if (this.mediaRecorder && (this.state === 'recording' || this.state === 'paused')) {
      this.mediaRecorder.stop();
      this.state = 'idle';
      this.cleanupStream();
      this.chunks = [];
      this.startTime = null;
      this.stopTime = null;
      this.duration = 0;
      this.fileSize = 0;
    }
  }

  private cleanupStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }
}
