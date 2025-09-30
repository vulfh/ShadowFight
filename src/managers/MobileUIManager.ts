 /**
 * Handles mobile-specific UI interactions
 */
export class MobileUIManager {
    private readonly techniqueSheet: HTMLElement | null;
    private readonly showTechniquesBtn: HTMLElement | null;
    private readonly closeTechniqueSheet: HTMLElement | null;
    private readonly selectAllMobile: HTMLElement | null;
    private readonly deselectAllMobile: HTMLElement | null;
    private readonly swipeAreas: NodeListOf<Element>;
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private swipeThreshold: number = 50; // Minimum distance for a swipe
    private lastTapTime: number = 0;

    constructor() {
        this.techniqueSheet = document.getElementById('techniqueSheet');
        this.showTechniquesBtn = document.getElementById('showTechniquesBtn');
        this.closeTechniqueSheet = document.getElementById('closeTechniqueSheet');
        this.selectAllMobile = document.getElementById('selectAllMobile');
        this.deselectAllMobile = document.getElementById('deselectAllMobile');
        this.swipeAreas = document.querySelectorAll('.swipe-area');

        this.initializeEventListeners();
        this.initializeSwipeSupport();
        this.initializeTouchFeedback();
    }

    /**
     * Initialize all event listeners for mobile interactions
     */
    private initializeEventListeners(): void {
        // Bottom sheet controls with haptic feedback
        this.showTechniquesBtn?.addEventListener('click', () => {
            this.provideHapticFeedback();
            this.showTechniqueSheet();
        });

        this.closeTechniqueSheet?.addEventListener('click', () => {
            this.provideHapticFeedback();
            this.hideTechniqueSheet();
        });

        // Handle clicks outside the sheet to close it
        document.addEventListener('click', (e) => {
            if (this.techniqueSheet?.classList.contains('active') &&
                !this.techniqueSheet.contains(e.target as Node) &&
                e.target !== this.showTechniquesBtn) {
                this.hideTechniqueSheet();
            }
        });

        // Sync mobile select/deselect with desktop
        this.selectAllMobile?.addEventListener('click', () => {
            this.provideHapticFeedback();
            document.getElementById('selectAll')?.click();
        });

        this.deselectAllMobile?.addEventListener('click', () => {
            this.provideHapticFeedback();
            document.getElementById('deselectAll')?.click();
        });

        // Add double tap support
        this.swipeAreas.forEach(area => {
            area.addEventListener('touchend', (e: Event) => {
                const touchEvent = e as unknown as TouchEvent;
                this.handleDoubleTap(touchEvent);
            });
        });
    }

