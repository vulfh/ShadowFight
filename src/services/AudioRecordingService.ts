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

  getRecordingState(): RecordingState {
    return this.state;
  }

  /**
   * Returns the current recording duration in milliseconds.
   * If recording is active, returns elapsed time. If stopped, returns total duration.
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
  getRecordingFileSize(): number {
    return this.chunks.reduce((acc, chunk) => acc + (chunk instanceof Blob ? chunk.size : (typeof chunk === 'string' ? chunk.length : 0)), 0);
  }

  async startRecording(): Promise<void> {
    if (this.state === 'recording') throw new Error('Already recording');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!MediaRecorder.isTypeSupported(this.mimeType)) {
      throw new Error('WebM/Opus format not supported by this browser');
    }
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
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
      throw e.error || new Error('Recording error');
    };
    this.mediaRecorder.start();
    this.state = 'recording';
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause();
      this.state = 'paused';
      this.stopTime = Date.now();
      this.duration = this.startTime !== null && this.stopTime !== null ? this.stopTime - this.startTime : 0;
    }
  }

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

  async stopRecording(): Promise<Blob> {
    if (!this.mediaRecorder || (this.state !== 'recording' && this.state !== 'paused')) {
      throw new Error('No recording in progress');
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
        reject(e.error || new Error('Recording error'));
      };
      this.mediaRecorder!.stop();
    });
  }

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
