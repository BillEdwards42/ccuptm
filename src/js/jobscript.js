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

// Define constants for map centering
const DEFAULT_VIEW = [23.5558, 120.4705];
const DEFAULT_ZOOM = 17;

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
    console.log('Initializing job map...');
    
    // Detect iOS device specifically
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    console.log('Is iOS device:', isIOS);
    
    // Setup default map options
    const mapInitConfig = {
        zoomControl: false,  // We'll add custom zoom controls
        attributionControl: false,  // Add this later in a custom position
        closePopupOnClick: true,  // Close popups when clicking elsewhere
        preferCanvas: false,  // Use SVG instead of Canvas for better transitions
        minZoom: 17,
        maxZoom: 20,
        
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
    window.markerClusterGroup = L.markerClusterGroup({
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
    window.activeMarker = null;
    window.mobilePopupActive = false;
    window.establishments = [];
    
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

// Function to load establishment data
function loadEstablishmentsData() {
    console.log('Starting to load establishment data from establishments.geojson...');
    
    // Clear any existing markers to avoid duplicates
    if (window.markerClusterGroup) {
        window.markerClusterGroup.clearLayers();
        console.log("Cleared existing markers from cluster group");
    }
    
    // Reset originalMarkers to prevent filter confusion
    window.originalMarkers = null;
    
    fetch('../src/data/establishments.geojson')
        .then(response => {
            if (!response.ok) {
                console.error('Network response was not ok, status:', response.status);
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            console.log('Response received, parsing JSON...');
            return response.json();
        })
        .then(data => {
            console.log('Establishments data loaded successfully:', data);
            if (!data || !data.features || data.features.length === 0) {
                console.error('Warning: No establishment features found in loaded data');
            }
            
            // Extract standard information if available
            if (data.standard) {
                window.legalStandard = {
                    year: data.standard.year || '2025',
                    salary: data.standard.salary || 'N/A',
                    勞健保: data.standard.勞健保 || "是 5人以上需保",
                    國定雙倍: data.standard.國定雙倍 || false
                };
            } else {
                // Default standard if not provided
                window.legalStandard = {
                    year: '2025',
                    salary: 'NT$ 180/小時',
                    勞健保: "是 5人以上需保",
                    國定雙倍: true
                };
            }
            
            // Store in window.establishments for access
            window.establishments = data.features || [];
            console.log(`Found ${window.establishments.length} establishment properties`);
            
            // Create container for hover labels if it doesn't exist
            let labelContainer = document.getElementById('map-label-container');
            if (!labelContainer) {
                labelContainer = document.createElement('div');
                labelContainer.id = 'map-label-container';
                document.getElementById('map').appendChild(labelContainer);
            }
            
            // Process and add markers for each establishment
            const markers = window.establishments.map(feature => {
                try {
                    // Ensure coordinates exist
                    if (!feature.geometry || !feature.geometry.coordinates || feature.geometry.coordinates.length < 2) {
                        console.error("Missing coordinates in establishment:", feature);
                        return null;
                    }
                    
                    // Convert GeoJSON coordinates [lng, lat] to Leaflet coordinates [lat, lng]
                    const [lng, lat] = feature.geometry.coordinates;
                    
                    if (isNaN(lng) || isNaN(lat)) {
                        console.error("Invalid coordinates in establishment:", feature);
                        return null;
                    }
                    
                    // Extract hourly wage from salary string (e.g., "NT$ 190/小時" -> 190)
                    let hourlyWage = 0;
                    if (feature.properties.salary) {
                        const match = feature.properties.salary.match(/(\d+)/);
                        if (match && match[1]) {
                            hourlyWage = parseInt(match[1]);
                        }
                    }
                    
                    // Create marker with custom icon (coral color for job map)
                    const marker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            html: `<div class="marker-icon"><i class="fas fa-${feature.properties.icon || 'building'}"></i></div>`,
                            className: '',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    });
                    
                    // Store establishment data in marker
                    marker.establishment = {
                        name: feature.properties.name,
                        position: [lat, lng],
                        icon: feature.properties.icon || 'building',
                        salary: feature.properties.salary || 'N/A',
                        hourlyWage: hourlyWage,
                        供餐: feature.properties.供餐 || false,
                        試用期: feature.properties.試用期 || false,
                        勞健保: feature.properties.勞健保 || false,
                        國定雙倍: feature.properties.國定雙倍 || false,
                        環境評分: feature.properties.環境評分 || 0,
                        滿意度評分: feature.properties.滿意度評分 || 0,
                        環境評分人數: feature.properties.環境評分人數 || 0,
                        滿意度評分人數: feature.properties.滿意度評分人數 || 0,
                        updates: feature.properties.updates || {},
                        老闆的話: feature.properties.老闆的話 || '',
                        store_auth: feature.properties.store_auth || false,
                        question_auth: feature.properties.question_auth || false
                    };
                    
                    // Debug: log a few markers to verify data is attached
                    if (feature.properties.name) {
                        console.log(`Created marker for "${feature.properties.name}" with hourly wage: ${hourlyWage}`);
                    }
                    
                    // Add click handler for marker to show popup
                    marker.on('click', function() {
                        try {
                            // For touch devices, show the full-screen modal instead of popup
                            if (isTouchDevice()) {
                                // Show mobile popup (bottom sheet)
                                showMobilePopup(this);
                            } else {
                                // Create popup content for desktop
                                const popupContent = createEstablishmentPopup(this.establishment);
                                
                                // Add popup to marker
                                this.unbindPopup();
                                this.bindPopup(popupContent, {
                                    className: 'job-popup',
                                    maxWidth: 500,
                                    minWidth: 300,
                                    offset: [0, -15],
                                    autoPan: true,
                                    closeButton: true,
                                    autoClose: true,
                                    closeOnEscapeKey: true,
                                }).openPopup();
                                
                                // Initialize tabs in popup
                                setTimeout(() => {
                                    setupPopupTabs();
                                }, 10);
                            }
                        } catch (error) {
                            console.error('Error creating popup for establishment:', this.establishment?.name, error);
                        }
                    });
                    
                    // Add hover events for name label
                    marker.on('mouseover', function(e) {
                        // Create hover label if it doesn't exist
                        if (!this.hoverLabel) {
                            const label = document.createElement('div');
                            label.className = 'hover-label';
                            label.textContent = feature.properties.name;
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
                        this.hoverLabel.style.top = (point.y + 35) + 'px'; // Position further below the marker
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
                            marker.hoverLabel.style.top = (point.y + 35) + 'px'; // Position further below the marker
                        }
                    });
                    
                    return marker;
                } catch (error) {
                    console.error("Error creating marker:", error);
                    return null;
                }
            });
            
            // Filter out any null markers 
            const validMarkers = markers.filter(marker => marker !== null);
            console.log(`Created ${validMarkers.length} valid markers out of ${markers.length} establishments`);
            
            // Add markers to cluster group
            if (validMarkers.length > 0) {
                window.markerClusterGroup.addLayers(validMarkers);
                console.log("Markers added to cluster group");
            } else {
                console.error("No valid markers found to add to the map");
            }
            
            // Store original markers for later reference
            window.originalMarkers = validMarkers;
            
            // Add a global popup close handler for iOS refresh issue
            map.on('popupclose', function(e) {
                // Detect iOS specifically
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                
                if (isIOS) {
                    console.log('iOS popup close detected - triggering map refresh');
                    // Force a redraw of the map after popup closes
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
                    }, 100);
                }
            });
        })
        .catch(error => {
            console.error('Error loading establishments data:', error);
            // Try again with an alternate path in case the relative path is incorrect
            fetch('/src/data/establishments.geojson')
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    console.log('Establishments data loaded from alternate path:', data);
                    window.establishments = data.features || [];
                    
                    if (window.markerClusterGroup) {
                        window.markerClusterGroup.clearLayers();
                    }
                    
                    // Process and create markers (simplified)
                    if (window.establishments && window.establishments.length > 0) {
                        console.log("Creating markers from alternate path load");
                        const validMarkers = window.establishments
                            .map(feature => {
                                try {
                                    if (!feature.geometry || !feature.geometry.coordinates || feature.geometry.coordinates.length < 2) {
                                        return null;
                                    }
                                    
                                    const [lng, lat] = feature.geometry.coordinates;
                                    const marker = L.marker([lat, lng], {
                                        icon: L.divIcon({
                                            html: `<div class="marker-icon"><i class="fas fa-${feature.properties.icon || 'building'}"></i></div>`,
                                            className: '',
                                            iconSize: [30, 30],
                                            iconAnchor: [15, 15]
                                        })
                                    });
                                    
                                    // Extract hourly wage
                                    let hourlyWage = 0;
                                    if (feature.properties.salary) {
                                        const match = feature.properties.salary.match(/(\d+)/);
                                        if (match && match[1]) {
                                            hourlyWage = parseInt(match[1]);
                                        }
                                    }
                                    
                                    marker.establishment = {
                                        name: feature.properties.name,
                                        salary: feature.properties.salary || 'N/A',
                                        hourlyWage: hourlyWage,
                                        供餐: feature.properties.供餐 || false,
                                        試用期: feature.properties.試用期 || false,
                                        勞健保: feature.properties.勞健保 || false,
                                        國定雙倍: feature.properties.國定雙倍 || false,
                                        環境評分: feature.properties.環境評分 || 0,
                                        滿意度評分: feature.properties.滿意度評分 || 0,
                                        環境評分人數: feature.properties.環境評分人數 || 0,
                                        滿意度評分人數: feature.properties.滿意度評分人數 || 0,
                                        updates: feature.properties.updates || {},
                                        老闆的話: feature.properties.老闆的話 || '',
                                        store_auth: feature.properties.store_auth || false,
                                        question_auth: feature.properties.question_auth || false
                                    };
                                    
                                    // Simplified click handler
                                    marker.on('click', function() {
                                        if (isTouchDevice()) {
                                            showMobilePopup(this);
                                        } else {
                                            const popupContent = createEstablishmentPopup(this.establishment);
                                            this.bindPopup(popupContent, {
                                                className: 'job-popup',
                                                maxWidth: 500,
                                                minWidth: 300
                                            }).openPopup();
                                        }
                                    });
                                    
                                    return marker;
                                } catch (e) {
                                    console.error("Error creating marker in fallback:", e);
                                    return null;
                                }
                            })
                            .filter(marker => marker !== null);
                        
                        if (validMarkers.length > 0) {
                            window.markerClusterGroup.addLayers(validMarkers);
                            window.originalMarkers = validMarkers;
                            console.log(`Added ${validMarkers.length} markers from fallback method`);
                        }
                    }
                })
                .catch(secondError => {
                    console.error('Error loading establishments data from alternate path:', secondError);
                });
        });
}

