import { MODES } from './src/constants/modes'
import type { Technique } from './src/types'

// Simple test for the filtering logic used in TechniqueAddModal
function testFilteringLogic() {
  console.log('Testing technique filtering logic...')
  
  // Mock techniques with different mode support
  const mockTechniques: Technique[] = [
    {
      name: 'Both Modes Technique',
      file: 'test.wav',
      category: 'Punches',
      priority: 'medium',
      selected: true,
      weight: 1,
      targetLevel: 'HEAD',
      side: 'LEFT',
      modes: [MODES.PERFORMING, MODES.RESPONDING]
    },
    {
      name: 'Performing Only Technique',
      file: 'test.wav',
      category: 'Kicks',
      priority: 'medium',
      selected: true,
      weight: 1,
      targetLevel: 'HEAD',
      side: 'RIGHT',
      modes: [MODES.PERFORMING]
    },
    {
      name: 'Responding Only Technique',
      file: 'test.wav',
      category: 'Strikes',
      priority: 'medium',
      selected: true,
      weight: 1,
      targetLevel: 'HEAD',
      side: 'LEFT',
      modes: [MODES.RESPONDING]
    },
    {
      name: 'No Modes Technique',
      file: 'test.wav',
      category: 'Punches',
      priority: 'medium',
      selected: true,
      weight: 1,
      targetLevel: 'HEAD',
      side: 'RIGHT'
      // No modes property
    }
  ]
  
  // Simulate the filtering logic from TechniqueAddModal constructor
  function filterTechniquesByMode(techniques: Technique[], mode?: string) {
    if (!mode) return techniques
    return techniques.filter(technique => 
      technique.modes && technique.modes.includes(mode as any)
    )
  }
  
  // Test 1: No mode filtering (should show all techniques)
  const noFilterResult = filterTechniquesByMode(mockTechniques)
  console.log('1. No mode filter - techniques count:', noFilterResult.length, '(expected: 4)')
  
  // Test 2: PERFORMING mode filtering
  const performingResult = filterTechniquesByMode(mockTechniques, MODES.PERFORMING)
  console.log('2. PERFORMING mode filter - techniques count:', performingResult.length, '(expected: 2)')
  console.log('   Techniques:', performingResult.map(t => t.name))
  
  // Test 3: RESPONDING mode filtering
  const respondingResult = filterTechniquesByMode(mockTechniques, MODES.RESPONDING)
  console.log('3. RESPONDING mode filter - techniques count:', respondingResult.length, '(expected: 2)')
  console.log('   Techniques:', respondingResult.map(t => t.name))
  
  // Verify filtering results
  const performingNames = performingResult.map(t => t.name)
  const respondingNames = respondingResult.map(t => t.name)
  
  const performingCorrect = performingNames.includes('Both Modes Technique') && 
                           performingNames.includes('Performing Only Technique') &&
                           !performingNames.includes('Responding Only Technique') &&
                           !performingNames.includes('No Modes Technique')
  
  const respondingCorrect = respondingNames.includes('Both Modes Technique') && 
                           respondingNames.includes('Responding Only Technique') &&
                           !respondingNames.includes('Performing Only Technique') &&
                           !respondingNames.includes('No Modes Technique')
  
  console.log('4. PERFORMING filter correct:', performingCorrect ? 'PASS' : 'FAIL')
  console.log('5. RESPONDING filter correct:', respondingCorrect ? 'PASS' : 'FAIL')
  
  console.log('Technique filtering logic tests completed!')
}

testFilteringLogic()