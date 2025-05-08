// Function to set the active state based on current page - now just a stub
function setActiveState() {
    // We no longer set active states on navbar links
    // This function kept for compatibility with existing code
    return;
}

// Global variable to track currently active hover label
let activeHoverLabel = null;

// Function to hide all hover labels
function hideAllHoverLabels() {
    const labelContainer = document.getElementById('map-label-container');
    if (labelContainer) {
        const labels = labelContainer.querySelectorAll('.hover-label');
        labels.forEach(label => {
            label.style.opacity = '0';
            label.style.transform = 'translateX(-50%) translateY(-5px)';
            setTimeout(() => {
                if (label.style.opacity === '0') {
                    label.style.display = 'none';
                }
            }, 300);
        });
    }
    activeHoverLabel = null;
}

// Define constants
const DEFAULT_VIEW = [23.5558, 120.4705]; // Default center coordinates
const DEFAULT_ZOOM = 17; // Default zoom level

// Global map state
let mapState = {
    center: null,
    zoom: null,
    bounds: null
};

// Global variables for map elements
let map = null;
let tileLayer = null;

// Check if device has touch capability
function isTouchDevice() {
    return (('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           (navigator.msMaxTouchPoints > 0));
}

// Force complete all ghost touches to fix unresponsive map
function forceCompleteGhostTouches() {
    try {
        // Dispatch synthetic touchend events to clear any stuck touches
        const fakeEvent = new Event('touchend', { bubbles: true, cancelable: true });
        document.dispatchEvent(fakeEvent);
        
        // Also clear any :active or .active CSS states
        document.querySelectorAll('.active').forEach(el => {
            if (!el.classList.contains('popup-tab') && !el.classList.contains('establishment-popup-content')) {
                el.classList.remove('active');
            }
        });
        
        // Reset any touch action CSS
        document.querySelectorAll('.leaflet-container').forEach(el => {
            el.style.touchAction = 'pan-x pan-y';
        });
        
        // Re-enable map interaction if it got disabled
        if (map) {
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
            if (map.tap) map.tap.enable();
        }
    } catch (e) {
        console.error('Error in forceCompleteGhostTouches:', e);
    }
}

// Function to initialize the map with proper settings
function initializeMap() {
    console.log('Initializing map...');
    
    // Setup default map options
    const mapInitConfig = {
        zoomControl: false,  // We'll add custom zoom controls
        attributionControl: false,  // Add this later in a custom position
        closePopupOnClick: true,  // Close popups when clicking elsewhere
        preferCanvas: false,  // Use SVG instead of Canvas for better transitions
        minZoom: 17,  // Restrict zooming out too far
        maxZoom: 19,  // Restrict zooming in too far
        
        // Map interaction settings
        bounceAtZoomLimits: false,  // Don't bounce at zoom limits
        inertia: !isTouchDevice(),  // Disable inertia on touch devices
        scrollWheelZoom: !isTouchDevice(),  // Mouse scroll zoom for desktop only
        dragging: true,  // Enable dragging by default
        touchZoom: true,  // Enable touch zoom by default
        doubleClickZoom: true,  // Enable double click zoom by default
        tap: isTouchDevice(),  // Enable tap handler for mobile
        
        // Advanced touch settings for better mobile experience
        tapTolerance: 15,  // Increase from default 15px for easier tapping
        zoomSnap: 0.5,  // Smoother zoom level steps
        wheelPxPerZoomLevel: 120,  // Adjust mouse wheel sensitivity
        
        // Custom settings
        fadeAnimation: true,  // Smooth fade animations
        zoomAnimation: true,  // Smooth zoom animations
        markerZoomAnimation: true,  // Smooth marker zoom animations
        
        // Custom CSS properties for touch handling
        tapHold: isTouchDevice()  // Enable taphold for better touch handling
    };
    
    // For touch devices, optimize settings
    if (isTouchDevice()) {
        // Specific touch-friendly settings
        mapInitConfig.bounceAtZoomLimits = false;
        mapInitConfig.inertiaDeceleration = 2000;  // Faster stop after dragging
        
        // Enable all touch interactions
        mapInitConfig.dragging = true;
        mapInitConfig.touchZoom = true;
        mapInitConfig.doubleClickZoom = true;
    }
    
    // Create a new map instance
    map = L.map('map', mapInitConfig).setView(
        mapState.center || DEFAULT_VIEW, 
        mapState.zoom || DEFAULT_ZOOM
    );
    
    // Add tile layer with CartoDB Voyager style
    tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO',
        maxZoom: 20,
        minZoom: 17,
        subdomains: 'abcd'
    }).addTo(map);
    
    // Create a new marker cluster group with original styling
    window.markerClusterGroup = window.markerClusterGroup || L.markerClusterGroup({
        maxClusterRadius: 40,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            return L.divIcon({
                html: `<div><span>${count}</span></div>`,
                className: 'marker-cluster',
                iconSize: L.point(40, 40)
            });
        },
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });
    
    // Add the cluster group to the map
    map.addLayer(window.markerClusterGroup);
    
    // For touch devices, we'll apply comprehensive touch optimizations
    if (isTouchDevice()) {
        // Ensure Leaflet's tap handling is properly configured
        map.options.tap = true;
        map.options.tapTolerance = 40; // Even more tolerant tap detection
        
        // Make sure all touch handlers are enabled
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        
        // Completely disable touch-action CSS on map to prevent browser interference
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            // Add scroll detection to auto-fix ghost touches
            let lastScrollTime = 0;
            
            // Monitor for scroll/move events to detect when the user manually fixes the ghost state
            mapContainer.addEventListener('touchmove', function(e) {
                lastScrollTime = Date.now();
            }, {passive: true});
            
            // When touch ends on the map, check if it was a tap or the end of a scroll
            mapContainer.addEventListener('touchend', function(e) {
                const wasScroll = (Date.now() - lastScrollTime) < 300; // Was a scroll if < 300ms from last move
                
                if (wasScroll) {
                    // After scroll, make sure ghost states are cleared
                    setTimeout(forceCompleteGhostTouches, 50);
                } else {
                    // Was a tap - check if we need to fix ghost states after a short delay
                    // This creates the effect of the map being instantly ready for taps
                    setTimeout(() => {
                        // Only run the ghost fix if no popup/modal is active
                        if (!window.bottomSheetActive && !document.querySelector('.leaflet-popup')) {
                            forceCompleteGhostTouches();
                        }
                    }, 300);
                }
            }, {passive: true});
            
            // Set initial touch action to pan-x pan-y and pointer events to auto
            mapContainer.style.touchAction = 'pan-x pan-y';
            mapContainer.style.pointerEvents = 'auto';
        }
    }
    
    // State variables (keep these outside the function so they persist)
    window.activeMarker = window.activeMarker || null;
    window.mobilePopupActive = window.mobilePopupActive || false;
    window.rentals = window.rentals || [];
    
    // Helper function to save current map state
    function saveMapState() {
        if (!map) return;
        
        try {
            mapState = {
                center: map.getCenter(),
                zoom: map.getZoom(),
                bounds: map.getBounds()
            };
            console.log('Map state saved:', mapState);
        } catch (error) {
            console.error('Error saving map state:', error);
        }
    }
    
    // Initialize UI elements
    setupEventListeners();
    setActiveNavLink();
    setupInfoGuide();
    
    // Setup event listeners
    function setupEventListeners() {
        // Reset view handler function
        window.resetView = function() {
            console.log('Map reset view triggered');
            
            // Close any open popups or sheets
            let sheetWasOpen = window.bottomSheetActive;
            
            if (window.bottomSheetActive) {
                closeBottomSheet();
            }
            
            if (window.mobilePopupActive) {
                closeMobilePopup();
            }
            
            map.closePopup();
            
            // Clear any ghost touches immediately
            forceCompleteGhostTouches();
            
            // Adjust delay based on whether the sheet was open
            const delay = sheetWasOpen ? 350 : 50;
            
            setTimeout(() => {
                // Reset the view with animation
                map.setView(DEFAULT_VIEW, DEFAULT_ZOOM, {
                    animate: true,
                    duration: 0.5
                });
                
                // Force a redraw by invalidating the size after the view has reset
                // This fixes the gray map issue
                setTimeout(() => {
                    map.invalidateSize({reset: true, animate: false, pan: false});
                    
                    // Additional fix: trigger a small pan to force tile reload if needed
                    const center = map.getCenter();
                    map.panBy([1, 1], {
                        animate: false,
                        duration: 0.1
                    });
                    map.panBy([-1, -1], {
                        animate: false,
                        duration: 0.1
                    });
                    
                    console.log('Map redrawn to prevent gray tile issue');
                }, 100);
                
                console.log('Map view reset to default position');
            }, delay);
        };
        
        // Reset view button for non-touch devices
        const resetViewBtn = document.getElementById('reset-view-btn');
        if (resetViewBtn) {
            // First remove any existing handlers to prevent duplicates
            resetViewBtn.removeEventListener('click', resetView);
            resetViewBtn.removeEventListener('touchend', resetView);
            
            // Define a handler function to use for both events
            const handleResetClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Reset view button activated');
                resetView();
            };
            
            // Add both click and touch handlers for better responsiveness
            resetViewBtn.addEventListener('click', handleResetClick);
            resetViewBtn.addEventListener('touchend', handleResetClick);
        }
    }
    
    // No longer setting active class on navigation links
    function setActiveNavLink() {
        // We no longer set active states on links
        return;
    }
}

