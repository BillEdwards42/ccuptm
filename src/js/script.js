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

// Function to completely reset touch handling
function resetTouchSystem(callback) {
    console.log('Resetting touch system');
    
    // Hide any visible hover labels
    hideAllHoverLabels();
    
    // Create an overlay to temporarily capture and reset touch events
    const touchResetOverlay = document.createElement('div');
    touchResetOverlay.style.position = 'fixed';
    touchResetOverlay.style.top = '0';
    touchResetOverlay.style.left = '0';
    touchResetOverlay.style.width = '100%';
    touchResetOverlay.style.height = '100%';
    touchResetOverlay.style.backgroundColor = 'rgba(255,255,255,0.01)'; // Almost transparent
    touchResetOverlay.style.zIndex = '9999';
    touchResetOverlay.style.pointerEvents = 'all';
    touchResetOverlay.style.touchAction = 'manipulation';
    document.body.appendChild(touchResetOverlay);
    
    // Force a touch handler flush by toggling hardware acceleration on elements
    document.body.style.transform = 'translateZ(0)';
    touchResetOverlay.style.transform = 'translateZ(0)';
    
    // Toggle pointer events to force a reset
    document.body.style.pointerEvents = 'none';
    setTimeout(() => {
        document.body.style.pointerEvents = '';
    }, 50);
    
    // Force a browser repaint
    void document.body.offsetHeight;
    void touchResetOverlay.offsetHeight;
    
    // For Android browsers, toggle touch mode
    if (/android/i.test(navigator.userAgent)) {
        // Create and dispatch synthetic touch events to reset touch system
        try {
            const touchStartEvent = new TouchEvent('touchstart', {
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(touchStartEvent);
            
            setTimeout(() => {
                const touchEndEvent = new TouchEvent('touchend', {
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(touchEndEvent);
            }, 50);
        } catch (e) {
            console.log('TouchEvent constructor not available, using alternative method');
            // Alternative for browsers that don't support TouchEvent constructor
            const touchStartEvent = document.createEvent('Event');
            touchStartEvent.initEvent('touchstart', true, true);
            document.dispatchEvent(touchStartEvent);
            
            setTimeout(() => {
                const touchEndEvent = document.createEvent('Event');
                touchEndEvent.initEvent('touchend', true, true);
                document.dispatchEvent(touchEndEvent);
            }, 50);
        }
    }
    
    // Remove the overlay and reset hardware acceleration after a short delay
    setTimeout(() => {
        // Remove the overlay
        if (document.body.contains(touchResetOverlay)) {
            document.body.removeChild(touchResetOverlay);
        }
        
        // Reset hardware acceleration
        document.body.style.transform = '';
        
        // Reset map if available
        if (document.getElementById('map') && map && typeof map.invalidateSize === 'function') {
            map.invalidateSize({reset: true, pan: false});
            map.touchZoom.enable();
            map.dragging.enable();
            map.tap.enable();
            
            // Force a redraw with animation to trigger internal updates
            const center = map.getCenter();
            const zoom = map.getZoom();
            try {
                map.flyTo(center, zoom, {
                    duration: 0.01, // Very short animation to force refresh
                    noMoveStart: true
                });
            } catch (e) {
                console.error('Error refreshing map:', e);
                map.setView(center, zoom);
            }
        }
        
        // Execute callback if provided
        if (typeof callback === 'function') {
            callback();
        }
        
        console.log('Touch system reset complete');
    }, 200);
}

// Setup global info guide popup for all pages
document.addEventListener('DOMContentLoaded', () => {
    // Add a global handler to fix touch issues after any touch interactions
    if ('ontouchstart' in window) {
        // Track touch events for detection of possible touch issues
        let lastTouchStartTime = 0;
        let lastTouchEndTime = 0;
        let touchStartPos = { x: 0, y: 0 };
        let touchEndPos = { x: 0, y: 0 };
        let consecutiveFailedTouches = 0;
        
        // Listen for touch start events globally
        document.addEventListener('touchstart', function(e) {
            lastTouchStartTime = Date.now();
            if (e.touches && e.touches[0]) {
                touchStartPos = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };
            }
        }, {passive: true});
        
        // Listen for touch move events to detect if scrolling is working properly
        document.addEventListener('touchmove', function(e) {
            // If a touch move event happens, reset consecutive failed touches counter
            // since we're detecting some movement
            consecutiveFailedTouches = 0;
        }, {passive: true});
        
        // Listen for touch end events
        document.addEventListener('touchend', function(e) {
            lastTouchEndTime = Date.now();
            if (e.changedTouches && e.changedTouches[0]) {
                touchEndPos = {
                    x: e.changedTouches[0].clientX,
                    y: e.changedTouches[0].clientY
                };
            }
            
            // Calculate touch duration and distance
            const touchDuration = lastTouchEndTime - lastTouchStartTime;
            const touchDistance = Math.sqrt(
                Math.pow(touchEndPos.x - touchStartPos.x, 2) + 
                Math.pow(touchEndPos.y - touchStartPos.y, 2)
            );
            
            // If we're on the map page and not in a popup
            if (document.getElementById('map') && 
                !document.querySelector('.mobile-popup-overlay.active') &&
                !document.querySelector('.info-guide-overlay.active')) {
                
                // Detect possible touch issues:
                // 1. Very short touches that don't move (likely unregistered taps)
                // 2. Long touches that don't move (stuck touch events)
                if ((touchDuration < 100 && touchDistance < 5) || 
                    (touchDuration > 500 && touchDistance < 10)) {
                    consecutiveFailedTouches++;
                    console.log('Possible touch issue detected:', 
                        consecutiveFailedTouches, 
                        'duration:', touchDuration, 
                        'distance:', touchDistance);
                }
                
                // If we detect consecutive potential touch issues, try resetting
                if (consecutiveFailedTouches >= 2) {
                    console.log('Multiple touch issues detected, resetting touch system');
                    consecutiveFailedTouches = 0;
                    if (typeof resetTouchSystem === 'function') {
                        resetTouchSystem(function() {
                            console.log('Touch system reset from global handler');
                        });
                    }
                }
                
                // Also check if the touch ended inside the map for the traditional reset
                if (e.target.closest('#map')) {
                    // If we detect touches aren't working (not tested yet), try resetting
                    setTimeout(function() {
                        if (typeof resetMapTouchHandlers === 'function' && 
                            !document.querySelector('.mobile-popup-overlay.active') && 
                            !document.querySelector('.info-guide-overlay.active')) {
                            resetMapTouchHandlers();
                        }
                    }, 500);
                }
            }
        }, {passive: true});
    }
    
    // Set initial active state
    setActiveState();
    // Initialize info guide popup on all pages
    const infoGuideBtn = document.getElementById('info-guide-btn');
    if (infoGuideBtn) {
        infoGuideBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const overlay = document.getElementById('info-guide-overlay');
            if (overlay) {
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                
                // Enable scrolling specifically on the info guide content
                const infoContent = document.querySelector('.info-guide-content');
                if (infoContent) {
                    infoContent.style.overflowY = 'auto';
                    infoContent.style.webkitOverflowScrolling = 'touch';
                    
                    // Use simpler touch handling for better response
                    setTimeout(() => {
                        infoContent.style.touchAction = 'pan-y';
                    }, 100);
                }
                
                // Disable map interactions entirely while info guide is open
                if (document.getElementById('map') && map) {
                    map.dragging.disable();
                    map.touchZoom.disable();
                    map.doubleClickZoom.disable();
                    if (map.tap) map.tap.disable();
                }
            }
        });
    }
    
    // Close button for info guide
    const infoGuideClose = document.getElementById('info-guide-close');
    if (infoGuideClose) {
        // Use simpler event handling for better touch response
        infoGuideClose.addEventListener('click', (e) => {
            e.preventDefault();
            closeInfoGuide();
        });
        
        infoGuideClose.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeInfoGuide();
        });
    }
    
    // Centralized function to close info guide
    function closeInfoGuide() {
        const overlay = document.getElementById('info-guide-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            
            // Re-enable map interactions
            if (document.getElementById('map') && map) {
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                if (map.tap) map.tap.enable();
                
                // Force a map refresh
                try {
                    map.invalidateSize({reset: true, pan: false});
                } catch(e) {
                    console.error('Error refreshing map:', e);
                }
            }
            
            // No longer setting active states on nav links
        }
    }
    
    // Close on overlay click
    const infoGuideOverlay = document.getElementById('info-guide-overlay');
    if (infoGuideOverlay) {
        infoGuideOverlay.addEventListener('click', (e) => {
            if (e.target === infoGuideOverlay) {
                closeInfoGuide();
            }
        });
    }
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('info-guide-overlay');
            if (overlay && overlay.classList.contains('active')) {
                closeInfoGuide();
            }
        }
    });

    // Only initialize map if on map page
    if (document.getElementById('map')) {
        initializeMap();
        
        // For touch devices, setup the bottom sheet instead of traditional popups
        if (isTouchDevice()) {
            console.log('Touch device detected, initializing bottom sheet');
            setupBottomSheet();
        } else {
            // For non-touch devices, use the traditional popup
            setupMobilePopup();
        }
        
        // Add handler for mobile browsers to reset map if touch issues are detected
        if ('ontouchstart' in window || navigator.maxTouchPoints) {
            // Make the reset view button also reset the map instance if needed
            const resetViewBtn = document.getElementById('reset-view');
            if (resetViewBtn) {
                const originalClickHandler = resetViewBtn.onclick;
                resetViewBtn.onclick = function(e) {
                    // If original handler exists, call it
                    if (originalClickHandler) originalClickHandler.call(this, e);
                    
                    // If bottom sheet is open, close it
                    if (window.bottomSheetActive) {
                        closeBottomSheet();
                    }
                    
                    // Also completely re-initialize the map
                    setTimeout(() => {
                        console.log('Resetting map from reset button');
                        initializeMap();
                        loadEstablishmentsData();
                    }, 100);
                };
            }
        }
    }
});

