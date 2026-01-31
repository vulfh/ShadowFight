import './styles/main.css'
import './styles/inputModal.css'
import './styles/confirmModal.css'
import { KravMagaTrainerApp } from './app'

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new KravMagaTrainerApp()
  
  // Expose app globally for debugging
  ;(window as any).app = app
  
  app.init().then(() => {
    console.log('App initialization complete')
  }).catch(error => {
    console.error('App initialization failed:', error)
  })
  
  // Add a simple fallback that runs after everything else
  setTimeout(() => {
    console.log('Running fallback fight list check...')
    const container = document.getElementById('fightListContainer')
    if (container && container.children.length === 0) {
      console.log('Fight list container is empty, running emergency render...')
      
      // Emergency render function
      const emergencyRender = () => {
        try {
          const rawData = localStorage.getItem('kravMagaFightLists')
          if (!rawData) {
            console.log('No localStorage data found')
            return
          }
          
          const fightLists = JSON.parse(rawData)
          if (!Array.isArray(fightLists) || fightLists.length === 0) {
            console.log('No valid fight lists found')
            return
          }
          
          console.log(`Emergency rendering ${fightLists.length} fight lists...`)
          
          container.innerHTML = fightLists.map(fl => `
            <div class="fight-list-item card mb-3">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                  <i class="fas fa-chevron-down me-2 text-primary"></i>
                  ${fl.name}
                  <span class="badge bg-secondary ms-2">${fl.techniques.length} techniques</span>
                </h5>
                <div class="btn-group">
                  <span class="badge bg-${fl.mode === 'PERFORMING' ? 'warning' : 'info'} me-2">
                    ${fl.mode}
                  </span>
                </div>
              </div>
              <div class="card-body">
                <div class="list-group">
                  ${fl.techniques.map((technique: import('./types').FightListTechnique) => `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                      <span>${technique.techniqueId}</span>
                      <div class="d-flex align-items-center">
                        <span class="badge bg-primary me-2">Priority ${technique.priority}</span>
                        <span class="badge bg-success">Selected</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `).join('')
          
          console.log('Emergency render completed successfully!')
          
        } catch (error) {
          console.error('Emergency render failed:', error)
        }
      }
      
      emergencyRender()
    } else {
      console.log('Fight lists already rendered or container not found')
    }
  }, 2000) // Run after 2 seconds
})

// Handle service worker updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration)
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('New service worker available')
                // You can show a notification to the user here
              }
            })
          }
        })
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error)
      })
  })
}
