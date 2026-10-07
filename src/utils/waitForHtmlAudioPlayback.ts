const NEAR_END_SECONDS = 0.08

export function isHtmlAudioNearEnd(audio: HTMLAudioElement): boolean {
  if (audio.ended) {
    return true
  }

  const { duration, currentTime } = audio
  if (!Number.isFinite(duration) || duration <= 0) {
    return false
  }

  return currentTime >= duration - NEAR_END_SECONDS
}

export interface WaitForHtmlAudioPlaybackOptions {
  isPlaybackIntended?: () => boolean
  signal?: AbortSignal
}

/**
 * Resolves when HTML audio finishes. Mobile browsers often pause (and skip
 * `ended`) when the screen locks; this resumes playback and also treats a
 * near-end pause as completion so the caller cannot deadlock.
 */
export function waitForHtmlAudioPlayback(
  audio: HTMLAudioElement,
  options: WaitForHtmlAudioPlaybackOptions = {}
): Promise<void> {
  const isIntended = options.isPlaybackIntended ?? (() => true)

  return new Promise((resolve, reject) => {
    let settled = false
    let lastResumeAttempt = 0

    const cleanup = () => {
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      document.removeEventListener('visibilitychange', onVisibility)
      options.signal?.removeEventListener('abort', onAbort)
    }

    const settle = (error?: unknown) => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }

    const tryResume = () => {
      if (settled || !isIntended() || isHtmlAudioNearEnd(audio)) {
        return
      }
      if (!audio.paused) {
        return
      }
      const now = Date.now()
      if (now - lastResumeAttempt < 300) {
        return
      }
      lastResumeAttempt = now
      void audio.play().catch(() => {
        // Autoplay can fail while locked; visibilitychange will retry.
      })
    }

    const onEnded = () => settle()

    const onError = () => {
      const message = audio.error?.message || 'Audio playback failed'
      settle(new Error(message))
    }

    const onPause = () => {
      if (settled || !isIntended()) {
        return
      }
      if (isHtmlAudioNearEnd(audio)) {
        settle()
        return
      }
      tryResume()
    }

    const onTimeUpdate = () => {
      if (isHtmlAudioNearEnd(audio)) {
        settle()
      }
    }

    const onVisibility = () => {
      if (!settled && isIntended()) {
        tryResume()
      }
    }

    const onAbort = () => settle()

    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    document.addEventListener('visibilitychange', onVisibility)
    options.signal?.addEventListener('abort', onAbort)

    if (options.signal?.aborted) {
      settle()
    }
  })
}
