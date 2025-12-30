import { TechniqueManager } from './src/managers/TechniqueManager'
import { MODES } from './src/constants/modes'

async function testUpdatedModes() {
  console.log('Testing updated technique modes...')
  
  const manager = new TechniqueManager()
  await manager.init()
  
  const techniques = manager.getTechniques()
  console.log('Total techniques:', techniques.length)
  
  // Count techniques by mode support
  const bothModes = techniques.filter(t => 
    t.modes?.includes(MODES.PERFORMING) && t.modes?.includes(MODES.RESPONDING)
  )
  const performingOnly = techniques.filter(t => 
    t.modes?.includes(MODES.PERFORMING) && !t.modes?.includes(MODES.RESPONDING)
  )
  const respondingOnly = techniques.filter(t => 
    !t.modes?.includes(MODES.PERFORMING) && t.modes?.includes(MODES.RESPONDING)
  )
  
  console.log('Techniques with both modes:', bothModes.length)
  console.log('Techniques with PERFORMING only:', performingOnly.length)
  console.log('Techniques with RESPONDING only:', respondingOnly.length)
  
  // Show some examples
  console.log('\nExamples of RESPONDING-only techniques:')
  respondingOnly.slice(0, 3).forEach(t => console.log(`  - ${t.name} (${t.category})`))
  
  console.log('\nExamples of both-mode techniques:')
  bothModes.slice(0, 3).forEach(t => console.log(`  - ${t.name} (${t.category})`))
  
  // Verify knife techniques are RESPONDING only
  const knifeTechniques = techniques.filter(t => t.category === 'Knife')
  const allKnifeResponding = knifeTechniques.every(t => 
    t.modes?.includes(MODES.RESPONDING) && !t.modes?.includes(MODES.PERFORMING)
  )
  console.log('\nAll knife techniques are RESPONDING-only:', allKnifeResponding)
  
  // Verify hand-grip techniques are RESPONDING only
  const handGripTechniques = techniques.filter(t => t.category === 'Hand-Grip')
  const allHandGripResponding = handGripTechniques.every(t => 
    t.modes?.includes(MODES.RESPONDING) && !t.modes?.includes(MODES.PERFORMING)
  )
  console.log('All hand-grip techniques are RESPONDING-only:', allHandGripResponding)
}

testUpdatedModes().catch(console.error)