// Function to set the active state based on current page
function setActiveState() {
    const page = window.location.pathname.split("/").pop() || 'index.html';
    
    document.querySelectorAll('.navbar-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (!link.id || link.id !== 'info-guide-btn') {
            const isActive = href === page || 
                            (page === '' && href === 'index.html') || 
                            (page === 'index.html' && href === 'index.html');
            link.classList.toggle('active', isActive);
        }
    });
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
                    
                    // For iOS Safari
                    setTimeout(() => {
                        infoContent.addEventListener('touchstart', function(e) {
                            // Allow scrolling within info-guide-content
                            if (infoContent.scrollHeight > infoContent.clientHeight) {
                                e.stopPropagation();
                            }
                        }, { passive: true });
                    }, 100);
                }
                
                // Set the info-guide-btn to active and remove active from other links
                document.querySelectorAll('.navbar-links a').forEach(link => {
                    if (link.id === 'info-guide-btn') {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        });
    }
    
    // Close button for info guide
    const infoGuideClose = document.getElementById('info-guide-close');
    if (infoGuideClose) {
        infoGuideClose.addEventListener('click', (e) => {
            e.preventDefault();
            const overlay = document.getElementById('info-guide-overlay');
            if (overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                
                // Use the centralized touch reset function
                resetTouchSystem(() => {
                    // Remove the active class from info-guide-btn
                    document.querySelectorAll('.navbar-links a').forEach(link => {
                        if (link.id === 'info-guide-btn') {
                            link.classList.remove('active');
                        }
                    });
                    
                    // Restore the correct active state
                    setActiveState();
                });
            }
        });
    }
    
    // Close on overlay click
    const infoGuideOverlay = document.getElementById('info-guide-overlay');
    if (infoGuideOverlay) {
        infoGuideOverlay.addEventListener('click', (e) => {
            if (e.target === infoGuideOverlay) {
                infoGuideOverlay.classList.remove('active');
                document.body.style.overflow = '';
                
                // Use the centralized touch reset function
                resetTouchSystem(() => {
                    // Remove the active class from info-guide-btn
                    document.querySelectorAll('.navbar-links a').forEach(link => {
                        if (link.id === 'info-guide-btn') {
                            link.classList.remove('active');
                        }
                    });
                    
                    // Restore the correct active state
                    setActiveState();
                });
            }
        });
    }
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('info-guide-overlay');
            if (overlay && overlay.classList.contains('active')) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                
                // Use the centralized touch reset function
                resetTouchSystem(() => {
                    // Remove the active class from info-guide-btn
                    document.querySelectorAll('.navbar-links a').forEach(link => {
                        if (link.id === 'info-guide-btn') {
                            link.classList.remove('active');
                        }
                    });
                    
                    // Restore the correct active state
                    setActiveState();
                });
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
        // Reset view button click handler - maintain default zoom level of 17
        document.getElementById('reset-view').addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default behavior
            e.stopPropagation(); // Stop event propagation
            
            console.log('Reset view button clicked');
            
            // Close any open popups or sheets
            let sheetWasOpen = window.bottomSheetActive;
            
            if (window.bottomSheetActive) {
                closeBottomSheet();
            }
            
            if (window.mobilePopupActive) {
                closeMobilePopup();
            }
            
            map.closePopup();
            
            // Make sure to wait long enough for sheet closing animation to complete
            const delay = sheetWasOpen ? 350 : 50;
            
            // Use a timeout to ensure UI updates before map manipulation
            setTimeout(() => {
                // Reset the view with animation
                map.setView([23.5558, 120.4705], 17, {
                    animate: true,
                    duration: 0.5
                });
                
                // Fix touch handlers when reset button is clicked
                resetMapTouchHandlers();
                
                console.log('Map view reset to default position');
            }, delay);
        });
        
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
    
    // Set active class on navigation links
    function setActiveNavLink() {
        const page = window.location.pathname.split("/").pop();
        
        document.querySelectorAll('.navbar-links a').forEach(link => {
            const href = link.getAttribute('href');
            const isActive = href === page || (page === '' && href === 'index.html');
            link.classList.toggle('active', isActive);
        });
    }
    
    // Load establishment data from GeoJSON file
    function loadEstablishmentsData() {
        fetch('src/data/establishments.geojson')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
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
            
            // Add click event listener to marker
            marker.on('click', () => {
                console.log('Marker clicked', marker.establishment.name);
                
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
    
    // Setup bottom sheet for touch devices
    function setupBottomSheet() {
        // The bottom sheet container is already in the HTML
        const bottomSheet = document.getElementById('bottom-sheet-container');
        
        // Initialize the bottom sheet to be completely hidden on page load
        if (bottomSheet) {
            bottomSheet.style.transform = 'translateY(120%)';
            bottomSheet.style.visibility = 'hidden';
            bottomSheet.style.pointerEvents = 'none';
        }
        
        // Set up touch event handling for dragging - moved outside "if" so it can be returned
        let startY = 0;
        let startTranslateY = 0;
        let currentTranslateY = 0;
        const maxTranslateY = 0;
        const minTranslateY = window.innerHeight;
        
        const handleTouch = {
            start: function(e) {
                const touches = e.touches[0];
                startY = touches.clientY;
                bottomSheet.style.transition = 'none';
                
                // Get the current transform value
                const style = window.getComputedStyle(bottomSheet);
                const matrix = new WebKitCSSMatrix(style.transform);
                startTranslateY = matrix.m42;
                
                document.addEventListener('touchmove', handleTouch.move, { passive: false });
                document.addEventListener('touchend', handleTouch.end, { passive: true });
            },
            
            move: function(e) {
                const touches = e.touches[0];
                const diffY = touches.clientY - startY;
                
                // Calculate new position
                currentTranslateY = Math.max(maxTranslateY, Math.min(minTranslateY, startTranslateY + diffY));
                
                // Apply new position
                bottomSheet.style.transform = `translateY(${currentTranslateY}px)`;
                
                // Prevent default only if we're dragging the sheet
                if (e.target.closest('.bottom-sheet-handle')) {
                    e.preventDefault();
                }
            },
            
            end: function(e) {
                bottomSheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s';
                
                // Snap to positions based on velocity and current position
                const endY = e.changedTouches[0].clientY;
                const diffY = endY - startY;
                console.log('Touch drag distance:', diffY);
                
                // If the sheet is currently active (fully showing)
                if (bottomSheet.classList.contains('active')) {
                    // If dragged down a lot
                    if (diffY > 70) {
                        // Close completely
                        closeBottomSheet();
                    } 
                    // If dragged down a little
                    else if (diffY > 20) {
                        // Minimize to peek
                        bottomSheet.classList.remove('active');
                        bottomSheet.classList.add('peek');
                    }
                    // Otherwise stay fully open
                } 
                // If in peek state or just opening
                else {
                    // If dragged up
                    if (diffY < -20) {
                        // Expand to full
                        bottomSheet.classList.add('active');
                        bottomSheet.classList.remove('peek');
                        bottomSheet.style.visibility = 'visible';
                        bottomSheet.style.pointerEvents = 'auto';
                    } 
                    // If dragged down a lot 
                    else if (diffY > 50) {
                        // Close completely
                        closeBottomSheet();
                    }
                }
                
                document.removeEventListener('touchmove', handleTouch.move);
                document.removeEventListener('touchend', handleTouch.end);
            }
        };
        
        if (bottomSheet) {
            // Make sure the sheet is hidden initially with transform
            if (!bottomSheet.style.transform) {
                bottomSheet.style.transform = 'translateY(100%)';
            }
            
            // Add touch event listeners
            const handle = bottomSheet.querySelector('.bottom-sheet-handle');
            if (handle) {
                // Remove any existing listeners first to avoid duplicates
                const newHandle = handle.cloneNode(true);
                handle.parentNode.replaceChild(newHandle, handle);
                
                // Add the touch event listener
                newHandle.addEventListener('touchstart', handleTouch.start, { passive: true });
            }
            
            // Add touch event to the entire sheet for dragging (not just the handle)
            bottomSheet.addEventListener('touchstart', function(e) {
                // If already touching the handle, ignore (let the handle handler take over)
                if (e.target.closest('.bottom-sheet-handle')) {
                    return;
                }
                
                // For the sheet itself (not the content or controls), enable dragging
                if (e.target === bottomSheet || e.target.classList.contains('bottom-sheet-header')) {
                    handleTouch.start(e);
                }
            }, { passive: true });
        }
        
        // Return the handlers so they can be used elsewhere
        return { handleTouch };
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
    
    // Show bottom sheet for touch devices
    function showBottomSheet(marker) {
        console.log('Opening bottom sheet');
        if (!marker || !marker.establishment) return;
        
        const bottomSheet = document.getElementById('bottom-sheet-container');
        const bottomSheetContent = document.getElementById('bottom-sheet-content');
        
        if (!bottomSheet || !bottomSheetContent) return;
        
        // Reset the transform to ensure it can be shown
        bottomSheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Save current map state before showing bottom sheet
        saveMapState();
        
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
        
        // Add close button
        const closeBtn = document.createElement('div');
        closeBtn.className = 'bottom-sheet-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', closeBottomSheet);
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
        
        // Ensure the bottom sheet is properly positioned and visible first
        bottomSheet.style.visibility = 'visible';
        bottomSheet.style.pointerEvents = 'auto';
        bottomSheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s';
        
        // Start at the very bottom (120% off screen)
        bottomSheet.style.transform = 'translateY(120%)';
        
        // Force a browser repaint before animation
        void bottomSheet.offsetHeight;
        
        // Show the bottom sheet with animation after a brief delay to ensure styles are applied
        setTimeout(() => {
            bottomSheet.classList.add('active');
            bottomSheet.classList.remove('peek');
            bottomSheet.style.transform = 'translateY(0)'; // Explicitly set transform
            
            // Allow map interaction to continue (unlike popup approach)
            // We don't need to disable map interactions
            
            // Store the current marker as active
            window.activeMarker = marker;
            window.bottomSheetActive = true;
            
            console.log('Bottom sheet activated');
        }, 50);
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
        bottomSheet.classList.remove('peek');
        bottomSheet.style.transform = 'translateY(120%)';
        
        // After animation completes, set visibility to hidden
        setTimeout(() => {
            if (!bottomSheet.classList.contains('active') && !bottomSheet.classList.contains('peek')) {
                bottomSheet.style.visibility = 'hidden';
                bottomSheet.style.pointerEvents = 'none';
            }
        }, 300);
        
        // Clear state variables
        window.bottomSheetActive = false;
        window.activeMarker = null;
        
        // Clean up any event listeners that might be preventing future opens
        const handle = bottomSheet.querySelector('.bottom-sheet-handle');
        if (handle) {
            // Re-enable the touch events on the handle
            const newHandle = handle.cloneNode(true);
            handle.parentNode.replaceChild(newHandle, handle);
            
            // Re-add the touch event listener
            const touchHandlers = setupBottomSheet().handleTouch;
            newHandle.addEventListener('touchstart', touchHandlers.start, { passive: true });
            
            // Add event to detect swipe down on entire sheet
            bottomSheet.addEventListener('touchstart', function(e) {
                if (e.target === bottomSheet || e.target.classList.contains('bottom-sheet-header')) {
                    touchHandlers.start(e);
                }
            }, { passive: true });
        }
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
    
    // Create popup content with establishment data
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
        
        // Create content section with all details
        const content = document.createElement('div');
        content.className = 'establishment-popup-content';
        
        // Add salary info
        content.appendChild(createInfoRowWithUpdate('時薪', establishment.salary, establishment.updates.salary));
        
        // Add boolean values with icons
        content.appendChild(createBooleanRowWithUpdate('供餐', establishment.供餐, establishment.updates.供餐));
        content.appendChild(createBooleanRowWithUpdate('試用期', establishment.試用期, establishment.updates.試用期));
        content.appendChild(createBooleanRowWithUpdate('勞健保', establishment.勞健保, establishment.updates.勞健保));
        content.appendChild(createBooleanRowWithUpdate('國定雙倍', establishment.國定雙倍, establishment.updates.國定雙倍));
        
        // Add star ratings
        content.appendChild(createStarRatingRowWithUpdate('環境評分', establishment.環境評分, establishment.updates.環境評分));
        content.appendChild(createStarRatingRowWithUpdate('滿意度評分', establishment.滿意度評分, establishment.updates.滿意度評分));
        
        // Combine elements
        container.appendChild(header);
        container.appendChild(content);
        
        return container;
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