export class AudioManager {
  private audioContext: AudioContext | null = null
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private currentSource: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private volume: number = 0.8
  private isInitialized: boolean = false

  async init(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.gainNode.gain.value = this.volume
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error)
      throw error
    }
  }

  async loadAudio(filename: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }

    if (this.audioBuffers.has(filename)) {
      return this.audioBuffers.get(filename)!
    }

    try {
      const response = await fetch(`/Sounds/${filename}`)
      if (!response.ok) {
        throw new Error(`Failed to load audio file: ${filename}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      this.audioBuffers.set(filename, audioBuffer)
      return audioBuffer
    } catch (error) {
      console.error(`Failed to load audio file ${filename}:`, error)
      throw error
    }
  }

  async preloadAudio(filenames: string[]): Promise<void> {
    const loadPromises = filenames.map(filename => this.loadAudio(filename).catch(error => {
      console.warn(`Failed to preload ${filename}:`, error)
      return null
    }))

    await Promise.all(loadPromises)
  }

  async playAudio(filename: string): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      throw new Error('AudioContext not initialized')
    }

    try {
      this.stopCurrentAudio()
      const audioBuffer = await this.loadAudio(filename)
      
      this.currentSource = this.audioContext.createBufferSource()
      this.currentSource.buffer = audioBuffer
      this.currentSource.connect(this.gainNode)
      this.currentSource.start(0)
    } catch (error) {
      console.error(`Failed to play audio ${filename}:`, error)
      throw error
    }
  }

  stopCurrentAudio(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch (error) {
        // Audio might already be stopped
      }
      this.currentSource = null
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume
    }
  }

  getVolume(): number {
    return this.volume
  }

  isPlaying(): boolean {
    return this.currentSource !== null
  }

  getLoadingProgress(): number {
    return this.audioBuffers.size
  }

  clearCache(): void {
    this.audioBuffers.clear()
  }

  getAudioContextState(): string | null {
    return this.audioContext?.state || null
  }

  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  async testAudio(filename: string): Promise<boolean> {
    try {
      await this.playAudio(filename)
      return true
    } catch (error) {
      console.error('Audio test failed:', error)
      return false
    }
  }

  isReady(): boolean {
    return this.isInitialized
  }
}
