import { AudioRecordingService, RecordingState } from './AudioRecordingService';
import { vi } from 'vitest';

describe('AudioRecordingService', () => {
  let service: AudioRecordingService;
  let originalGetUserMedia: any;
  let originalIsTypeSupported: any;
  let originalMediaRecorder: any;

  beforeAll(() => {
    // Mock MediaRecorder and browser APIs
    if (!navigator.mediaDevices) {
      (navigator as any).mediaDevices = {};
    }
    originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    originalIsTypeSupported = (window as any).MediaRecorder?.isTypeSupported;
    originalMediaRecorder = (window as any).MediaRecorder;
  });

  afterAll(() => {
    if (originalGetUserMedia !== undefined) {
      navigator.mediaDevices.getUserMedia = originalGetUserMedia;
    } else {
      delete (navigator.mediaDevices as any).getUserMedia;
    }
    if (originalIsTypeSupported !== undefined) {
      (window as any).MediaRecorder.isTypeSupported = originalIsTypeSupported;
    }
    if (originalMediaRecorder !== undefined) {
      (window as any).MediaRecorder = originalMediaRecorder;
    }
  });

  beforeEach(() => {
    service = new AudioRecordingService();
  });

  it('should initialize with idle state', () => {
    expect(service.getRecordingState()).toBe('idle');
  });

  it('should throw if startRecording is called while already recording', async () => {
    // Mock getUserMedia and MediaRecorder
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    (window as any).MediaRecorder = vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      ondataavailable: null,
      onstop: null,
      onerror: null,
      state: 'inactive',
    }));
    (window as any).MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);

    await service.startRecording();
    await expect(service.startRecording()).rejects.toThrow('Already recording');
  });

  it('should handle unsupported mime type', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    (window as any).MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(false);
    await expect(service.startRecording()).rejects.toThrow('WebM/Opus format not supported by this browser');
  });

  it('should handle microphone access denied', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));
    await expect(service.startRecording()).rejects.toThrow('Microphone access denied or unavailable.');
  });

  it('should update state on pause and resume', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    (window as any).MediaRecorder = vi.fn().mockImplementation(() => {
      return {
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        ondataavailable: null,
        onstop: null,
        onerror: null,
        state: 'inactive',
      };
    });
    (window as any).MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);
    await service.startRecording();
    service.pauseRecording();
    expect(service.getRecordingState()).toBe('paused');
    service.resumeRecording();
    expect(service.getRecordingState()).toBe('recording');
  });

  it('should track duration and file size', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    (window as any).MediaRecorder = vi.fn().mockImplementation(() => {
      return {
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        ondataavailable: null,
        onstop: null,
        onerror: null,
        state: 'inactive',
      };
    });
    (window as any).MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);
    await service.startRecording();
    // Simulate data available
    const fakeBlob = new Blob(['test'], { type: 'audio/webm' });
    (service as any).mediaRecorder.ondataavailable({ data: fakeBlob });
    expect(service.getRecordingFileSize()).toBe(fakeBlob.size);
  });

  it('should call error handler on error', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    (window as any).MediaRecorder = vi.fn().mockImplementation(() => {
      return {
        start: vi.fn(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        ondataavailable: null,
        onstop: null,
        onerror: null,
        state: 'inactive',
      };
    });
    (window as any).MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);
    const handler = vi.fn();
    service.setErrorHandler(handler);
    await service.startRecording();
    const error = new Error('Recording error');
    (service as any).mediaRecorder.onerror({ error });
    expect(handler).toHaveBeenCalledWith(error);
    expect(service.getLastError()).toBe(error);
  });
});
