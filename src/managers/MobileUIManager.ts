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

    constructor() {
        this.techniqueSheet = document.getElementById('techniqueSheet');
        this.showTechniquesBtn = document.getElementById('showTechniquesBtn');
        this.closeTechniqueSheet = document.getElementById('closeTechniqueSheet');
        this.selectAllMobile = document.getElementById('selectAllMobile');
        this.deselectAllMobile = document.getElementById('deselectAllMobile');
        this.swipeAreas = document.querySelectorAll('.swipe-area');

        this.initializeEventListeners();
        this.initializeSwipeSupport();
    }

    /**
     * Initialize all event listeners for mobile interactions
     */
    private initializeEventListeners(): void {
        // Bottom sheet controls
        this.showTechniquesBtn?.addEventListener('click', () => this.showTechniqueSheet());
        this.closeTechniqueSheet?.addEventListener('click', () => this.hideTechniqueSheet());

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
            document.getElementById('selectAll')?.click();
        });

        this.deselectAllMobile?.addEventListener('click', () => {
            document.getElementById('deselectAll')?.click();
        });
    }

    /**
     * Initialize swipe gesture support for expandable areas
     */
    private initializeSwipeSupport(): void {
        this.swipeAreas.forEach(area => {
            area.addEventListener('touchstart', (e: Event) => {
                const touchEvent = e as TouchEvent;
                this.touchStartX = touchEvent.touches[0].clientX;
                this.touchStartY = touchEvent.touches[0].clientY;
            });

            area.addEventListener('touchmove', (e: Event) => {
                const touchEvent = e as TouchEvent;
                if (!this.touchStartX || !this.touchStartY) return;

                const xDiff = this.touchStartX - touchEvent.touches[0].clientX;
                const yDiff = this.touchStartY - touchEvent.touches[0].clientY;

                // Detect horizontal swipe
                if (Math.abs(xDiff) > Math.abs(yDiff)) {
                    if (xDiff > 10) { // Swipe left
                        this.handleSwipeLeft(area);
                    } else if (xDiff < -10) { // Swipe right
                        this.handleSwipeRight(area);
                    }
                }
            });

            area.addEventListener('touchend', () => {
                this.touchStartX = 0;
                this.touchStartY = 0;
            });
        });
    }

    /**
     * Show the technique selection bottom sheet
     */
    private showTechniqueSheet(): void {
        this.techniqueSheet?.classList.add('active');
        this.techniqueSheet?.classList.add('animate-slide-in');
    }

    /**
     * Hide the technique selection bottom sheet
     */
    private hideTechniqueSheet(): void {
        this.techniqueSheet?.classList.remove('active');
    }

    /**
     * Handle swipe left gesture
     */
    private handleSwipeLeft(element: Element): void {
        // Add collapse animation
        element.classList.add('swipe-collapse');
    }

    /**
     * Handle swipe right gesture
     */
    private handleSwipeRight(element: Element): void {
        // Add expand animation
        element.classList.add('swipe-expand');
    }

    /**
     * Check if the device is mobile
     */
    static isMobileDevice(): boolean {
        return window.innerWidth <= 768;
    }
}

// Initialize mobile UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (MobileUIManager.isMobileDevice()) {
        new MobileUIManager();
    }
});