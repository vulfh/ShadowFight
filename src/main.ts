import './styles/main.css'
import { KravMagaTrainerApp } from './app'

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new KravMagaTrainerApp()
  app.init()
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
