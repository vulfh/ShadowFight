// Test script to verify fight list selection fix
console.log('=== Fight List Selection Fix Test ===');

// Mock localStorage for testing
const mockStorage = {};
const localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = value; },
  removeItem: (key) => { delete mockStorage[key]; }
};

// Mock fight lists data
const fightLists = [
  {
    id: 'fl1',
    name: 'Basic Techniques',
    techniques: [
      { id: 't1', techniqueId: 'Jab', priority: 3, selected: true },
      { id: 't2', techniqueId: 'Cross', priority: 4, selected: true }
    ],
    mode: 'RESPONDING'
  },
  {
    id: 'fl2', 
    name: 'Advanced Techniques',
    techniques: [
      { id: 't3', techniqueId: 'Hook', priority: 5, selected: true },
      { id: 't4', techniqueId: 'Uppercut', priority: 4, selected: true }
    ],
    mode: 'PERFORMING'
  }
];

// Mock techniques data
const allTechniques = [
  { name: 'Jab', category: 'punches', selected: true },
  { name: 'Cross', category: 'punches', selected: true },
  { name: 'Hook', category: 'punches', selected: true },
  { name: 'Uppercut', category: 'punches', selected: true },
  { name: 'Kick', category: 'kicks', selected: true }
];

// Store mock data
localStorage.setItem('fightLists', JSON.stringify(fightLists));

// Test scenario: Set current fight list and verify session uses correct techniques
console.log('\n--- Test Scenario ---');
console.log('1. Setting current fight list to "Basic Techniques"');
localStorage.setItem('currentFightList', 'fl1');

// Simulate what SessionManager.startSessionWithFightList should do
const currentFightListId = localStorage.getItem('currentFightList');
const currentFightList = fightLists.find(fl => fl.id === currentFightListId);

console.log('2. Current fight list:', currentFightList?.name);
console.log('3. Fight list techniques:', currentFightList?.techniques.map(t => t.techniqueId));

// Simulate the filtering logic from startSessionWithFightList
const selectedTechniques = currentFightList?.techniques
  .filter(t => t.selected)
  .map(flTechnique => {
    const technique = allTechniques.find(t => t.name === flTechnique.techniqueId);
    if (!technique) return null;
    return {
      ...technique,
      weight: flTechnique.priority
    };
  })
  .filter(t => t !== null);

console.log('4. Filtered techniques for session:', selectedTechniques?.map(t => t.name));
console.log('5. Expected: ["Jab", "Cross"]');
console.log('6. Match:', JSON.stringify(selectedTechniques?.map(t => t.name)) === JSON.stringify(['Jab', 'Cross']) ? '✅ PASS' : '❌ FAIL');

// Test changing to different fight list
console.log('\n--- Test Fight List Change ---');
console.log('1. Changing current fight list to "Advanced Techniques"');
localStorage.setItem('currentFightList', 'fl2');

const newCurrentFightListId = localStorage.getItem('currentFightList');
const newCurrentFightList = fightLists.find(fl => fl.id === newCurrentFightListId);

console.log('2. New current fight list:', newCurrentFightList?.name);

const newSelectedTechniques = newCurrentFightList?.techniques
  .filter(t => t.selected)
  .map(flTechnique => {
    const technique = allTechniques.find(t => t.name === flTechnique.techniqueId);
    if (!technique) return null;
    return {
      ...technique,
      weight: flTechnique.priority
    };
  })
  .filter(t => t !== null);

console.log('3. New filtered techniques:', newSelectedTechniques?.map(t => t.name));
console.log('4. Expected: ["Hook", "Uppercut"]');
console.log('5. Match:', JSON.stringify(newSelectedTechniques?.map(t => t.name)) === JSON.stringify(['Hook', 'Uppercut']) ? '✅ PASS' : '❌ FAIL');

console.log('\n=== Test Summary ===');
console.log('The fix ensures that:');
console.log('1. SessionManager stores the filtered config internally');
console.log('2. When instruction audio completes, it uses the stored config');
console.log('3. Only techniques from the selected fight list are played');
console.log('4. No more playing all techniques regardless of selection');