// Function to create establishment popup content
function createEstablishmentPopup(establishment) {
    // Check if establishment data exists
    if (!establishment) {
        console.error('No establishment data provided to createEstablishmentPopup');
        return document.createElement('div');
    }
    
    // Create main popup container
    const popupContainer = document.createElement('div');
    popupContainer.className = 'establishment-popup job-popup-wrapper';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'establishment-popup-header';
    header.innerHTML = `<h3>${establishment.name || '未命名的店家'}</h3>`;
    popupContainer.appendChild(header);
    
    // Add auth badges under the header using info guide structure
    if (establishment.store_auth || establishment.question_auth) {
        const badgesContainer = document.createElement('div');
        badgesContainer.className = 'auth-icons-container';
        
        if (establishment.store_auth) {
            const storeIcon = document.createElement('div');
            storeIcon.className = 'icon-wrapper store-auth';
            storeIcon.innerHTML = '<i class="fas fa-store"></i>';
            storeIcon.setAttribute('data-tooltip', '此資訊由店家提供');
            badgesContainer.appendChild(storeIcon);
        }
        
        if (establishment.question_auth) {
            const questionIcon = document.createElement('div');
            questionIcon.className = 'icon-wrapper question-auth';
            questionIcon.innerHTML = '<i class="fas fa-clipboard-list"></i>';
            questionIcon.setAttribute('data-tooltip', '此資訊由問卷蒐集');
            badgesContainer.appendChild(questionIcon);
        }
        
        header.appendChild(badgesContainer);
    }
    
    // Create tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'popup-tabs';
    tabsContainer.innerHTML = `
        <div class="popup-tab active" data-tab="establishment-info">店家資訊</div>
        <div class="popup-tab" data-tab="legal-standards">法定規範</div>
    `;
    popupContainer.appendChild(tabsContainer);
    
    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'popup-content-wrapper';
    
    // Create establishment info content (first tab)
    const establishmentContent = document.createElement('div');
    establishmentContent.className = 'establishment-popup-content active';
    establishmentContent.id = 'establishment-info-content';
    
    // Get update dates from establishment updates
    const updates = establishment.updates || {};
    
    // Add salary info with date
    establishmentContent.appendChild(createInfoRow('時薪', establishment.salary || 'N/A', updates.salary || 'N/A'));
    
    // Add boolean values with icons and dates
    establishmentContent.appendChild(createBooleanRow('供餐', establishment.供餐, updates.供餐 || 'N/A'));
    establishmentContent.appendChild(createBooleanRow('試用期', establishment.試用期, updates.試用期 || 'N/A'));
    establishmentContent.appendChild(createBooleanRow('勞健保', establishment.勞健保, updates.勞健保 || 'N/A'));
    establishmentContent.appendChild(createBooleanRow('國定雙倍', establishment.國定雙倍, updates.國定雙倍 || 'N/A'));
    
    // Add star ratings with dates
    establishmentContent.appendChild(createStarRatingRow('環境評分', establishment.環境評分 || 0, establishment.環境評分人數 || 0, updates.環境評分 || 'N/A'));
    establishmentContent.appendChild(createStarRatingRow('滿意度評分', establishment.滿意度評分 || 0, establishment.滿意度評分人數 || 0, updates.滿意度評分 || 'N/A'));
    
    // Add 老闆的話 section if available
    if (establishment.老闆的話 && establishment.老闆的話.trim() !== '') {
        const ownerSection = document.createElement('div');
        ownerSection.className = 'job-info-section';
        ownerSection.innerHTML = `
            <p class="owner-message">${establishment.老闆的話}</p>
        `;
        establishmentContent.appendChild(ownerSection);
    }
    
    contentWrapper.appendChild(establishmentContent);
    
    // Create legal standards content (second tab)
    const standardsContent = document.createElement('div');
    standardsContent.className = 'establishment-popup-content';
    standardsContent.id = 'legal-standards-content';
    
    // Add standards year header
    const yearHeader = document.createElement('div');
    yearHeader.className = 'legal-standards-header';
    yearHeader.innerHTML = `<i class="fas fa-balance-scale"></i> ${window.legalStandard.year || '2025'} 年法定規範`;
    standardsContent.appendChild(yearHeader);
    
    // Add explanation text
    const explanationText = document.createElement('div');
    explanationText.className = 'legal-standards-subtitle';
    explanationText.innerHTML = `
        <p>依據勞動基準法規定，以下是雇主應遵守的基本標準：</p>
        <p class="subtitle-note">法律未規範供餐和試用期</p>
    `;
    standardsContent.appendChild(explanationText);
    
    // Add comparison sections
    const comparisonsContainer = document.createElement('div');
    comparisonsContainer.className = 'legal-comparisons-container';
    
    // Add salary comparison
    comparisonsContainer.appendChild(createComparisonSection('時薪', window.legalStandard.salary, establishment.salary));
    
    // Add 勞健保 comparison
    comparisonsContainer.appendChild(createComparisonSection('勞健保', '5人以上需保', establishment.勞健保));
    
    // Add 國定雙倍 comparison
    comparisonsContainer.appendChild(createComparisonSection('國定雙倍', '是', establishment.國定雙倍));
    
    standardsContent.appendChild(comparisonsContainer);
    
    // Add footer note
    const footerNote = document.createElement('div');
    footerNote.className = 'legal-standards-footer';
    footerNote.innerHTML = '<i class="fas fa-info-circle"></i> 依據勞基法規定的基本標準';
    standardsContent.appendChild(footerNote);
    
    contentWrapper.appendChild(standardsContent);
    popupContainer.appendChild(contentWrapper);
    
    return popupContainer;
}