    /**
     * Initialize touch feedback for interactive elements
     */
    private initializeTouchFeedback(): void {
        const touchElements = document.querySelectorAll('.btn, .technique-item, .form-range');
        
        touchElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.classList.add('touch-active');
            }, { passive: true });

            element.addEventListener('touchend', () => {
                element.classList.remove('touch-active');
            });

            element.addEventListener('touchcancel', () => {
                element.classList.remove('touch-active');
            });
        });
    }

    /**
     * Initialize swipe gesture support for expandable areas
     */
    private initializeSwipeSupport(): void {
        this.swipeAreas.forEach(area => {
            let isSwiping = false;

            area.addEventListener('touchstart', (e: Event) => {
                const touchEvent = e as TouchEvent;
                this.touchStartX = touchEvent.touches[0].clientX;
                this.touchStartY = touchEvent.touches[0].clientY;
                isSwiping = false;
            }, { passive: true });

            area.addEventListener('touchmove', (e: Event) => {
                const touchEvent = e as TouchEvent;
                if (!this.touchStartX || !this.touchStartY) return;

                const xDiff = this.touchStartX - touchEvent.touches[0].clientX;
                const yDiff = this.touchStartY - touchEvent.touches[0].clientY;

                // Only handle horizontal swipes if the vertical movement is minimal
                if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > this.swipeThreshold) {
                    isSwiping = true;
                    this.handleSwipeProgress(area, xDiff);
                    
                    // Prevent vertical scrolling during horizontal swipe
                    e.preventDefault();
                }
            });

            area.addEventListener('touchend', () => {
                if (isSwiping) {
                    this.completeSwipeAnimation(area);
                }
                this.touchStartX = 0;
                this.touchStartY = 0;
                isSwiping = false;
            });
        });
    }

    /**
     * Handle swipe progress for visual feedback
     */
    private handleSwipeProgress(element: Element, xDiff: number): void {
        const progress = Math.min(Math.abs(xDiff) / this.swipeThreshold, 1);
        element.setAttribute('data-swipe-progress', progress.toString());
        
        if (xDiff > 0) {
            element.classList.add('swiping-left');
            element.classList.remove('swiping-right');
        } else {
            element.classList.add('swiping-right');
            element.classList.remove('swiping-left');
        }
    }

    /**
     * Complete the swipe animation
     */
    private completeSwipeAnimation(element: Element): void {
        const progress = parseFloat(element.getAttribute('data-swipe-progress') || '0');
        
        if (progress >= 0.5) {
            if (element.classList.contains('swiping-left')) {
                this.handleSwipeLeft(element);
            } else if (element.classList.contains('swiping-right')) {
                this.handleSwipeRight(element);
            }
        }

        // Cleanup
        element.classList.remove('swiping-left', 'swiping-right');
        element.removeAttribute('data-swipe-progress');
    }

    /**
     * Handle double tap gesture
     */
    private handleDoubleTap(e: TouchEvent): void {
        const currentTime = Date.now();
        const tapLength = currentTime - this.lastTapTime;
        const DOUBLE_TAP_THRESHOLD = 300;

        if (tapLength < DOUBLE_TAP_THRESHOLD && tapLength > 0) {
            e.preventDefault();
            this.provideHapticFeedback();
            
            const element = e.target as HTMLElement;
            if (element.classList.contains('technique-item')) {
                this.toggleTechniqueSelection(element);
            }
        }

        this.lastTapTime = currentTime;
    }

    /**
     * Toggle technique selection on double tap
     */
    private toggleTechniqueSelection(element: HTMLElement): void {
        const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            element.classList.toggle('selected');
            
            // Dispatch change event
            const event = new Event('change');
            checkbox.dispatchEvent(event);
        }
    }

    /**
     * Show the technique selection bottom sheet
     */
    private showTechniqueSheet(): void {
        this.techniqueSheet?.classList.add('active');
        this.techniqueSheet?.classList.add('animate-slide-in');
        
        // Add overlay
        const overlay = document.createElement('div');
        overlay.className = 'technique-sheet-overlay';
        document.body.appendChild(overlay);

        // Animate overlay
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    }

    /**
     * Hide the technique selection bottom sheet
     */
    private hideTechniqueSheet(): void {
        const overlay = document.querySelector('.technique-sheet-overlay');
        
        this.techniqueSheet?.classList.add('animate-slide-out');
        overlay?.classList.remove('active');

        // Remove after animation
        setTimeout(() => {
            this.techniqueSheet?.classList.remove('active', 'animate-slide-in', 'animate-slide-out');
            overlay?.remove();
        }, 300);
    }

    /**
     * Handle swipe left gesture
     */
    private handleSwipeLeft(element: Element): void {
        this.provideHapticFeedback();
        element.classList.add('swipe-collapse');
        element.classList.add('animate-collapse');

        setTimeout(() => {
            element.classList.remove('swipe-collapse', 'animate-collapse');
        }, 300);
    }

    /**
     * Handle swipe right gesture
     */
    private handleSwipeRight(element: Element): void {
        this.provideHapticFeedback();
        element.classList.add('swipe-expand');
        element.classList.add('animate-expand');

        setTimeout(() => {
            element.classList.remove('swipe-expand', 'animate-expand');
        }, 300);
    }

    /**
     * Provide haptic feedback if available
     */
    private provideHapticFeedback(): void {
        if ('vibrate' in navigator) {
            navigator.vibrate(10); // Short vibration for feedback
        }
    }

    /**
     * Check if the device is mobile
     */
    static isMobileDevice(): boolean {
        return window.innerWidth <= 768 || 'ontouchstart' in window;
    }
}

// Initialize mobile UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (MobileUIManager.isMobileDevice()) {
        new MobileUIManager();
    }
});