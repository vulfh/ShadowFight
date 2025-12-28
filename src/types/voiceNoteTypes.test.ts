import { VoiceNote, isVoiceNote, VoiceNoteMetadata, isVoiceNoteMetadata, RecordingState, PlaybackState, VoiceNoteStorageResult } from './index';

describe('VoiceNote Types', () => {
  it('should validate a correct VoiceNote object', () => {
    const note: VoiceNote = {
      techniqueId: 'tech1',
      mode: 'PERFORMING',
      blob: new Blob(['test'], { type: 'audio/webm' }),
      duration: 2.5,
      fileSize: 12345,
      createdAt: '2025-12-28T12:00:00Z',
      lastModified: '2025-12-28T12:00:00Z',
    };
    expect(isVoiceNote(note)).toBe(true);
  });

  it('should invalidate an incorrect VoiceNote object', () => {
    const badNote = {
      techniqueId: 'tech1',
      mode: 'INVALID',
      blob: {},
      duration: -1,
      fileSize: -1,
      createdAt: '',
      lastModified: '',
    };
    expect(isVoiceNote(badNote)).toBe(false);
  });

  it('should validate VoiceNoteMetadata', () => {
    const meta: VoiceNoteMetadata = {
      techniqueId: 'tech1',
      mode: 'RESPONDING',
      duration: 3.2,
      fileSize: 10000,
      createdAt: '2025-12-28T12:00:00Z',
      lastModified: '2025-12-28T12:00:00Z',
    };
    expect(isVoiceNoteMetadata(meta)).toBe(true);
  });
});

describe('RecordingState and PlaybackState', () => {
  it('should allow valid RecordingState values', () => {
    const states: RecordingState[] = ['idle', 'recording', 'paused', 'stopped', 'error'];
    expect(states).toContain('idle');
    expect(states).toContain('recording');
  });
  it('should allow valid PlaybackState values', () => {
    const states: PlaybackState[] = ['idle', 'playing', 'paused', 'stopped', 'error'];
    expect(states).toContain('playing');
    expect(states).toContain('stopped');
  });
});

describe('VoiceNoteStorageResult', () => {
  it('should allow success and error results', () => {
    const ok: VoiceNoteStorageResult = { success: true, id: 'note1' };
    const fail: VoiceNoteStorageResult = { success: false, error: 'Quota exceeded' };
    expect(ok.success).toBe(true);
    expect(fail.success).toBe(false);
  });
});