// Helper functions to create popup content rows
function createInfoRow(label, value, date) {
    const row = document.createElement('div');
    row.className = 'info-row-job';
    
    if (date) {
        row.innerHTML = `
            <div class="label">${label}</div>
            <div class="value">${value}</div>
            <div class="date">${date}</div>
        `;
    } else {
        row.innerHTML = `
            <div class="label">${label}</div>
            <div class="value">${value}</div>
        `;
    }
    return row;
}

function createBooleanRow(label, value, date) {
    const row = document.createElement('div');
    row.className = 'info-row-job';
    
    let iconHtml, displayValue;
    
    // Special case for 國定雙倍
    if (label === '國定雙倍' && value) {
        iconHtml = '<span class="boolean-icon holiday"><i class="fas fa-calendar"></i></span>';
        displayValue = '休假';
    } else {
        iconHtml = value 
            ? '<span class="boolean-icon yes"><i class="fas fa-check"></i></span>'
            : '<span class="boolean-icon no"><i class="fas fa-times"></i></span>';
        displayValue = value ? '是' : '否';
    }
    
    if (date) {
        row.innerHTML = `
            <div class="label">${label}</div>
            <div class="value">${iconHtml} <span>${displayValue}</span></div>
            <div class="date">${date}</div>
        `;
    } else {
        row.innerHTML = `
            <div class="label">${label}</div>
            <div class="value">${iconHtml} <span>${displayValue}</span></div>
        `;
    }
    return row;
}

