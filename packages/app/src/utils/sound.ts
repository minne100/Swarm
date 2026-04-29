export const SOUND_OPTIONS: ReadonlyArray<{ id: string; label: string }> = []

export type SoundOption = (typeof SOUND_OPTIONS)[number]
export type SoundID = string
export type SoundCleanup = () => void

export function soundSrc(_id: string | undefined): Promise<string | undefined> {
  return Promise.resolve(undefined)
}

export function playSound(_src: string | undefined): SoundCleanup | undefined {
  return undefined
}

export function playSoundById(_id: string | undefined): Promise<SoundCleanup | undefined> {
  return Promise.resolve(undefined)
}
