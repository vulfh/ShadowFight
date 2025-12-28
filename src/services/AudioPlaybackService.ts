/**
 * AudioPlaybackService
 * Provides audio playback functionality for voice notes using the HTMLAudioElement API.
 * Supports WebM/Opus format, playback state management, and error handling.
 *
 * Requirements reference:
 * - Must play WebM/Opus audio (see requirements.md)
 * - Must work on desktop and mobile browsers
 * - Must handle browser compatibility and errors gracefully
 * - Must support offline playback (local Blob or URL)
 * - Must provide playback state, duration, and volume control
 *
 * Usage:
 *   const player = new AudioPlaybackService();
 *   player.playAudio(blob);
 *   // ...
 *   player.pausePlayback();
 *   player.resumePlayback();
 *   player.stopPlayback();
 */

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';

export class AudioPlaybackService {
  private audio: HTMLAudioElement | null = null;
  private state: PlaybackState = 'idle';
  private lastError: Error | null = null;
  private errorCallback: ((err: Error) => void) | null = null;
  private objectUrl: string | null = null;

  /**
   * Set a callback to be invoked on playback errors.
   * @param cb Callback function receiving an Error object.
   */
  setErrorHandler(cb: (err: Error) => void) {
    this.errorCallback = cb;
  }

  /**
   * Get the last error that occurred during playback, if any.
   * @returns The last Error encountered, or null if none.
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Get the current playback state.
   * @returns The current state: 'idle', 'playing', 'paused', or 'stopped'.
   */
  getPlaybackState(): PlaybackState {
    return this.state;
  }

  /**
   * Get the current playback position in seconds.
   * @returns Current time in seconds, or 0 if not playing.
   */
  getCurrentTime(): number {
    return this.audio ? this.audio.currentTime : 0;
  }

  /**
   * Get the total duration of the audio in seconds.
   * @returns Duration in seconds, or 0 if not loaded.
   */
  getDuration(): number {
    return this.audio && !isNaN(this.audio.duration) ? this.audio.duration : 0;
  }

  /**
   * Set the playback volume (0.0 to 1.0).
   * @param volume Volume level (0.0 to 1.0)
   */
  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Play audio from a Blob or URL.
   * @param source Blob or string URL to play (WebM/Opus recommended)
   * @throws Error if playback fails or browser does not support format
   */
  playAudio(source: Blob | string): void {
    this.stopPlayback();
    this.lastError = null;
    try {
      if (this.audio) {
        this.audio.src = '';
        this.audio = null;
      }
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
      let src: string;
      if (typeof source === 'string') {
        src = source;
      } else {
        // Blob
        src = URL.createObjectURL(source);
        this.objectUrl = src;
      }
      this.audio = new Audio(src);
      this.audio.onended = () => {
        this.state = 'stopped';
      };
      this.audio.onerror = () => {
        this.state = 'idle';
        const error = new Error('Playback error or unsupported format');
        this.lastError = error;
        if (this.errorCallback) this.errorCallback(error);
      };
      this.audio.onplay = () => {
        this.state = 'playing';
      };
      this.audio.onpause = () => {
        if (this.audio && this.audio.currentTime < this.audio.duration) {
          this.state = 'paused';
        } else {
          this.state = 'stopped';
        }
      };
      this.audio.play().catch((err) => {
        const error = new Error('Failed to start playback: ' + (err instanceof Error ? err.message : String(err)));
        this.lastError = error;
        if (this.errorCallback) this.errorCallback(error);
      });
    } catch (err) {
      const error = new Error('Failed to play audio: ' + (err instanceof Error ? err.message : String(err)));
      this.lastError = error;
      if (this.errorCallback) this.errorCallback(error);
      throw error;
    }
  }

  /**
   * Pause playback if currently playing.
   */
  pausePlayback(): void {
    if (this.audio && this.state === 'playing') {
      this.audio.pause();
      // state will be updated by onpause
    }
  }

  /**
   * Resume playback if currently paused.
   */
  resumePlayback(): void {
    if (this.audio && this.state === 'paused') {
      this.audio.play().catch((err) => {
        const error = new Error('Failed to resume playback: ' + (err instanceof Error ? err.message : String(err)));
        this.lastError = error;
        if (this.errorCallback) this.errorCallback(error);
      });
      // state will be updated by onplay
    }
  }

  /**
   * Stop playback and reset to start.
   */
  stopPlayback(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.state = 'stopped';
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