function createStarRatingRow(label, rating, raterCount, date) {
    const row = document.createElement('div');
    row.className = 'info-row-job';
    
    // Always show 5 stars
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHtml += '<i class="fas fa-star filled"></i>';
        } else {
            starsHtml += '<i class="far fa-star"></i>';
        }
    }
    
    // Add rater count to label if there are raters
    const labelWithCount = raterCount > 0 ? `${label} <span class="rater-count">${raterCount}人</span>` : label;
    
    if (date) {
        row.innerHTML = `
            <div class="label">${labelWithCount}</div>
            <div class="value">${starsHtml}</div>
            <div class="date">${date || 'N/A'}</div>
        `;
    } else {
        row.innerHTML = `
            <div class="label">${labelWithCount}</div>
            <div class="value">${starsHtml}</div>
        `;
    }
    return row;
}

function createComparisonSection(label, standard, actual) {
    const section = document.createElement('div');
    section.className = 'comparison-section';
    
    // Create label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'comparison-label';
    labelDiv.textContent = label;
    section.appendChild(labelDiv);
    
    // Create boxes container
    const boxesContainer = document.createElement('div');
    boxesContainer.className = 'comparison-boxes';
    
    // Standard box
    const standardBox = document.createElement('div');
    standardBox.className = 'comparison-box standard-box';
    standardBox.innerHTML = `<span>標準：</span> ${standard}`;
    boxesContainer.appendChild(standardBox);
    
    // Actual box
    const actualBox = document.createElement('div');
    actualBox.className = 'comparison-box actual-box';
    
    let actualDisplay = '';
    let meetsStandard = false;
    
    if (label === '時薪') {
        actualDisplay = actual || 'N/A';
        const standardNum = parseInt(standard.match(/\d+/)?.[0] || 0);
        const actualNum = parseInt(actual.match(/\d+/)?.[0] || 0);
        meetsStandard = actualNum >= standardNum;
    } else if (label === '勞健保') {
        actualDisplay = actual ? '是' : '否';
        meetsStandard = actual === true || actual === '是';
    } else if (label === '國定雙倍') {
        if (actual === true || actual === '是') {
            actualDisplay = '休假';
            meetsStandard = true;
        } else {
            actualDisplay = '否';
            meetsStandard = false;
        }
    }
    
    const iconHtml = meetsStandard 
        ? '<span class="status-icon yes"><i class="fas fa-check"></i></span>'
        : '<span class="status-icon no"><i class="fas fa-times"></i></span>';
    
    actualBox.innerHTML = `<span>店家：</span> ${iconHtml} ${actualDisplay}`;
    boxesContainer.appendChild(actualBox);
    
    section.appendChild(boxesContainer);
    return section;
}

// Function to handle popup tabs
function setupPopupTabs() {
    const tabs = document.querySelectorAll('.job-popup .popup-tab');
    if (!tabs.length) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Get the tab id
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs
            document.querySelectorAll('.job-popup .popup-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all content
            document.querySelectorAll('.job-popup .establishment-popup-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show the corresponding content
            document.getElementById(`${tabId}-content`).classList.add('active');
        });
    });
}

