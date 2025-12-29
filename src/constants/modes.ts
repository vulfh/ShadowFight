export const MODES = { PERFORMING: 'PERFORMING', RESPONDING: 'RESPONDING' } as const;
export type Mode = keyof typeof MODES;
