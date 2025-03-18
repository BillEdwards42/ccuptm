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

// Function to completely reset touch handling
function resetTouchSystem(callback) {
    console.log('Resetting touch system');
    
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
        
        // Add handler for mobile browsers to reset map if touch issues are detected
        if ('ontouchstart' in window || navigator.maxTouchPoints) {
            // Make the reset view button also reset the map instance if needed
            const resetViewBtn = document.getElementById('reset-view');
            if (resetViewBtn) {
                const originalClickHandler = resetViewBtn.onclick;
                resetViewBtn.onclick = function(e) {
                    // If original handler exists, call it
                    if (originalClickHandler) originalClickHandler.call(this, e);
                    
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
        document.getElementById('reset-view').addEventListener('click', () => {
            map.setView([23.5558, 120.4705], 17, {
                animate: true,
                duration: 0.5
            });
            
            // Fix touch handlers when reset button is clicked
            resetMapTouchHandlers();
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            map.closePopup();
            closeMobilePopup();
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
            
            // Create label for marker
            const markerLabel = document.createElement('div');
            markerLabel.className = 'marker-label';
            markerLabel.textContent = establishment.name;
            
            // Create marker container
            const markerContainer = document.createElement('div');
            markerContainer.className = 'custom-marker';
            markerContainer.appendChild(markerIcon);
            markerContainer.appendChild(markerLabel);
            
            // Create custom icon and marker
            const customIcon = L.divIcon({
                html: markerContainer,
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            const marker = L.marker(establishment.position, { icon: customIcon });
            marker.establishment = establishment;
            
            // Create a separate hover label
            const hoverLabel = document.createElement('div');
            hoverLabel.className = 'hover-label';
            hoverLabel.textContent = establishment.name;
            hoverLabel.style.display = 'none';
            labelContainer.appendChild(hoverLabel);
            
            // Store a reference to the hover label
            marker.hoverLabel = hoverLabel;
            
            // Add hover events directly to the marker element
            marker.on('mouseover', function() {
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
                // Fade out with transition
                hoverLabel.style.opacity = '0';
                hoverLabel.style.transform = 'translateX(-50%) translateY(-5px)';
                
                // Hide after transition completes
                setTimeout(() => {
                    if (hoverLabel.style.opacity === '0') {
                        hoverLabel.style.display = 'none';
                    }
                }, 300);
            });
            
            // Update label position when map moves or zooms
            map.on('move', function() {
                if (hoverLabel.style.display === 'block') {
                    const markerPosition = map.latLngToContainerPoint(marker.getLatLng());
                    hoverLabel.style.left = `${markerPosition.x}px`;
                    hoverLabel.style.top = `${markerPosition.y + 20}px`;
                }
            });
            
            // Apply similar transition when marker icon is hovered directly
            const markerElement = marker.getElement();
            if (markerElement) {
                markerElement.addEventListener('mouseenter', function() {
                    // Also animate the marker icon for a better user experience
                    const iconElement = markerElement.querySelector('.marker-icon');
                    if (iconElement) {
                        iconElement.style.transform = 'scale(1.2)';
                        iconElement.style.backgroundColor = '#FF6347'; // Tomato - slightly darker on hover
                    }
                });
                
                markerElement.addEventListener('mouseleave', function() {
                    // Revert marker icon animation
                    const iconElement = markerElement.querySelector('.marker-icon');
                    if (iconElement) {
                        iconElement.style.transform = '';
                        iconElement.style.backgroundColor = '';
                    }
                });
            }
            
            // Add click event listener to marker
            marker.on('click', () => {
                window.innerWidth <= 768 ? showMobilePopup(marker) : showDesktopPopup(marker);
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
    
    // Setup mobile popup elements
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
    
    // Display popup for mobile view
    function showMobilePopup(marker) {
        console.log('Opening mobile popup');
        if (!marker || !marker.establishment) return;
        
        const overlay = document.querySelector('.mobile-popup-overlay');
        const container = document.querySelector('.mobile-popup-container');
        
        if (!overlay || !container) {
            setupMobilePopup();
            return showMobilePopup(marker);
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
    
    // Close mobile popup
    function closeMobilePopup() {
        console.log('Closing mobile popup');
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