// Save map configuration and state variables at module level
const MAP_CONFIG = {
    attributionControl: false,
    zoomControl: false,
    minZoom: 17,
    maxZoom: 20,
    tap: true,
    tapTolerance: 15,
    touchZoom: true,
    bounceAtZoomLimits: false
};

const DEFAULT_VIEW = [23.5558, 120.4705];
const DEFAULT_ZOOM = 17;

let map; // Store map reference globally
let tileLayer; // Store tile layer reference
let mapState = {}; // Store current map state

// Initialize map and related functionality
function initializeMap() {
    console.log('Initializing map');
    
    // Get map container element
    const mapContainer = document.getElementById('map');
    
    // If a map instance already exists, destroy it first
    if (map && typeof map.remove === 'function') {
        console.log('Removing existing map instance');
        // Save current map state before removing
        saveMapState();
        map.remove();
        map = null;
    }
    
    // Create a new map instance
    map = L.map('map', MAP_CONFIG).setView(
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
    
    // Create a new marker cluster group
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
    
    // State variables (keep these outside the function so they persist)
    window.activeMarker = window.activeMarker || null;
    window.mobilePopupActive = window.mobilePopupActive || false;
    window.establishments = window.establishments || [];
    
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
    let _markerClusterGroup = L.markerClusterGroup({
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
    
    // Initialize UI elements and load data
    setupEventListeners();
    setActiveNavLink();
    loadEstablishmentsData();
    setupMobilePopup();
    
    // Setup event listeners
    function setupEventListeners() {
        // Reset view handler function
        function resetView() {
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
            
            // Adjust delay based on whether the sheet was open
            const delay = sheetWasOpen ? 350 : 50;
            
            setTimeout(() => {
                // Reset the view with animation
                map.setView([23.5558, 120.4705], 17, {
                    animate: true,
                    duration: 0.5
                });
                
                // Fix touch handlers
                resetMapTouchHandlers();
                
                console.log('Map view reset to default position');
            }, delay);
        }

        // Reset view button for non-touch devices
        const resetViewBtn = document.getElementById('reset-view-btn');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                resetView();
            });
        }

        // Map nav button - no longer associated with active state
        const mapNavButton = document.getElementById('map-nav-btn');
        if (mapNavButton) {
            // For all devices, just prevent default behavior
            mapNavButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // No active state check needed, just reset view
                resetView();
            });
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            map.closePopup();
            
            // Close the appropriate mobile view based on device type
            if (isTouchDevice() && window.bottomSheetActive) {
                closeBottomSheet();
            } else if (window.mobilePopupActive) {
                closeMobilePopup();
            }
        });
        
        // Handle popup close event
        map.on('popupclose', (e) => {
            if (e.popup && e.popup._sourceMarker) {
                const marker = e.popup._sourceMarker;
                
                // Re-add click handler after a short delay
                setTimeout(() => {
                    marker.off('click');
                    marker.on('click', () => {
                        window.innerWidth <= 768 ? showMobilePopup(marker) : showDesktopPopup(marker);
                        activeMarker = marker;
                    });
                }, 50);
            }
            
            activeMarker = null;
        });
        
        // Add a special fix for iOS devices
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            document.addEventListener('touchstart', function() {
                // This empty handler enables :active CSS states on iOS
            }, false);
        }
        
        // Add hammer.js-like touch event handler
        const mapContainer = document.getElementById('map');
        
        // Track touch events
        let touchStartTime = 0;
        let touchStartPos = { x: 0, y: 0 };
        let isTouching = false;
        
        mapContainer.addEventListener('touchstart', function(e) {
            touchStartTime = Date.now();
            touchStartPos = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            isTouching = true;
        }, { passive: true });
        
        mapContainer.addEventListener('touchend', function(e) {
            isTouching = false;
            // If no popup is active and touch isn't working, try resetting handlers
            if (!mobilePopupActive && Date.now() - touchStartTime > 300) {
                resetMapTouchHandlers();
            }
        }, { passive: true });
    }
    
    // Function to completely reset map touch handlers
    function resetMapTouchHandlers() {
        console.log('Resetting map touch handlers');
        
        try {
            // Make sure map is valid
            if (!map || typeof map.invalidateSize !== 'function') return;
            
            // First use our generic touch reset function
            resetTouchSystem(() => {
                // Now do map-specific resets
                try {
                    // Force a complete re-initialization of the map
                    map.invalidateSize({reset: true, pan: false});
                    
                    // Enable all possible interactions
                    map.dragging.enable();
                    map.touchZoom.enable();
                    map.doubleClickZoom.enable();
                    map.scrollWheelZoom.enable();
                    map.boxZoom.enable();
                    map.keyboard.enable();
                    if (map.tap) map.tap.enable();
                    
                    // Reset handlers from saved originals if available
                    if (window._originalMapHandlers) {
                        map._onTouchStart = window._originalMapHandlers._onTouchStart;
                        map._onTouchEnd = window._originalMapHandlers._onTouchEnd;
                        map._onTouchMove = window._originalMapHandlers._onTouchMove;
                    }
                    
                    // Fix CSS related issues
                    const mapContainer = document.getElementById('map');
                    if (mapContainer) {
                        // Ensure proper CSS classes
                        mapContainer.classList.add('leaflet-touch');
                        mapContainer.classList.add('leaflet-touch-drag');
                        mapContainer.classList.add('leaflet-touch-zoom');
                        
                        // Reset any CSS that might be interfering
                        mapContainer.style.touchAction = '';
                        mapContainer.style.pointerEvents = '';
                    }
                    
                    // Ensure body doesn't have any lingering styles
                    document.body.style.overflow = '';
                    document.body.style.touchAction = '';
                    document.body.style.position = '';
                    
                    console.log('Map-specific touch handlers reset complete');
                } catch (innerError) {
                    console.error('Error in map-specific reset:', innerError);
                }
            });
        } catch (error) {
            console.error('Error resetting touch handlers:', error);
        }
    }
    
    // No longer setting active class on navigation links
    function setActiveNavLink() {
        // We no longer set active states on links
        return;
    }
    
    // Load establishment data from GeoJSON file
    function loadEstablishmentsData() {
        fetch('src/data/establishments.geojson')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                // Extract standard information if available
                if (data.standard) {
                    window.legalStandard = {
                        year: data.standard.year || '2025',
                        salary: data.standard.salary || 'N/A',
                        勞健保: data.standard.勞健保 || false,
                        國定雙倍: data.standard.國定雙倍 || false
                    };
                } else {
                    // Default standard if not provided
                    window.legalStandard = {
                        year: '2025',
                        salary: 'NT$ 180/小時',
                        勞健保: true,
                        國定雙倍: true
                    };
                }
                
                window.establishments = data.features.map(feature => {
                    // Convert GeoJSON coordinates [lng, lat] to Leaflet coordinates [lat, lng]
                    const [lng, lat] = feature.geometry.coordinates;
                    
                    return {
                        name: feature.properties.name,
                        position: [lat, lng],
                        icon: feature.properties.icon || 'building',
                        salary: feature.properties.salary || 'N/A',
                        // Using Chinese property names in display
                        供餐: feature.properties.供餐 || feature.properties.mealProvided || false,
                        試用期: feature.properties.試用期 || feature.properties.holidayPay || false,
                        勞健保: feature.properties.勞健保 || feature.properties.flexibleHours || false,
                        國定雙倍: feature.properties.國定雙倍 || feature.properties.trainingProvided || false,
                        環境評分: feature.properties.環境評分 || feature.properties.environmentRating || 0,
                        滿意度評分: feature.properties.滿意度評分 || feature.properties.managementRating || 0,
                        certified: feature.properties.certified || false,
                        updates: feature.properties.updates || {
                            salary: '', 
                            供餐: '', 
                            試用期: '',
                            勞健保: '', 
                            國定雙倍: '',
                            環境評分: '', 
                            滿意度評分: ''
                        }
                    };
                });
                
                addMapMarkers();
            })
            .catch(error => {
                console.error('Error loading establishments data:', error);
                setupDefaultEstablishments();
            });
    }
    
    // Setup default establishments if data fails to load
    function setupDefaultEstablishments() {
        // Default legal standard
        window.legalStandard = {
            year: '2025',
            salary: 'NT$ 176/小時',
            勞健保: true,
            國定雙倍: true
        };
        
        window.establishments = [
            {
                name: "咖啡廳工讀",
                position: [23.5559, 120.4715],
                icon: "coffee",
                salary: "NT$ 180/小時",
                供餐: true,
                試用期: true,
                勞健保: true,
                國定雙倍: false,
                環境評分: 3,
                滿意度評分: 4,
                certified: true,
                updates: {
                    salary: "2023/10/15",
                    供餐: "2023/10/15", 
                    試用期: "2023/10/20",
                    勞健保: "2023/09/30",
                    國定雙倍: "2023/10/05",
                    環境評分: "2023/10/10",
                    滿意度評分: "2023/09/25"
                }
            },
            {
                name: "便利商店工讀",
                position: [23.5570, 120.4720],
                icon: "store",
                salary: "NT$ 160/小時",
                供餐: false,
                試用期: true,
                勞健保: false,
                國定雙倍: true,
                環境評分: 4,
                滿意度評分: 3,
                certified: true,
                updates: {
                    salary: "2023/10/10",
                    供餐: "2023/10/10", 
                    試用期: "2023/10/10",
                    勞健保: "2023/10/10",
                    國定雙倍: "2023/10/10",
                    環境評分: "2023/10/10",
                    滿意度評分: "2023/10/10"
                }
            }
        ];
        
        addMapMarkers();
    }
    
    // Add markers for all establishments
    function addMapMarkers() {
        console.log('Adding map markers');
        
        // Clear any existing markers first
        if (window.markerClusterGroup) {
            window.markerClusterGroup.clearLayers();
        }
        
        // Make sure we're dealing with an array of establishments
        if (!window.establishments || !Array.isArray(window.establishments)) {
            console.error('No establishments data to add');
            return;
        }
        
        console.log(`Adding ${window.establishments.length} establishments`);
        
        // Get or create a separate container for the hover labels
        let labelContainer = document.getElementById('map-label-container');
        if (!labelContainer) {
            labelContainer = document.createElement('div');
            labelContainer.id = 'map-label-container';
            labelContainer.style.position = 'absolute';
            labelContainer.style.top = '0';
            labelContainer.style.left = '0';
            labelContainer.style.width = '100%';
            labelContainer.style.height = '100%';
            labelContainer.style.pointerEvents = 'none';
            labelContainer.style.zIndex = '1000';
            document.getElementById('map').appendChild(labelContainer);
        } else {
            labelContainer.innerHTML = ''; // Clear existing labels
        }
        
        window.establishments.forEach(establishment => {
            // Create marker HTML elements
            const markerIcon = document.createElement('div');
            markerIcon.className = 'marker-icon';
            markerIcon.innerHTML = `<i class="fas fa-${establishment.icon}"></i>`;
            
            // Create marker container - without the embedded label for simplicity
            const markerContainer = document.createElement('div');
            markerContainer.className = 'custom-marker';
            markerContainer.appendChild(markerIcon);
            
            // Create custom icon and marker
            const customIcon = L.divIcon({
                html: markerContainer,
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            const marker = L.marker(establishment.position, { icon: customIcon });
            marker.establishment = establishment;
            
            // Create a hover label - only need one type of label now
            const hoverLabel = document.createElement('div');
            hoverLabel.className = 'hover-label';
            hoverLabel.textContent = establishment.name;
            hoverLabel.style.display = 'none';
            labelContainer.appendChild(hoverLabel);
            
            // Store a reference to the hover label
            marker.hoverLabel = hoverLabel;
            
            // Add hover events directly to the marker element (but only for non-touch devices)
            if (!isTouchDevice()) {
                marker.on('mouseover', function() {
                    // Hide any other active labels first
                    if (activeHoverLabel && activeHoverLabel !== hoverLabel) {
                        hideAllHoverLabels();
                    }
                    
                    // Set this as the active label
                    activeHoverLabel = hoverLabel;
                    
                    // Position and show label
                    const markerPosition = map.latLngToContainerPoint(this.getLatLng());
                    hoverLabel.style.left = `${markerPosition.x}px`;
                    hoverLabel.style.top = `${markerPosition.y + 20}px`;
                    hoverLabel.style.display = 'block';
                    
                    // Add transition effect - start with label slightly up and transparent
                    hoverLabel.style.opacity = '0';
                    hoverLabel.style.transform = 'translateX(-50%) translateY(-5px)';
                    
                    // Trigger transition after a small delay to ensure it runs
                    setTimeout(() => {
                        hoverLabel.style.opacity = '1';
                        hoverLabel.style.transform = 'translateX(-50%) translateY(0)';
                    }, 10);
                });
                
                marker.on('mouseout', function() {
                    // Only hide if we're not mousing over directly to the element
                    const markerElement = marker.getElement();
                    if (markerElement && !markerElement.matches(':hover')) {
                        // Fade out with transition
                        hoverLabel.style.opacity = '0';
                        hoverLabel.style.transform = 'translateX(-50%) translateY(-5px)';
                        
                        // Hide after transition completes
                        setTimeout(() => {
                            if (hoverLabel.style.opacity === '0') {
                                hoverLabel.style.display = 'none';
                                if (activeHoverLabel === hoverLabel) {
                                    activeHoverLabel = null;
                                }
                            }
                        }, 300);
                    }
                });
                
                // Apply transitions when marker icon is hovered directly
                const markerElement = marker.getElement();
                if (markerElement) {
                    markerElement.addEventListener('mouseenter', function() {
                        // Hide any other active labels first
                        if (activeHoverLabel && activeHoverLabel !== hoverLabel) {
                            hideAllHoverLabels();
                        }
                        
                        // Set this as the active label
                        activeHoverLabel = hoverLabel;
                        
                        // Show the hover label on icon hover
                        const markerPosition = map.latLngToContainerPoint(marker.getLatLng());
                        hoverLabel.style.left = `${markerPosition.x}px`;
                        hoverLabel.style.top = `${markerPosition.y + 20}px`;
                        hoverLabel.style.display = 'block';
                        
                        setTimeout(() => {
                            hoverLabel.style.opacity = '1';
                            hoverLabel.style.transform = 'translateX(-50%) translateY(0)';
                        }, 10);
                        
                        // Animate the marker icon
                        const iconElement = markerElement.querySelector('.marker-icon');
                        if (iconElement) {
                            iconElement.style.transform = 'scale(1.2)';
                            iconElement.style.backgroundColor = '#FF6347'; // Tomato - slightly darker on hover
                        }
                    });
                    
                    markerElement.addEventListener('mouseleave', function() {
                        // Fade out hover label
                        hoverLabel.style.opacity = '0';
                        hoverLabel.style.transform = 'translateX(-50%) translateY(-5px)';
                        
                        setTimeout(() => {
                            if (hoverLabel.style.opacity === '0') {
                                hoverLabel.style.display = 'none';
                                if (activeHoverLabel === hoverLabel) {
                                    activeHoverLabel = null;
                                }
                            }
                        }, 300);
                        
                        // Revert marker icon animation
                        const iconElement = markerElement.querySelector('.marker-icon');
                        if (iconElement) {
                            iconElement.style.transform = '';
                            iconElement.style.backgroundColor = '';
                        }
                    });
                }
            }
            
            // Update label position when map moves or zooms
            if (!isTouchDevice()) {
                map.on('move', function() {
                    if (activeHoverLabel === hoverLabel && hoverLabel.style.display === 'block') {
                        const markerPosition = map.latLngToContainerPoint(marker.getLatLng());
                        hoverLabel.style.left = `${markerPosition.x}px`;
                        hoverLabel.style.top = `${markerPosition.y + 20}px`;
                    }
                });
            }
            
            // Add click event listener to marker with improved touch handling
            marker.on('click', (e) => {
                // Prevent event propagation to avoid conflicts
                if (e && e.originalEvent) {
                    e.originalEvent.stopPropagation();
                }
                
                console.log('Marker clicked', marker.establishment.name);
                
                // For touch devices, provide visual feedback
                const markerElement = marker.getElement();
                if (markerElement) {
                    const iconElement = markerElement.querySelector('.marker-icon');
                    if (iconElement) {
                        // Flash animation for visual feedback
                        iconElement.style.transform = 'scale(1.2)';
                        iconElement.style.backgroundColor = '#FF6347';
                        
                        // Reset after animation
                        setTimeout(() => {
                            iconElement.style.transform = '';
                            iconElement.style.backgroundColor = '';
                        }, 250);
                    }
                }
                
                // Determine which popup method to use based on device
                if (window.innerWidth <= 768) {
                    showMobilePopup(marker);
                } else {
                    showDesktopPopup(marker);
                }
                
                // Track active marker
                activeMarker = marker;
            });
            
            // Add marker to cluster group instead of directly to map
            markerClusterGroup.addLayer(marker);
        });
        
        // Add cluster group to map
        map.addLayer(markerClusterGroup);
    }
    
    // Display popup for desktop view
    function showDesktopPopup(marker) {
        map.closePopup();
        
        const popup = L.popup({
            closeButton: true,
            autoClose: false,
            className: 'establishment-popup-container',
            offset: [0, -20],
            autoPan: false
        });
        
        popup.setContent(createPopupContent(marker.establishment));
        popup.setLatLng(marker.getLatLng());
        popup.openOn(map);
        popup._sourceMarker = marker;
        
        // Toggle popup on marker click
        marker.off('click');
        marker.on('click', () => {
            if (map.hasLayer(popup)) {
                map.closePopup();
                activeMarker = null;
                
                setTimeout(() => {
                    marker.off('click');
                    marker.on('click', () => {
                        window.innerWidth <= 768 ? showMobilePopup(marker) : showDesktopPopup(marker);
                        activeMarker = marker;
                    });
                }, 50);
            }
        });
    }
    
    // Detect if the device has touch support
    function isTouchDevice() {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0);
    }
    
    // Setup mobile popup elements - used for non-touch devices
    function setupMobilePopup() {
        if (!document.querySelector('.mobile-popup-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'mobile-popup-overlay';
            
            const container = document.createElement('div');
            container.className = 'mobile-popup-container';
            
            document.body.appendChild(overlay);
            document.body.appendChild(container);
            
            overlay.addEventListener('click', closeMobilePopup);
        }
    }
    
    // Setup bottom sheet for touch devices as fullscreen modal
    function setupBottomSheet() {
        // The bottom sheet container is already in the HTML
        const bottomSheet = document.getElementById('bottom-sheet-container');
        
        // Initialize the bottom sheet to be completely hidden on page load
        if (bottomSheet) {
            bottomSheet.style.transform = 'translateY(100%)';
            bottomSheet.style.visibility = 'hidden';
            bottomSheet.style.pointerEvents = 'none';
            
            // Hide the handle as we don't need it for the fullscreen modal approach
            const handle = bottomSheet.querySelector('.bottom-sheet-handle');
            if (handle) {
                handle.style.display = 'none';
            }
        }
        
        // Return an empty object since we're not using drag functionality
        return { handleTouch: {} };
    }
    
    // Display appropriate view for mobile devices
    function showMobilePopup(marker) {
        // Choose between bottom sheet (touch) and popup (non-touch)
        if (isTouchDevice()) {
            showBottomSheet(marker);
        } else {
            showMobilePopupLegacy(marker);
        }
    }
    
    // Show bottom sheet for touch devices using fullscreen modal approach
    function showBottomSheet(marker) {
        console.log('Opening bottom sheet as fullscreen modal');
        if (!marker || !marker.establishment) return;
        
        const bottomSheet = document.getElementById('bottom-sheet-container');
        const bottomSheetContent = document.getElementById('bottom-sheet-content');
        
        if (!bottomSheet || !bottomSheetContent) return;
        
        // Reset the transform to ensure it can be shown
        bottomSheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Save current map state before showing bottom sheet
        saveMapState();
        
        // Prevent scrolling of background
        document.body.style.overflow = 'hidden';
        
        // Create content wrapper with header
        const wrapper = document.createElement('div');
        wrapper.className = 'bottom-sheet-wrapper';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'bottom-sheet-header';
        
        const titleContainer = document.createElement('div');
        titleContainer.className = 'bottom-sheet-title-container';
        
        const title = document.createElement('h3');
        title.className = 'bottom-sheet-title';
        title.textContent = marker.establishment.name;
        titleContainer.appendChild(title);
        
        // Add certification badge if needed
        if (marker.establishment.certified) {
            const certBadge = document.createElement('div');
            certBadge.className = 'certification-badge';
            certBadge.innerHTML = '<i class="fas fa-award"></i>';
            certBadge.title = '已認證';
            titleContainer.appendChild(certBadge);
        }
        
        header.appendChild(titleContainer);
        
        // Add close button that returns to map
        const closeBtn = document.createElement('div');
        closeBtn.className = 'bottom-sheet-close';
        closeBtn.innerHTML = '<i class="fas fa-arrow-left"></i>'; // Changed to back arrow
        closeBtn.title = '返回地圖';
        
        // Add simpler event listeners for better touch response
        closeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeBottomSheet();
        });
        
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeBottomSheet();
        });
        
        header.appendChild(closeBtn);
        
        // Create the establishment content
        const popupContent = createPopupContent(marker.establishment);
        
        // Remove the header from the popup content to avoid duplication
        const existingHeader = popupContent.querySelector('.establishment-popup-header');
        if (existingHeader) {
            existingHeader.remove();
        }
        
        // Add the bottom-sheet-specific class
        popupContent.classList.add('bottom-sheet-establishment-content');
        
        // Combine elements
        wrapper.appendChild(header);
        wrapper.appendChild(popupContent);
        
        // Add to bottom sheet
        bottomSheetContent.innerHTML = '';
        bottomSheetContent.appendChild(wrapper);
        
        // Ensure the bottom sheet is properly positioned first
        bottomSheet.style.visibility = 'visible';
        bottomSheet.style.pointerEvents = 'auto';
        bottomSheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s';
        
        // Set transform and force browser repaint before animation
        bottomSheet.style.transform = 'translateY(100%)';  
        void bottomSheet.offsetHeight;
        
        // Show the bottom sheet with animation immediately
        bottomSheet.classList.add('active');
        bottomSheet.style.transform = 'translateY(0)';
        
        // Store the current marker as active
        window.activeMarker = marker;
        window.bottomSheetActive = true;
        
        // Disable map touch events entirely while modal is open
        if (map) {
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
            if (map.tap) map.tap.disable();
        }
        
        console.log('Bottom sheet activated as fullscreen modal');
    }
    
    // Close bottom sheet
    function closeBottomSheet() {
        console.log('Closing bottom sheet');
        const bottomSheet = document.getElementById('bottom-sheet-container');
        
        if (!bottomSheet) return;
        
        // Make sure the bottom sheet has transition
        bottomSheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s';
        
        // Hide with animation - move completely off screen and hide 
        bottomSheet.classList.remove('active');
        bottomSheet.style.transform = 'translateY(100%)';
        
        // Restore body scrolling
        document.body.style.overflow = '';
        
        // After animation completes, set visibility to hidden
        setTimeout(() => {
            bottomSheet.style.visibility = 'hidden';
            bottomSheet.style.pointerEvents = 'none';
            
            // Re-enable map interactions
            if (map) {
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                if (map.tap) map.tap.enable();
                
                // Force a map refresh to ensure touch is working
                try {
                    map.invalidateSize({reset: true, pan: false});
                } catch(e) {
                    console.error('Error refreshing map:', e);
                }
            }
        }, 300);
        
        // Clear state variables
        window.bottomSheetActive = false;
        window.activeMarker = null;
        
        // No longer setting active states on nav links
    }
    
    // Display popup for mobile view (legacy approach for non-touch devices)
    function showMobilePopupLegacy(marker) {
        console.log('Opening mobile popup (legacy)');
        if (!marker || !marker.establishment) return;
        
        const overlay = document.querySelector('.mobile-popup-overlay');
        const container = document.querySelector('.mobile-popup-container');
        
        if (!overlay || !container) {
            setupMobilePopup();
            return showMobilePopupLegacy(marker);
        }
        
        // Save current map state before showing popup
        saveMapState();
        
        // First, make sure all map interactions are disabled
        if (map) {
            // Disable all map interactions
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
            map.scrollWheelZoom.disable();
            map.boxZoom.disable();
            map.keyboard.disable();
            if (map.tap) map.tap.disable();
        }
        
        // Create content for the popup
        const content = createPopupContent(marker.establishment);
        
        const closeBtn = document.createElement('div');
        closeBtn.className = 'mobile-popup-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', closeMobilePopup);
        
        container.innerHTML = '';
        container.appendChild(content);
        container.appendChild(closeBtn);
        
        overlay.classList.add('active');
        container.classList.add('active');
        
        // Add this to prevent background scrolling/zooming while popup is open
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        
        // Store the current marker as active
        window.activeMarker = marker;
        window.mobilePopupActive = true;
    }
    
    // Close mobile popup (legacy approach for non-touch devices)
    function closeMobilePopup() {
        console.log('Closing mobile popup (legacy)');
        const overlay = document.querySelector('.mobile-popup-overlay');
        const container = document.querySelector('.mobile-popup-container');
        
        if (!overlay || !container) return;
        
        overlay.classList.remove('active');
        container.classList.remove('active');
        
        window.mobilePopupActive = false;
        window.activeMarker = null;
        
        // Restore body styles
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        document.body.style.position = '';
        
        // Use the centralized touch reset function with map reinitialization
        resetTouchSystem(() => {
            // Save any important map state before rebuilding
            saveMapState(); 
            
            // Re-initialize the map from scratch
            initializeMap();
            
            // Rebuild markers and UI after map is re-initialized
            setupEventListeners();
            setActiveNavLink();
            
            // If we already loaded establishments data, don't reload it
            if (window.establishments && window.establishments.length > 0) {
                console.log('Re-adding existing markers');
                addMapMarkers();
            } else {
                console.log('Loading establishment data');
                loadEstablishmentsData();
            }
            
            console.log('Map re-initialization complete');
            
            // Re-setup the mobile popup elements
            setupMobilePopup();
        });
    }
    
    // Create popup content with establishment data and legal standards
    function createPopupContent(establishment) {
        const container = document.createElement('div');
        container.className = 'establishment-popup';
        
        // Create header with title and certification badge
        const header = document.createElement('div');
        header.className = 'establishment-popup-header';
        
        const titleContainer = document.createElement('div');
        titleContainer.style.display = 'flex';
        titleContainer.style.alignItems = 'center';
        
        const title = document.createElement('h3');
        title.textContent = establishment.name;
        titleContainer.appendChild(title);
        
        const certBadge = document.createElement('div');
        certBadge.className = establishment.certified ? 'certification-badge' : 'certification-badge inactive';
        certBadge.innerHTML = '<i class="fas fa-award"></i>';
        certBadge.title = establishment.certified ? '已認證' : '未認證';
        titleContainer.appendChild(certBadge);
        
        header.appendChild(titleContainer);
        
        // Create tabs for toggling between establishment info and legal standards
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'popup-tabs';
        
        const establishmentTab = document.createElement('div');
        establishmentTab.className = 'popup-tab active';
        establishmentTab.textContent = '店家資訊';
        establishmentTab.dataset.target = 'establishment-info';
        
        const standardsTab = document.createElement('div');
        standardsTab.className = 'popup-tab';
        standardsTab.textContent = '法定規範';
        standardsTab.dataset.target = 'legal-standards';
        
        tabsContainer.appendChild(establishmentTab);
        tabsContainer.appendChild(standardsTab);
        
        // Create content section with all details
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'popup-content-wrapper';
        
        // Establishment info content
        const establishmentContent = document.createElement('div');
        establishmentContent.className = 'establishment-popup-content active';
        establishmentContent.id = 'establishment-info';
        
        // Add salary info
        establishmentContent.appendChild(createInfoRowWithUpdate('時薪', establishment.salary, establishment.updates.salary));
        
        // Add boolean values with icons
        establishmentContent.appendChild(createBooleanRowWithUpdate('供餐', establishment.供餐, establishment.updates.供餐));
        establishmentContent.appendChild(createBooleanRowWithUpdate('試用期', establishment.試用期, establishment.updates.試用期));
        establishmentContent.appendChild(createBooleanRowWithUpdate('勞健保', establishment.勞健保, establishment.updates.勞健保));
        establishmentContent.appendChild(createBooleanRowWithUpdate('國定雙倍', establishment.國定雙倍, establishment.updates.國定雙倍));
        
        // Add star ratings
        establishmentContent.appendChild(createStarRatingRowWithUpdate('環境評分', establishment.環境評分, establishment.updates.環境評分));
        establishmentContent.appendChild(createStarRatingRowWithUpdate('滿意度評分', establishment.滿意度評分, establishment.updates.滿意度評分));
        
        // Legal standards content
        const standardsContent = document.createElement('div');
        standardsContent.className = 'establishment-popup-content standards-content';
        standardsContent.id = 'legal-standards';
        
        // Add standards year header with icon
        const yearHeader = document.createElement('div');
        yearHeader.className = 'standards-year';
        yearHeader.innerHTML = `<i class="fas fa-balance-scale"></i> ${window.legalStandard.year} 年法定規範`;
        standardsContent.appendChild(yearHeader);
        
        // Add explanation text
        const explanationText = document.createElement('div');
        explanationText.className = 'standards-explanation';
        explanationText.innerHTML = '依據勞動基準法規定，以下是雇主應遵守的基本標準：<br><small>法律未規範供餐和試用期</small>';
        standardsContent.appendChild(explanationText);
        
        // Add comparison rows for objective criteria
        standardsContent.appendChild(createComparisonRow('時薪', window.legalStandard.salary, establishment.salary));
        standardsContent.appendChild(createComparisonBooleanRow('勞健保', window.legalStandard.勞健保, establishment.勞健保));
        standardsContent.appendChild(createComparisonBooleanRow('國定雙倍', window.legalStandard.國定雙倍, establishment.國定雙倍));
        
        // Add footer with info about standards
        const standardsFooter = document.createElement('div');
        standardsFooter.className = 'standards-footer';
        standardsFooter.innerHTML = '<span><i class="fas fa-info-circle"></i> 綠色表示符合或優於標準，紅色表示未達標準</span>';
        standardsContent.appendChild(standardsFooter);
        
        // Add tab event listeners
        establishmentTab.addEventListener('click', function() {
            establishmentTab.classList.add('active');
            standardsTab.classList.remove('active');
            establishmentContent.classList.add('active');
            standardsContent.classList.remove('active');
        });
        
        standardsTab.addEventListener('click', function() {
            standardsTab.classList.add('active');
            establishmentTab.classList.remove('active');
            standardsContent.classList.add('active');
            establishmentContent.classList.remove('active');
        });
        
        // Add all content
        contentWrapper.appendChild(establishmentContent);
        contentWrapper.appendChild(standardsContent);
        
        // Combine all elements
        container.appendChild(header);
        container.appendChild(tabsContainer);
        container.appendChild(contentWrapper);
        
        return container;
    }
    
    // Create a comparison row that shows standard vs establishment value
    function createComparisonRow(label, standardValue, establishmentValue) {
        const row = document.createElement('div');
        row.className = 'comparison-row';
        
        const labelElement = document.createElement('div');
        labelElement.className = 'label';
        labelElement.textContent = label;
        
        const valuesContainer = document.createElement('div');
        valuesContainer.className = 'comparison-values';
        
        const standardElement = document.createElement('div');
        standardElement.className = 'standard-value';
        standardElement.innerHTML = `<span class="value-label">標準：</span>${standardValue}`;
        
        const establishmentElement = document.createElement('div');
        establishmentElement.className = 'establishment-value';
        establishmentElement.innerHTML = `<span class="value-label">店家：</span>${establishmentValue}`;
        
        // Determine if establishment meets or exceeds standard
        // For salary, we'd need to parse the values
        if (standardValue && establishmentValue) {
            const standardNum = parseInt(standardValue.replace(/[^0-9]/g, '')) || 0;
            const establishmentNum = parseInt(establishmentValue.replace(/[^0-9]/g, '')) || 0;
            
            if (establishmentNum >= standardNum) {
                establishmentElement.classList.add('meets-standard');
            } else {
                establishmentElement.classList.add('below-standard');
            }
        }
        
        valuesContainer.appendChild(standardElement);
        valuesContainer.appendChild(establishmentElement);
        
        row.appendChild(labelElement);
        row.appendChild(valuesContainer);
        
        return row;
    }
    
    // Create a comparison row for boolean values
    function createComparisonBooleanRow(label, standardValue, establishmentValue) {
        const row = document.createElement('div');
        row.className = 'comparison-row';
        
        const labelElement = document.createElement('div');
        labelElement.className = 'label';
        labelElement.textContent = label;
        
        const valuesContainer = document.createElement('div');
        valuesContainer.className = 'comparison-values';
        
        const standardElement = document.createElement('div');
        standardElement.className = 'standard-value';
        standardElement.innerHTML = `<span class="value-label">標準：</span>${standardValue ? 
            '<i class="fas fa-check-circle yes"></i> 是' : 
            '<i class="fas fa-times-circle no"></i> 否'}`;
        
        const establishmentElement = document.createElement('div');
        establishmentElement.className = 'establishment-value';
        establishmentElement.innerHTML = `<span class="value-label">店家：</span>${establishmentValue ? 
            '<i class="fas fa-check-circle yes"></i> 是' : 
            '<i class="fas fa-times-circle no"></i> 否'}`;
        
        // Special case for 試用期 - if standard is false but establishment is true, it's below standard
        if (label === '試用期' && standardValue === false && establishmentValue === true) {
            establishmentElement.classList.add('below-standard');
        }
        // Normal cases
        else if (standardValue === true && establishmentValue === true) {
            // Required true, and establishment is true -> meets standard
            establishmentElement.classList.add('meets-standard');
        } else if (standardValue === true && establishmentValue === false) {
            // Required true, but establishment is false -> below standard
            establishmentElement.classList.add('below-standard');
        } else if (standardValue === false && establishmentValue === true) {
            // Not required, but establishment provides it -> meets standard (exceeds)
            establishmentElement.classList.add('meets-standard');
        } else {
            // Not required, not provided -> meets standard (neutral)
            establishmentElement.classList.add('meets-standard');
        }
        
        valuesContainer.appendChild(standardElement);
        valuesContainer.appendChild(establishmentElement);
        
        row.appendChild(labelElement);
        row.appendChild(valuesContainer);
        
        return row;
    }
    
    // Create an info row with label, value and update time
    function createInfoRowWithUpdate(label, value, updateTime) {
        const row = document.createElement('div');
        row.className = 'info-row';
        
        const labelElement = document.createElement('div');
        labelElement.className = 'label';
        labelElement.textContent = label;
        
        const valueContainer = document.createElement('div');
        valueContainer.className = 'value';
        
        const valueElement = document.createElement('span');
        valueElement.textContent = value;
        valueContainer.appendChild(valueElement);
        
        if (updateTime) {
            const updateElement = document.createElement('span');
            updateElement.className = 'update-time';
            updateElement.title = '更新時間';
            updateElement.textContent = updateTime;
            valueContainer.appendChild(updateElement);
        }
        
        row.appendChild(labelElement);
        row.appendChild(valueContainer);
        
        return row;
    }
    
    // Create a boolean row with icon and update time
    function createBooleanRowWithUpdate(label, value, updateTime) {
        const row = document.createElement('div');
        row.className = 'info-row';
        
        const labelElement = document.createElement('div');
        labelElement.className = 'label';
        labelElement.textContent = label;
        
        const valueContainer = document.createElement('div');
        valueContainer.className = 'value';
        
        const valueElement = document.createElement('div');
        valueElement.className = 'boolean-value ' + (value ? 'yes' : 'no');
        valueElement.innerHTML = value ? 
            '<i class="fas fa-check-circle yes"></i> 是' : 
            '<i class="fas fa-times-circle no"></i> 否';
        
        valueContainer.appendChild(valueElement);
        
        if (updateTime) {
            const updateElement = document.createElement('span');
            updateElement.className = 'update-time';
            updateElement.title = '更新時間';
            updateElement.textContent = updateTime;
            valueContainer.appendChild(updateElement);
        }
        
        row.appendChild(labelElement);
        row.appendChild(valueContainer);
        
        return row;
    }
    
    // Create a star rating row with update time
    function createStarRatingRowWithUpdate(label, rating, updateTime) {
        const row = document.createElement('div');
        row.className = 'info-row';
        
        const labelElement = document.createElement('div');
        labelElement.className = 'label';
        labelElement.textContent = label;
        
        const valueContainer = document.createElement('div');
        valueContainer.className = 'value';
        
        const ratingElement = document.createElement('div');
        ratingElement.className = 'star-rating';
        
        // Add 5 stars (filled or empty based on rating)
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            star.className = i <= rating ? 'fas fa-star star filled' : 'far fa-star star';
            ratingElement.appendChild(star);
        }
        valueContainer.appendChild(ratingElement);
        
        if (updateTime) {
            const updateElement = document.createElement('span');
            updateElement.className = 'update-time';
            updateElement.title = '更新時間';
            updateElement.textContent = updateTime;
            valueContainer.appendChild(updateElement);
        }
        
        row.appendChild(labelElement);
        row.appendChild(valueContainer);
        
        return row;
    }
}