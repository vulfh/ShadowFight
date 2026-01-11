// Comprehensive debug script for fight list selection issue
console.log('=== Detailed Fight List Debug ===');

// Function to log current state
function logCurrentState(context) {
  console.log(`\n--- ${context} ---`);
  
  // Check localStorage directly
  const currentFightListId = localStorage.getItem('currentFightList');
  console.log('Current fight list ID from localStorage:', currentFightListId);
  
  // Check all fight lists
  const fightListsData = localStorage.getItem('fightLists');
  if (fightListsData) {
    const fightLists = JSON.parse(fightListsData);
    console.log('All fight lists:', fightLists.map(fl => ({ id: fl.id, name: fl.name })));
    
    // Find the current fight list
    const currentFightList = fightLists.find(fl => fl.id === currentFightListId);
    if (currentFightList) {
      console.log('Current fight list details:', {
        id: currentFightList.id,
        name: currentFightList.name,
        mode: currentFightList.mode,
        techniqueCount: currentFightList.techniques?.length || 0,
        selectedTechniques: currentFightList.techniques?.filter(t => t.selected).length || 0
      });
    } else {
      console.log('No current fight list found in storage');
    }
  }
  
  // Check UI state
  const currentElements = document.querySelectorAll('.fight-list-item.current');
  console.log('UI elements marked as current:', currentElements.length);
  currentElements.forEach((el, i) => {
    console.log(`Current element ${i}:`, {
      id: el.dataset.id,
      name: el.querySelector('h5 button')?.textContent?.trim()
    });
  });
}

// Log initial state
logCurrentState('Initial State');

// Monitor "Set Current" button clicks
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('set-current') || e.target.closest('.set-current')) {
    console.log('\n🔄 Set Current button clicked');
    const fightListElement = e.target.closest('.fight-list-item');
    const fightListId = fightListElement?.dataset.id;
    const fightListName = fightListElement?.querySelector('h5 button')?.textContent?.trim();
    
    console.log('Clicked fight list:', { id: fightListId, name: fightListName });
    
    // Log state immediately after click
    setTimeout(() => logCurrentState('After Set Current Click'), 10);
    
    // Log state after a longer delay to catch async operations
    setTimeout(() => logCurrentState('After Set Current Click (delayed)'), 100);
  }
});

// Monitor "Start Session" button clicks
document.addEventListener('click', (e) => {
  if (e.target.id === 'startBtn' || e.target.closest('#startBtn')) {
    console.log('\n🚀 Start Session button clicked');
    logCurrentState('Before Session Start');
    
    // Log what the app thinks is current
    setTimeout(() => {
      console.log('Session starting with fight list...');
      logCurrentState('During Session Start');
    }, 50);
  }
});

// Monitor localStorage changes
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key === 'currentFightList') {
    console.log('📝 localStorage.setItem called for currentFightList:', value);
    console.trace('Call stack:');
  }
  return originalSetItem.apply(this, arguments);
};

const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
  if (key === 'currentFightList') {
    console.log('🗑️ localStorage.removeItem called for currentFightList');
    console.trace('Call stack:');
  }
  return originalRemoveItem.apply(this, arguments);
};

// Monitor DOM changes to current fight list elements
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = mutation.target;
      if (target.classList.contains('fight-list-item')) {
        const isCurrent = target.classList.contains('current');
        const wasCurrentBefore = mutation.oldValue?.includes('current');
        
        if (isCurrent !== wasCurrentBefore) {
          console.log('🎯 Fight list current status changed:', {
            id: target.dataset.id,
            name: target.querySelector('h5 button')?.textContent?.trim(),
            isCurrent: isCurrent
          });
        }
      }
    }
  });
});

// Start observing
observer.observe(document.body, {
  attributes: true,
  attributeOldValue: true,
  subtree: true,
  attributeFilter: ['class']
});

console.log('Debug script loaded. Click "Set Current" and "Start Session" to see detailed logs.');