// Function for mobile popup handling
function setupMobilePopup() {
    window.mobilePopupActive = false;
    window.bottomSheetActive = false;
    
    // Setup bottom sheet for establishments on mobile
    window.showMobilePopup = function(marker) {
        if (!marker || !marker.establishment) return;
        
        const bottomSheetContainer = document.getElementById('bottom-sheet-container');
        const bottomSheetContent = document.getElementById('bottom-sheet-content');
        
        if (!bottomSheetContainer || !bottomSheetContent) return;
        
        // Create mobile popup content (similar to desktop popup but adapted for mobile)
        const mobileContent = document.createElement('div');
        mobileContent.className = 'bottom-sheet-establishment-content job-popup';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'bottom-sheet-header';
        header.innerHTML = `
            <div class="bottom-sheet-title-container">
                <h3 class="bottom-sheet-title">${marker.establishment.name || '未命名的店家'}</h3>
            </div>
            <div class="bottom-sheet-close" id="bottom-sheet-close">
                <i class="fas fa-times"></i>
            </div>
        `;
        mobileContent.appendChild(header);
        
        // Add auth badges under the title using info guide structure
        if (marker.establishment.store_auth || marker.establishment.question_auth) {
            const badgesContainer = document.createElement('div');
            badgesContainer.className = 'auth-icons-container';
            
            if (marker.establishment.store_auth) {
                const storeIcon = document.createElement('div');
                storeIcon.className = 'icon-wrapper store-auth';
                storeIcon.innerHTML = '<i class="fas fa-store"></i>';
                storeIcon.setAttribute('data-tooltip', '此資訊由店家提供');
                badgesContainer.appendChild(storeIcon);
            }
            
            if (marker.establishment.question_auth) {
                const questionIcon = document.createElement('div');
                questionIcon.className = 'icon-wrapper question-auth';
                questionIcon.innerHTML = '<i class="fas fa-clipboard-list"></i>';
                questionIcon.setAttribute('data-tooltip', '此資訊由問卷蒐集');
                badgesContainer.appendChild(questionIcon);
            }
            
            header.querySelector('.bottom-sheet-title-container').appendChild(badgesContainer);
        }
        
        // Create tabs (similar to desktop)
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'popup-tabs';
        tabsContainer.innerHTML = `
            <div class="popup-tab active" data-tab="mobile-establishment-info">店家資訊</div>
            <div class="popup-tab" data-tab="mobile-legal-standards">法定規範</div>
        `;
        mobileContent.appendChild(tabsContainer);
        
        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'popup-content-wrapper';
        
        // Establishment info content (first tab)
        const establishmentInfoContent = document.createElement('div');
        establishmentInfoContent.className = 'establishment-popup-content active';
        establishmentInfoContent.id = 'mobile-establishment-info-content';
        
        // Get update dates from establishment updates
        const updates = marker.establishment.updates || {};
        
        // Add all establishment info with dates
        establishmentInfoContent.appendChild(createInfoRow('時薪', marker.establishment.salary || 'N/A', updates.salary || 'N/A'));
        establishmentInfoContent.appendChild(createBooleanRow('供餐', marker.establishment.供餐, updates.供餐 || 'N/A'));
        establishmentInfoContent.appendChild(createBooleanRow('試用期', marker.establishment.試用期, updates.試用期 || 'N/A'));
        establishmentInfoContent.appendChild(createBooleanRow('勞健保', marker.establishment.勞健保, updates.勞健保 || 'N/A'));
        establishmentInfoContent.appendChild(createBooleanRow('國定雙倍', marker.establishment.國定雙倍, updates.國定雙倍 || 'N/A'));
        establishmentInfoContent.appendChild(createStarRatingRow('環境評分', marker.establishment.環境評分 || 0, marker.establishment.環境評分人數 || 0, updates.環境評分 || 'N/A'));
        establishmentInfoContent.appendChild(createStarRatingRow('滿意度評分', marker.establishment.滿意度評分 || 0, marker.establishment.滿意度評分人數 || 0, updates.滿意度評分 || 'N/A'));
        
        // Add owner message if available
        if (marker.establishment.老闆的話 && marker.establishment.老闆的話.trim() !== '') {
            const ownerSection = document.createElement('div');
            ownerSection.className = 'job-info-section';
            ownerSection.innerHTML = `
                <p class="owner-message">${marker.establishment.老闆的話}</p>
            `;
            establishmentInfoContent.appendChild(ownerSection);
        }
        
        contentWrapper.appendChild(establishmentInfoContent);
        
        // Legal standards content (second tab)
        const legalStandardsContent = document.createElement('div');
        legalStandardsContent.className = 'establishment-popup-content';
        legalStandardsContent.id = 'mobile-legal-standards-content';
        
        // Add standards year header
        const yearHeader = document.createElement('div');
        yearHeader.className = 'legal-standards-header';
        yearHeader.innerHTML = `<i class="fas fa-balance-scale"></i> ${window.legalStandard.year || '2025'} 年法定規範`;
        legalStandardsContent.appendChild(yearHeader);
        
        // Add explanation text
        const explanationText = document.createElement('div');
        explanationText.className = 'legal-standards-subtitle';
        explanationText.innerHTML = `
            <p>依據勞動基準法規定，以下是雇主應遵守的基本標準：</p>
            <p class="subtitle-note">法律未規範供餐和試用期</p>
        `;
        legalStandardsContent.appendChild(explanationText);
        
        // Add comparison sections
        const comparisonsContainer = document.createElement('div');
        comparisonsContainer.className = 'legal-comparisons-container';
        
        // Add salary comparison
        comparisonsContainer.appendChild(createComparisonSection('時薪', window.legalStandard.salary, marker.establishment.salary));
        
        // Add 勞健保 comparison
        comparisonsContainer.appendChild(createComparisonSection('勞健保', '5人以上需保', marker.establishment.勞健保));
        
        // Add 國定雙倍 comparison
        comparisonsContainer.appendChild(createComparisonSection('國定雙倍', '是', marker.establishment.國定雙倍));
        
        legalStandardsContent.appendChild(comparisonsContainer);
        
        // Add footer note
        const footerNote = document.createElement('div');
        footerNote.className = 'legal-standards-footer';
        footerNote.innerHTML = '<i class="fas fa-info-circle"></i> 依據勞基法規定的基本標準';
        legalStandardsContent.appendChild(footerNote);
        
        contentWrapper.appendChild(legalStandardsContent);
        mobileContent.appendChild(contentWrapper);
        
        // Clear previous content and add new content
        bottomSheetContent.innerHTML = '';
        bottomSheetContent.appendChild(mobileContent);
        
        // Setup mobile tabs
        setupMobilePopupTabs();
        
        // Show bottom sheet
        bottomSheetContainer.classList.add('active');
        window.bottomSheetActive = true;
        
        // Add close handler
        const closeBtn = document.getElementById('bottom-sheet-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeBottomSheet);
        }
    };
    
    window.closeBottomSheet = function() {
        const bottomSheetContainer = document.getElementById('bottom-sheet-container');
        if (bottomSheetContainer) {
            bottomSheetContainer.classList.remove('active');
            window.bottomSheetActive = false;
            
            // Clear content after animation
            setTimeout(() => {
                const bottomSheetContent = document.getElementById('bottom-sheet-content');
                if (bottomSheetContent) {
                    bottomSheetContent.innerHTML = '';
                }
                
                // Force a map refresh on mobile devices (both Android and iOS)
                if (isTouchDevice() && map) {
                    console.log('Mobile bottom sheet closed - triggering map refresh');
                    
                    // Force a redraw of the map
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
                    
                    // Make sure all touch handlers are re-enabled
                    map.dragging.enable();
                    map.touchZoom.enable();
                    map.doubleClickZoom.enable();
                    if (map.tap) map.tap.enable();
                    
                    // Complete any ghost touches
                    forceCompleteGhostTouches();
                }
            }, 300);
        }
    };
    
    // For legacy code compatibility, but with direct map refresh handling
    window.closeMobilePopup = function() {
        // First close the bottom sheet
        closeBottomSheet();
        
        // Additional direct map refresh for possible direct closeMobilePopup calls
        // This ensures compatibility with potential calls from jobmap or other code
        setTimeout(() => {
            if (isTouchDevice() && map) {
                console.log('Mobile popup close detected via legacy method - triggering additional map refresh');
                map.invalidateSize({reset: true, animate: false, pan: false});
            }
        }, 350); // Slightly longer timeout to ensure bottom sheet animation completes first
    };
}

