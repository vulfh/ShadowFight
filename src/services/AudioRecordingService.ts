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

  getRecordingState(): RecordingState {
    return this.state;
  }

  async startRecording(): Promise<void> {
    if (this.state === 'recording') throw new Error('Already recording');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!MediaRecorder.isTypeSupported(this.mimeType)) {
      throw new Error('WebM/Opus format not supported by this browser');
    }
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => {
      this.state = 'stopped';
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
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume();
      this.state = 'recording';
    }
  }

  async stopRecording(): Promise<Blob> {
    if (!this.mediaRecorder || (this.state !== 'recording' && this.state !== 'paused')) {
      throw new Error('No recording in progress');
    }
    return new Promise<Blob>((resolve, reject) => {
      this.mediaRecorder!.onstop = () => {
        this.state = 'stopped';
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
