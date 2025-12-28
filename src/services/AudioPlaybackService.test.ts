/**
 * Unit tests for AudioPlaybackService
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioPlaybackService, PlaybackState } from './AudioPlaybackService';

describe('AudioPlaybackService', () => {
  let service: AudioPlaybackService;
  let originalAudio: any;
  let originalCreateObjectURL: any;
  let originalRevokeObjectURL: any;

  beforeEach(() => {
    service = new AudioPlaybackService();
    // Mock HTMLAudioElement
    originalAudio = globalThis.Audio;
    globalThis.Audio = vi.fn().mockImplementation((src?: string) => {
      let _src = src;
      let _currentTime = 0;
      let _duration = 10;
      let _volume = 1;
      let _paused = true;
      return {
        src: _src,
        currentTime: _currentTime,
        duration: _duration,
        volume: _volume,
        paused: _paused,
        play: vi.fn().mockImplementation(function () {
          this.paused = false;
          if (this.onplay) this.onplay();
          return Promise.resolve();
        }),
        pause: vi.fn().mockImplementation(function () {
          this.paused = true;
          if (this.onpause) this.onpause();
        }),
        onended: null,
        onerror: null,
        onplay: null,
        onpause: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });
    // Mock URL.createObjectURL and URL.revokeObjectURL
    originalCreateObjectURL = globalThis.URL?.createObjectURL;
    originalRevokeObjectURL = globalThis.URL?.revokeObjectURL;
    if (!globalThis.URL) globalThis.URL = {} as any;
    globalThis.URL.createObjectURL = vi.fn().mockImplementation(() => 'mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
    if (originalCreateObjectURL) {
      globalThis.URL.createObjectURL = originalCreateObjectURL;
    } else {
      delete globalThis.URL.createObjectURL;
    }
    if (originalRevokeObjectURL) {
      globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    } else {
      delete globalThis.URL.revokeObjectURL;
    }
  });

  it('should initialize with idle state', () => {
    expect(service.getPlaybackState()).toBe('idle');
  });

  it('should play audio and update state', async () => {
    service.playAudio(new Blob(['test'], { type: 'audio/webm' }));
    // Simulate play event
    (service as any).audio.onplay();
    expect(service.getPlaybackState()).toBe('playing');
  });

  it('should pause playback and update state', () => {
    service.playAudio(new Blob(['test'], { type: 'audio/webm' }));
    (service as any).audio.onplay();
    service.pausePlayback();
    (service as any).audio.onpause();
    expect(service.getPlaybackState()).toBe('paused');
  });

  it('should resume playback from paused state', async () => {
    service.playAudio(new Blob(['test'], { type: 'audio/webm' }));
    (service as any).audio.onplay();
    service.pausePlayback();
    (service as any).audio.onpause();
    service.resumePlayback();
    (service as any).audio.onplay();
    expect(service.getPlaybackState()).toBe('playing');
  });

  it('should stop playback and update state', () => {
    service.playAudio(new Blob(['test'], { type: 'audio/webm' }));
    (service as any).audio.onplay();
    service.stopPlayback();
    expect(service.getPlaybackState()).toBe('stopped');
  });

  it('should set and get volume', () => {
    service.playAudio(new Blob(['test'], { type: 'audio/webm' }));
    service.setVolume(0.5);
    expect((service as any).audio.volume).toBe(0.5);
  });

  it('should call error handler on playback error', () => {
    const handler = vi.fn();
    service.setErrorHandler(handler);
    service.playAudio(new Blob(['test'], { type: 'audio/webm' }));
    (service as any).audio.onerror();
    expect(handler).toHaveBeenCalled();
    expect(service.getPlaybackState()).toBe('idle');
    expect(service.getLastError()).toBeInstanceOf(Error);
  });
});
