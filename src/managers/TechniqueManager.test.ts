import { describe, it, expect, beforeEach } from 'vitest'
import { TechniqueManager } from './TechniqueManager'
import { TechniqueMode } from '../types'

describe('TechniqueManager Mode Support', () => {
  let manager: TechniqueManager

  beforeEach(async () => {
    manager = new TechniqueManager()
    await manager.init()
  })

  it('should return techniques by mode', () => {
    const performing = manager.getTechniquesByMode('PERFORMING')
    const responding = manager.getTechniquesByMode('RESPONDING')
    expect(performing.length).toBeGreaterThan(0)
    expect(responding.length).toBeGreaterThan(0)
    performing.forEach(t => expect(t.modes).toContain('PERFORMING'))
    responding.forEach(t => expect(t.modes).toContain('RESPONDING'))
  })

  it('should return modes for a technique', () => {
    const name = manager.getTechniques()[0].name
    const modes = manager.getTechniqueModes(name)
    expect(Array.isArray(modes)).toBe(true)
    expect(modes.length).toBeGreaterThan(0)
  })

  it('should update technique modes', () => {
    const name = manager.getTechniques()[0].name
    manager.updateTechniqueModes(name, ['PERFORMING'])
    const modes = manager.getTechniqueModes(name)
    expect(modes).toEqual(['PERFORMING'])
  })

  it('should validate technique mode', () => {
    const technique = manager.getTechniques()[0]
    const valid = manager.validateTechniqueMode(technique, technique.modes[0])
    expect(valid.isValid).toBe(true)
    const invalid = manager.validateTechniqueMode(technique, 'PERFORMING' as TechniqueMode)
    // If technique supports only RESPONDING, this should be invalid
    if (!technique.modes.includes('PERFORMING')) {
      expect(invalid.isValid).toBe(false)
    }
  })
})