// Function to handle mobile popup tabs
function setupMobilePopupTabs() {
    const tabs = document.querySelectorAll('.bottom-sheet-establishment-content .popup-tab');
    if (!tabs.length) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Get the tab id
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs
            document.querySelectorAll('.bottom-sheet-establishment-content .popup-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all content
            document.querySelectorAll('.bottom-sheet-establishment-content .establishment-popup-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show the corresponding content
            document.getElementById(`${tabId}-content`).classList.add('active');
        });
    });
}

// Setup global info guide popup for all pages
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    
    // Initialize context flags for map reset control
    window._bottomSheetWasRecentlyActive = false;
    window._mobilePopupWasRecentlyActive = false;
    window._infoGuideWasRecentlyActive = false;
    
    // Initialize the map if on map page
    if (document.getElementById('map')) {
        initializeMap();
        
        // Setup info guide
        setupInfoGuide();
        
        // Load establishment data
        loadEstablishmentsData();
        
        // Setup mobile popup
        setupMobilePopup();
        
        // Initialize search button
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            console.log("Search button found, adding click handler");
            searchBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Search button clicked");
                openSearchModal();
            });
        } else {
            console.warn("Search button not found");
        }
    }
    
    // Search functionality
    window.openSearchModal = function() {
        console.log('Opening job search modal');
        
        // If modal already exists, reset the form and show it
        const existingModal = document.getElementById('search-modal-overlay');
        if (existingModal) {
            // If there's an existing filter, clear it first
            if (window.originalMarkers) {
                clearFilters();
            }
            
            // Reset the form fields
            resetSearch();
            
            // Show the modal
            existingModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            return;
        }
        
        // Create search modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'search-modal-overlay';
        overlay.id = 'search-modal-overlay';
        
        // Create search modal container
        const container = document.createElement('div');
        container.className = 'search-modal-container job-search-modal';
        
        // Create modal header
        const header = document.createElement('div');
        header.className = 'search-modal-header';
        
        const title = document.createElement('h3');
        title.textContent = '搜尋店家';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'search-modal-close';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.addEventListener('click', closeSearchModal);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        
        // Create modal content
        const content = document.createElement('div');
        content.className = 'search-modal-content';
        
        // Name search section
        const nameSection = document.createElement('div');
        nameSection.className = 'search-section';
        
        const nameLabel = document.createElement('div');
        nameLabel.className = 'search-label';
        nameLabel.textContent = '店家名稱';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '輸入店家名稱搜尋...';
        nameInput.className = 'search-input';
        nameInput.id = 'establishment-name-search';
        
        nameSection.appendChild(nameLabel);
        nameSection.appendChild(nameInput);
        
        // 時薪 range slider section
        const salarySection = document.createElement('div');
        salarySection.className = 'search-section';
        
        const salaryLabel = document.createElement('div');
        salaryLabel.className = 'search-label';
        salaryLabel.textContent = '時薪範圍';
        
        const salaryRangeContainer = document.createElement('div');
        salaryRangeContainer.className = 'range-container';
        
        const salaryRange = document.createElement('div');
        salaryRange.className = 'range-slider';
        
        const minSalary = document.createElement('input');
        minSalary.type = 'range';
        minSalary.min = '160';
        minSalary.max = '250';
        minSalary.value = '160';
        minSalary.id = 'min-salary';
        
        const maxSalary = document.createElement('input');
        maxSalary.type = 'range';
        maxSalary.min = '160';
        maxSalary.max = '250';
        maxSalary.value = '250';
        maxSalary.id = 'max-salary';
        
        const salaryDisplay = document.createElement('div');
        salaryDisplay.className = 'range-display';
        salaryDisplay.innerHTML = '<span id="min-salary-display">160</span> - <span id="max-salary-display">250</span> 元';
        
        // Update range display when sliders move
        minSalary.addEventListener('input', updateSalaryRange);
        maxSalary.addEventListener('input', updateSalaryRange);
        
        salaryRange.appendChild(minSalary);
        salaryRange.appendChild(maxSalary);
        salaryRangeContainer.appendChild(salaryRange);
        salaryRangeContainer.appendChild(salaryDisplay);
        
        salarySection.appendChild(salaryLabel);
        salarySection.appendChild(salaryRangeContainer);
        
        // Boolean filters section (供餐, 試用期, 勞健保, 國定雙倍)
        const booleanSection = document.createElement('div');
        booleanSection.className = 'search-section';
        
        const booleanLabel = document.createElement('div');
        booleanLabel.className = 'search-label';
        booleanLabel.textContent = '選擇條件';
        
        const booleanOptions = document.createElement('div');
        booleanOptions.className = 'boolean-options';
        
        const options = [
            { id: 'meal-provided', label: '供餐' },
            { id: 'probation', label: '試用期' },
            { id: 'labor-insurance', label: '勞健保' },
            { id: 'holiday-pay', label: '國定雙倍' }
        ];
        
        options.forEach(option => {
            const optionContainer = document.createElement('div');
            optionContainer.className = 'option-container';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = option.id;
            
            const optionLabel = document.createElement('label');
            optionLabel.htmlFor = option.id;
            optionLabel.textContent = option.label;
            
            optionContainer.appendChild(checkbox);
            optionContainer.appendChild(optionLabel);
            booleanOptions.appendChild(optionContainer);
        });
        
        booleanSection.appendChild(booleanLabel);
        booleanSection.appendChild(booleanOptions);
        
        // Apply button
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'search-button-container';
        
        const applyButton = document.createElement('button');
        applyButton.className = 'search-apply-button';
        applyButton.textContent = '套用';
        applyButton.addEventListener('click', applySearch);
        
        const resetButton = document.createElement('button');
        resetButton.className = 'search-reset-button';
        resetButton.textContent = '重置';
        resetButton.addEventListener('click', resetSearch);
        
        buttonContainer.appendChild(resetButton);
        buttonContainer.appendChild(applyButton);
        
        // Assemble the modal
        content.appendChild(nameSection);
        content.appendChild(salarySection);
        content.appendChild(booleanSection);
        content.appendChild(buttonContainer);
        
        container.appendChild(header);
        container.appendChild(content);
        
        overlay.appendChild(container);
        document.body.appendChild(overlay);
        
        // Show modal with animation
        setTimeout(() => {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }, 10);
    };
    
    // Close the search modal
    function closeSearchModal() {
        const overlay = document.getElementById('search-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    // Update salary range values when sliders move
    function updateSalaryRange() {
        const minSalary = document.getElementById('min-salary');
        const maxSalary = document.getElementById('max-salary');
        const minDisplay = document.getElementById('min-salary-display');
        const maxDisplay = document.getElementById('max-salary-display');
        
        // Ensure min doesn't exceed max
        if (parseInt(minSalary.value) > parseInt(maxSalary.value)) {
            minSalary.value = maxSalary.value;
        }
        
        minDisplay.textContent = minSalary.value;
        maxDisplay.textContent = maxSalary.value;
    }
    
    // Reset search form to default values
    function resetSearch() {
        // Reset name search
        const nameInput = document.getElementById('establishment-name-search');
        if (nameInput) nameInput.value = '';
        
        // Reset salary range
        const minSalary = document.getElementById('min-salary');
        const maxSalary = document.getElementById('max-salary');
        if (minSalary) minSalary.value = '160';
        if (maxSalary) maxSalary.value = '250';
        updateSalaryRange();
        
        // Reset checkboxes
        const checkboxes = document.querySelectorAll('.boolean-options input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }
    
    // Apply search filters
    function applySearch() {
        try {
            console.log("Apply search button clicked");
            
            // Get input values directly
            const nameInput = document.getElementById('establishment-name-search');
            const minSalaryInput = document.getElementById('min-salary');
            const maxSalaryInput = document.getElementById('max-salary');
            
            // Get checkbox values
            const mealProvided = document.getElementById('meal-provided')?.checked || false;
            const probation = document.getElementById('probation')?.checked || false;
            const laborInsurance = document.getElementById('labor-insurance')?.checked || false;
            const holidayPay = document.getElementById('holiday-pay')?.checked || false;
            
            // Log what values we found
            console.log("Form elements found:", {
                nameInput: nameInput ? true : false,
                minSalaryInput: minSalaryInput ? true : false,
                maxSalaryInput: maxSalaryInput ? true : false
            });
            
            // Get all search parameters
            const searchParams = {
                name: nameInput ? nameInput.value : '',
                salary: {
                    min: minSalaryInput ? parseInt(minSalaryInput.value) : 160,
                    max: maxSalaryInput ? parseInt(maxSalaryInput.value) : 250
                },
                filters: {
                    供餐: mealProvided,
                    試用期: probation,
                    勞健保: laborInsurance,
                    國定雙倍: holidayPay
                }
            };
            
            console.log('Applying job search with params:', searchParams);
            
            // Check if we have markers to filter
            const markerCount = window.markerClusterGroup ? window.markerClusterGroup.getLayers().length : 0;
            console.log(`Current marker count: ${markerCount}`);
            
            // Only filter if we have data
            if (markerCount > 0) {
                filterEstablishments(searchParams);
            } else if (window.establishments && window.establishments.length > 0) {
                // If we have establishments data but no markers, try reloading the markers first
                console.log("Markers missing but establishments data available - recreating markers");
                loadEstablishmentsData();
                setTimeout(() => {
                    filterEstablishments(searchParams);
                }, 500); // Wait for markers to be created
            } else {
                console.error("No establishment data available for filtering");
                alert("No establishment data available. Please refresh the page and try again.");
            }
        } catch (error) {
            console.error("Error in applySearch:", error);
        }
        
        // Close the modal
        closeSearchModal();
        
        // Show the "clear filters" button if we have any active filters
        showClearFiltersButton();
    }
    
    // Filter establishments based on search parameters
    function filterEstablishments(params) {
        console.log('Filtering establishments with params:', params);
        
        // Check if any filters are actually applied
        const hasNameFilter = params.name && params.name.trim() !== '';
        const hasSalaryFilter = params.salary.min > 160 || params.salary.max < 250;
        const hasBooleanFilter = Object.values(params.filters).some(v => v === true);
        
        // If no filters are applied, don't filter anything
        if (!hasNameFilter && !hasSalaryFilter && !hasBooleanFilter) {
            console.log('No filters applied - showing all establishments');
            if (window.originalMarkers) {
                clearFilters();
            }
            return;
        }
        
        // Store original markers if this is the first filter operation
        if (!window.originalMarkers && window.markerClusterGroup) {
            console.log('Saving original markers:', window.markerClusterGroup.getLayers().length);
            window.originalMarkers = window.markerClusterGroup.getLayers();
        }
        
        // Create array to hold filtered markers
        const filteredMarkers = [];
        
        // Loop through all establishments
        if (window.originalMarkers) {
            console.log('Total establishments to filter:', window.originalMarkers.length);
            
            window.originalMarkers.forEach(marker => {
                // Get establishment data from marker
                const establishment = marker.establishment;
                if (!establishment) {
                    console.log('Marker without establishment data:', marker);
                    return;
                }
                
                // Detailed logging for the first few markers to debug
                const debug = filteredMarkers.length < 3;
                if (debug) {
                    console.log('Evaluating establishment:', establishment.name, 'Full data:', establishment);
                }
                
                // Name filter - only apply if name is provided
                if (hasNameFilter && !establishment.name.toLowerCase().includes(params.name.toLowerCase())) {
                    if (debug) console.log('Failed name filter');
                    return;
                }
                
                // Salary filter - only apply if the slider has been adjusted
                if (hasSalaryFilter) {
                    const salaryValue = establishment.hourlyWage || 0;
                    
                    if (debug) {
                        console.log(`Establishment "${establishment.name}" has hourly wage: ${salaryValue}`);
                    }
                    
                    if (!salaryValue || salaryValue < params.salary.min || salaryValue > params.salary.max) {
                        if (debug) console.log('Failed salary filter, salary value:', salaryValue, 'is outside range', params.salary.min, '-', params.salary.max);
                        return;
                    }
                }
                
                // Boolean filters - only check if filter is enabled
                if (params.filters.供餐 && !establishment.供餐) {
                    if (debug) console.log('Failed 供餐 filter');
                    return;
                }
                
                if (params.filters.試用期 && !establishment.試用期) {
                    if (debug) console.log('Failed 試用期 filter');
                    return;
                }
                
                if (params.filters.勞健保 && !establishment.勞健保) {
                    if (debug) console.log('Failed 勞健保 filter');
                    return;
                }
                
                if (params.filters.國定雙倍 && !establishment.國定雙倍) {
                    if (debug) console.log('Failed 國定雙倍 filter');
                    return;
                }
                
                // If we got this far, the establishment passed all filters
                if (debug) console.log('Passed all filters');
                filteredMarkers.push(marker);
            });
        }
        
        console.log('Filtered markers count:', filteredMarkers.length);
        
        // Update the map with filtered markers
        updateMapMarkers(filteredMarkers);
    }
    
    // Update map markers with filtered results
    function updateMapMarkers(filteredMarkers) {
        // Clear existing markers
        if (window.markerClusterGroup) {
            window.markerClusterGroup.clearLayers();
            
            // Add filtered markers
            window.markerClusterGroup.addLayers(filteredMarkers);
            
            // Fit map to filtered markers bounds if there are any
            if (filteredMarkers.length > 0) {
                const group = L.featureGroup(filteredMarkers);
                map.fitBounds(group.getBounds().pad(0.2));
            }
            
            // Update filter count
            if (window.clearFiltersButton) {
                const countBadge = window.clearFiltersButton.querySelector('.filter-count');
                if (countBadge) {
                    countBadge.textContent = filteredMarkers.length;
                }
            }
        }
    }
    
    // Show clear filters button
    function showClearFiltersButton() {
        // Remove existing button if present
        if (window.clearFiltersButton) {
            document.body.removeChild(window.clearFiltersButton);
        }
        
        // Create the clear filters button
        const button = document.createElement('div');
        button.className = 'clear-filters-button';
        
        const countBadge = document.createElement('span');
        countBadge.className = 'filter-count';
        countBadge.textContent = window.markerClusterGroup ? window.markerClusterGroup.getLayers().length : '0';
        
        const buttonText = document.createElement('span');
        buttonText.textContent = '清除篩選';
        
        button.appendChild(countBadge);
        button.appendChild(buttonText);
        
        // Add click handler
        button.addEventListener('click', clearFilters);
        button.addEventListener('touchend', clearFilters);
        
        // Add to document
        document.body.appendChild(button);
        
        // Store reference
        window.clearFiltersButton = button;
    }
    
    // Clear all filters and restore original markers
    function clearFilters() {
        console.log('Clearing all filters');
        
        // Restore original markers
        if (window.originalMarkers && window.markerClusterGroup) {
            console.log('Restoring original markers:', window.originalMarkers.length);
            
            try {
                // Clear existing markers first
                window.markerClusterGroup.clearLayers();
                
                // Re-add the original markers
                window.markerClusterGroup.addLayers(window.originalMarkers);
                
                console.log('Successfully restored markers');
            } catch (e) {
                console.error('Error restoring markers:', e);
                
                // Fallback - try to re-initialize markers from scratch
                if (typeof loadEstablishmentsData === 'function') {
                    console.log('Attempting to reload establishments data');
                    loadEstablishmentsData();
                }
            }
        } else {
            console.log('No original markers to restore');
            
            // If we don't have original markers, try to reload from scratch
            if (typeof loadEstablishmentsData === 'function') {
                console.log('Attempting to reload establishments data');
                loadEstablishmentsData();
            }
        }
        
        // Remove the clear filters button
        if (window.clearFiltersButton) {
            document.body.removeChild(window.clearFiltersButton);
            window.clearFiltersButton = null;
        }
        
        // Reset the stored filter state
        window.originalMarkers = null;
        
        // Reset view to default location
        if (map) {
            map.setView(DEFAULT_VIEW, DEFAULT_ZOOM, {
                animate: true,
                duration: 0.5
            });
        }
        
        console.log('Filters cleared');
    }
});