// Function to set up the info guide overlay
function setupInfoGuide() {
    const infoGuideBtn = document.getElementById('info-guide-btn');
    const infoGuideOverlay = document.getElementById('info-guide-overlay');
    const infoGuideClose = document.getElementById('info-guide-close');
    
    if (infoGuideBtn && infoGuideOverlay && infoGuideClose) {
        // Set up click handlers with touch-optimized behavior
        infoGuideBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            infoGuideOverlay.classList.add('active');
            window._infoGuideWasRecentlyActive = true;
        });
        
        infoGuideClose.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            infoGuideOverlay.classList.remove('active');
        });
        
        // Close on click outside of the info guide container
        infoGuideOverlay.addEventListener('click', function(e) {
            if (e.target === infoGuideOverlay) {
                infoGuideOverlay.classList.remove('active');
            }
        });
    }
}

// Function to load rental data
function loadRentalsData() {
    fetch('../src/data/rent.geojson')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            console.log('Rentals data loaded:', data);
            window.rentals = data.features || [];
            
            // Clear existing markers
            if (window.markerClusterGroup) {
                window.markerClusterGroup.clearLayers();
            }
            
            // If no rentals data yet, just return
            if (!window.rentals.length) {
                console.log('No rental listings available yet');
                return;
            }
            
            // Create container for hover labels if it doesn't exist
            let labelContainer = document.getElementById('map-label-container');
            if (!labelContainer) {
                labelContainer = document.createElement('div');
                labelContainer.id = 'map-label-container';
                document.getElementById('map').appendChild(labelContainer);
            }
            
            // Process and add markers for each rental
            const markers = window.rentals.map(rental => {
                // Convert GeoJSON coordinates [lng, lat] to Leaflet coordinates [lat, lng]
                const [lng, lat] = rental.geometry.coordinates;
                
                // Create marker with custom icon (light green with home icon)
                const marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        html: `<div class="rent-marker-icon"><i class="fas fa-home"></i></div>`,
                        className: '',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })
                });
                
                // Store rental data in marker
                marker.rentalData = rental.properties;
                
                // Add hover events for name label
                marker.on('mouseover', function(e) {
                    // Create hover label if it doesn't exist
                    if (!this.hoverLabel) {
                        const label = document.createElement('div');
                        label.className = 'hover-label';
                        label.textContent = rental.properties.name;
                        label.style.opacity = '0';
                        label.style.display = 'none';
                        labelContainer.appendChild(label);
                        this.hoverLabel = label;
                    }
                    
                    // Hide any active label first
                    if (activeHoverLabel && activeHoverLabel !== this.hoverLabel) {
                        activeHoverLabel.style.opacity = '0';
                        activeHoverLabel.style.transform = 'translateX(-50%) translateY(-5px)';
                        setTimeout(() => {
                            if (activeHoverLabel.style.opacity === '0') {
                                activeHoverLabel.style.display = 'none';
                            }
                        }, 300);
                    }
                    
                    // Update and show this label
                    const markerPos = this.getLatLng();
                    const point = map.latLngToContainerPoint(markerPos);
                    
                    this.hoverLabel.style.left = point.x + 'px';
                    this.hoverLabel.style.top = (point.y - 30) + 'px';
                    this.hoverLabel.style.display = 'block';
                    
                    // Trigger reflow for transition to work
                    void this.hoverLabel.offsetWidth;
                    
                    this.hoverLabel.style.opacity = '1';
                    this.hoverLabel.style.transform = 'translateX(-50%) translateY(-10px)';
                    activeHoverLabel = this.hoverLabel;
                });
                
                marker.on('mouseout', function(e) {
                    if (this.hoverLabel) {
                        this.hoverLabel.style.opacity = '0';
                        this.hoverLabel.style.transform = 'translateX(-50%) translateY(-5px)';
                        setTimeout(() => {
                            if (this.hoverLabel.style.opacity === '0') {
                                this.hoverLabel.style.display = 'none';
                            }
                        }, 300);
                    }
                    activeHoverLabel = null;
                });
                
                // Update label positions when map is moved
                map.on('move', function() {
                    if (marker.hoverLabel && marker.hoverLabel.style.display !== 'none') {
                        const markerPos = marker.getLatLng();
                        const point = map.latLngToContainerPoint(markerPos);
                        
                        marker.hoverLabel.style.left = point.x + 'px';
                        marker.hoverLabel.style.top = (point.y - 30) + 'px';
                    }
                });
                
                return marker;
            });
            
            // Add markers to cluster group
            window.markerClusterGroup.addLayers(markers);
            
            // Store original markers for later reference
            window.originalMarkers = markers;
        })
        .catch(error => {
            console.error('Error loading rentals data:', error);
        });
}

// Function for mobile popup (stub for now, will implement later)
function setupMobilePopup() {
    window.mobilePopupActive = false;
    window.bottomSheetActive = false;
    
    // These will be implemented fully when the popup design is ready
    window.showMobilePopup = function(marker) {
        console.log('Mobile popup would show here');
    };
    
    window.closeMobilePopup = function() {
        console.log('Mobile popup would close here');
    };
    
    window.closeBottomSheet = function() {
        console.log('Bottom sheet would close here');
    };
}

// Setup global info guide popup for all pages
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    
    // Initialize context flags for map reset control
    window._bottomSheetWasRecentlyActive = false;
    window._mobilePopupWasRecentlyActive = false;
    window._infoGuideWasRecentlyActive = false;
    
    // Initialize the map
    initializeMap();
    
    // Setup info guide
    setupInfoGuide();
    
    // Load rental data
    loadRentalsData();
    
    // Setup mobile popup
    setupMobilePopup();
    
    // Setup search functionality (stub for now)
    window.openSearchModal = function() {
        console.log('Search modal would open here');
    };
});