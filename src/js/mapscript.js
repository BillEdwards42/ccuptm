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
    
    // Detect iOS device specifically
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    console.log('Is iOS device:', isIOS);
    
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
                
                // Add click handler for marker to show popup
                marker.on('click', function() {
                    // For touch devices, show the full-screen modal instead of popup
                    if (isTouchDevice()) {
                        // Show mobile popup (bottom sheet)
                        showMobilePopup(this);
                    } else {
                        // Create popup content for desktop
                        const popupContent = createRentalPopup(this.rentalData);
                        
                        // Add popup to marker
                        this.unbindPopup();
                        this.bindPopup(popupContent, {
                            className: 'rent-popup',
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
                });
                
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
            });
            
            // Add markers to cluster group
            window.markerClusterGroup.addLayers(markers);
            
            // Store original markers for later reference
            window.originalMarkers = markers;
            
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
            console.error('Error loading rentals data:', error);
        });
}

// Function to create rental popup content
function createRentalPopup(rentalData) {
    // Create main popup container
    const popupContainer = document.createElement('div');
    popupContainer.className = 'establishment-popup rent-popup-wrapper';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'establishment-popup-header';
    header.innerHTML = `<h3>${rentalData.name || '未命名的住所'}</h3>`;
    popupContainer.appendChild(header);
    
    // Create tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'popup-tabs';
    tabsContainer.innerHTML = `
        <div class="popup-tab active" data-tab="house-info">房屋資訊</div>
        <div class="popup-tab" data-tab="safety-info">設備資訊</div>
    `;
    popupContainer.appendChild(tabsContainer);
    
    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'popup-content-wrapper';
    
    // Create house info content (first tab)
    const houseInfoContent = document.createElement('div');
    houseInfoContent.className = 'establishment-popup-content active';
    houseInfoContent.id = 'house-info-content';
    
    // Main info section
    const mainInfoSection = document.createElement('div');
    mainInfoSection.className = 'rent-info-section';
    mainInfoSection.innerHTML = `<h4>基礎資訊</h4>`;
    
    const mainInfoGrid = document.createElement('div');
    mainInfoGrid.className = 'main-info-grid';
    
    // Add main information items
    const mainInfoItems = [
        { label: '地址', value: rentalData.address || '未提供', icon: 'map-marker-alt' },
        { label: '房東電話', value: rentalData.contact || '未提供', icon: 'phone' },
        { label: '月租金', value: rentalData.rent || '未提供', icon: 'dollar-sign' },
        { label: '押金', value: rentalData.deposit || '未提供', icon: 'money-bill-wave' },
        { label: '房屋類型', value: rentalData.type || '未提供', icon: 'home' },
        { label: '電費計價', value: rentalData.elec || '未提供', icon: 'bolt' }
    ];
    
    mainInfoItems.forEach(item => {
        const infoItem = document.createElement('div');
        infoItem.className = 'main-info-item';
        infoItem.innerHTML = `
            <div class="label"><i class="fas fa-${item.icon}"></i> ${item.label}</div>
            <div class="value">${item.value}</div>
        `;
        mainInfoGrid.appendChild(infoItem);
    });
    
    mainInfoSection.appendChild(mainInfoGrid);
    houseInfoContent.appendChild(mainInfoSection);
    
    // Secondary info section
    const secondaryInfoSection = document.createElement('div');
    secondaryInfoSection.className = 'rent-info-section';
    secondaryInfoSection.innerHTML = `<h4>安全設備</h4>`;
    
    const safetyFeaturesContainer = document.createElement('div');
    safetyFeaturesContainer.className = 'safety-features';
    
    // Create safety features
    const safetyFeatures = [
        { name: '滅火器', key: 'fire', icon: 'fire-extinguisher' },
        { name: '緊急照明燈', key: 'light', icon: 'lightbulb' },
        { name: '方向指示燈', key: 'exit', icon: 'sign-out-alt' },
        { name: '火災警報器', key: 'alarm', icon: 'bell' }
    ];
    
    safetyFeatures.forEach(feature => {
        const value = rentalData[feature.key];
        let className = 'safety-feature';
        let displayText = '';
        
        if (value === '有' || value === true) {
            className += ' available';
            displayText = `${feature.name}: 有`;
        } else if (value === '無' || value === false) {
            className += ' unavailable';
            displayText = `${feature.name}: 無`;
        } else {
            className += ' no-data';
            displayText = `${feature.name}: ${value || ''}`;
        }
        
        const featureEl = document.createElement('div');
        featureEl.className = className;
        featureEl.innerHTML = `
            <i class="fas fa-${feature.icon}"></i>
            <span>${displayText}</span>
        `;
        safetyFeaturesContainer.appendChild(featureEl);
    });
    
    secondaryInfoSection.appendChild(safetyFeaturesContainer);
    houseInfoContent.appendChild(secondaryInfoSection);
    
    // Third info section - restrictions
    const restrictionsSection = document.createElement('div');
    restrictionsSection.className = 'rent-info-section';
    restrictionsSection.innerHTML = `<h4>特殊要求</h4>`;
    
    // Create restrictions grid
    const restrictionsGrid = document.createElement('div');
    restrictionsGrid.className = 'main-info-grid';
    
    // Add restrictions items
    const restrictionsItems = [
        { label: '性別限制', value: rentalData.sex || '未提供', icon: 'venus-mars' },
        { label: '寵物友善', value: rentalData.pet || '未提供', icon: 'paw' }
    ];
    
    restrictionsItems.forEach(item => {
        const restrictionItem = document.createElement('div');
        restrictionItem.className = 'main-info-item';
        restrictionItem.innerHTML = `
            <div class="label"><i class="fas fa-${item.icon}"></i> ${item.label}</div>
            <div class="value">${item.value}</div>
        `;
        restrictionsGrid.appendChild(restrictionItem);
    });
    
    restrictionsSection.appendChild(restrictionsGrid);
    houseInfoContent.appendChild(restrictionsSection);
    
    contentWrapper.appendChild(houseInfoContent);
    
    // Create equipment/safety info content (second tab)
    const safetyInfoContent = document.createElement('div');
    safetyInfoContent.className = 'establishment-popup-content';
    safetyInfoContent.id = 'safety-info-content';
    
    // Government requirements section
    const governmentRequirementsSection = document.createElement('div');
    governmentRequirementsSection.className = 'rent-info-section';
    governmentRequirementsSection.innerHTML = `
        <h4>政府安全設備要求</h4>
        <p class="requirements-note">根據消防法規定，合法出租住宅應具備以下安全設備：</p>
    `;
    
    // Create government requirements list
    const requirementsList = document.createElement('div');
    requirementsList.className = 'safety-features';
    
    // Define required safety features by government
    const requiredSafetyFeatures = [
        { name: '滅火器', description: '用於撲滅小型火災', icon: 'fire-extinguisher' },
        { name: '緊急照明燈', description: '停電時提供照明', icon: 'lightbulb' },
        { name: '方向指示燈', description: '指引逃生方向', icon: 'sign-out-alt' },
        { name: '火災警報器', description: '偵測火災並警報', icon: 'bell' }
    ];
    
    requiredSafetyFeatures.forEach(feature => {
        const isAvailable = rentalData[feature.key] === '有';
        const featureEl = document.createElement('div');
        featureEl.className = 'safety-feature';
        featureEl.innerHTML = `
            <i class="fas fa-${feature.icon}"></i>
            <div>
                <div><strong>${feature.name}</strong></div>
                <div class="feature-description">${feature.description}</div>
            </div>
        `;
        requirementsList.appendChild(featureEl);
    });
    
    governmentRequirementsSection.appendChild(requirementsList);
    safetyInfoContent.appendChild(governmentRequirementsSection);
    
    // Removed "此房屋安全設備" section
    
    // Equipment/Stuff section (if available)
    if (rentalData.stuff) {
        const stuffSection = document.createElement('div');
        stuffSection.className = 'rent-info-section';
        stuffSection.innerHTML = `
            <h4>設備清單</h4>
            <p class="notes-content">${rentalData.stuff}</p>
        `;
        safetyInfoContent.appendChild(stuffSection);
    }
    
    // Notes section (if available)
    if (rentalData.note) {
        const notesSection = document.createElement('div');
        notesSection.className = 'rent-info-section no-border';
        notesSection.innerHTML = `
            <h4>備註</h4>
            <p class="notes-content">${rentalData.note}</p>
        `;
        safetyInfoContent.appendChild(notesSection);
    }
    
    contentWrapper.appendChild(safetyInfoContent);
    popupContainer.appendChild(contentWrapper);
    
    return popupContainer;
}

// Function to handle popup tabs
function setupPopupTabs() {
    const tabs = document.querySelectorAll('.rent-popup .popup-tab');
    if (!tabs.length) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Get the tab id
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs
            document.querySelectorAll('.rent-popup .popup-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all content
            document.querySelectorAll('.rent-popup .establishment-popup-content').forEach(content => {
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
    
    // Setup bottom sheet for rentals on mobile
    window.showMobilePopup = function(marker) {
        if (!marker || !marker.rentalData) return;
        
        const bottomSheetContainer = document.getElementById('bottom-sheet-container');
        const bottomSheetContent = document.getElementById('bottom-sheet-content');
        
        if (!bottomSheetContainer || !bottomSheetContent) return;
        
        // Create mobile popup content (similar to desktop popup but adapted for mobile)
        const mobileContent = document.createElement('div');
        mobileContent.className = 'bottom-sheet-establishment-content rent-popup';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'bottom-sheet-header';
        header.innerHTML = `
            <div class="bottom-sheet-title-container">
                <h3 class="bottom-sheet-title">${marker.rentalData.name || '未命名的住所'}</h3>
            </div>
            <div class="bottom-sheet-close" id="bottom-sheet-close">
                <i class="fas fa-times"></i>
            </div>
        `;
        mobileContent.appendChild(header);
        
        // Create tabs (similar to desktop)
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'popup-tabs';
        tabsContainer.innerHTML = `
            <div class="popup-tab active" data-tab="mobile-house-info">房屋資訊</div>
            <div class="popup-tab" data-tab="mobile-safety-info">設備資訊</div>
        `;
        mobileContent.appendChild(tabsContainer);
        
        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'popup-content-wrapper';
        
        // House info content (first tab)
        const houseInfoContent = document.createElement('div');
        houseInfoContent.className = 'establishment-popup-content active';
        houseInfoContent.id = 'mobile-house-info-content';
        
        // Main info section
        const mainInfoSection = document.createElement('div');
        mainInfoSection.className = 'rent-info-section';
        mainInfoSection.innerHTML = `<h4>基礎資訊</h4>`;
        
        // Add main information items
        const mainInfoItems = [
            { label: '地址', value: marker.rentalData.address || '未提供', icon: 'map-marker-alt' },
            { label: '房東電話', value: marker.rentalData.contact || '未提供', icon: 'phone' },
            { label: '月租金', value: marker.rentalData.rent || '未提供', icon: 'dollar-sign' },
            { label: '押金', value: marker.rentalData.deposit || '未提供', icon: 'money-bill-wave' },
            { label: '房屋類型', value: marker.rentalData.type || '未提供', icon: 'home' },
            { label: '電費計價', value: marker.rentalData.elec || '未提供', icon: 'bolt' }
        ];
        
        // Create mobile-friendly list instead of grid for main info
        mainInfoItems.forEach(item => {
            const infoRow = document.createElement('div');
            infoRow.className = 'info-row';
            infoRow.innerHTML = `
                <div class="label"><i class="fas fa-${item.icon}"></i> ${item.label}</div>
                <div class="value">${item.value}</div>
            `;
            mainInfoSection.appendChild(infoRow);
        });
        
        houseInfoContent.appendChild(mainInfoSection);
        
        // Secondary info section - safety features
        const secondaryInfoSection = document.createElement('div');
        secondaryInfoSection.className = 'rent-info-section';
        secondaryInfoSection.innerHTML = `<h4>安全設備</h4>`;
        
        const safetyFeaturesContainer = document.createElement('div');
        safetyFeaturesContainer.className = 'safety-features';
        
        // Create safety features
        const safetyFeatures = [
            { name: '滅火器', key: 'fire', icon: 'fire-extinguisher' },
            { name: '緊急照明燈', key: 'light', icon: 'lightbulb' },
            { name: '方向指示燈', key: 'exit', icon: 'sign-out-alt' },
            { name: '火災警報器', key: 'alarm', icon: 'bell' }
        ];
        
        safetyFeatures.forEach(feature => {
            const value = marker.rentalData[feature.key];
            let className = 'safety-feature';
            let displayText = '';
            
            if (value === '有' || value === true) {
                className += ' available';
                displayText = `${feature.name}: 有`;
            } else if (value === '無' || value === false) {
                className += ' unavailable';
                displayText = `${feature.name}: 無`;
            } else {
                className += ' no-data';
                displayText = `${feature.name}: ${value || ''}`;
            }
            
            const featureEl = document.createElement('div');
            featureEl.className = className;
            featureEl.innerHTML = `
                <i class="fas fa-${feature.icon}"></i>
                <span>${displayText}</span>
            `;
            safetyFeaturesContainer.appendChild(featureEl);
        });
        
        secondaryInfoSection.appendChild(safetyFeaturesContainer);
        houseInfoContent.appendChild(secondaryInfoSection);
        
        // Restrictions info
        const restrictionsSection = document.createElement('div');
        restrictionsSection.className = 'rent-info-section';
        restrictionsSection.innerHTML = `<h4>特殊要求</h4>`;
        
        // Add restrictions items as rows for better mobile display
        const restrictionsItems = [
            { label: '性別限制', value: marker.rentalData.sex || '未提供', icon: 'venus-mars' },
            { label: '寵物友善', value: marker.rentalData.pet || '未提供', icon: 'paw' }
        ];
        
        restrictionsItems.forEach(item => {
            const infoRow = document.createElement('div');
            infoRow.className = 'info-row';
            infoRow.innerHTML = `
                <div class="label"><i class="fas fa-${item.icon}"></i> ${item.label}</div>
                <div class="value">${item.value}</div>
            `;
            restrictionsSection.appendChild(infoRow);
        });
        
        houseInfoContent.appendChild(restrictionsSection);
        contentWrapper.appendChild(houseInfoContent);
        
        // Safety info content (second tab)
        const safetyInfoContent = document.createElement('div');
        safetyInfoContent.className = 'establishment-popup-content';
        safetyInfoContent.id = 'mobile-safety-info-content';
        
        // Government requirements section
        const governmentRequirementsSection = document.createElement('div');
        governmentRequirementsSection.className = 'rent-info-section';
        governmentRequirementsSection.innerHTML = `
            <h4>政府安全設備要求</h4>
            <p class="requirements-note">根據消防法規定，合法出租住宅應具備以下安全設備：</p>
        `;
        
        // Create government requirements list
        const requirementsList = document.createElement('div');
        requirementsList.className = 'safety-features safety-features-mobile';
        
        // Define required safety features
        const requiredSafetyFeatures = [
            { name: '滅火器', description: '用於撲滅小型火災', icon: 'fire-extinguisher' },
            { name: '緊急照明燈', description: '停電時提供照明', icon: 'lightbulb' },
            { name: '方向指示燈', description: '指引逃生方向', icon: 'sign-out-alt' },
            { name: '火災警報器', description: '偵測火災並警報', icon: 'bell' }
        ];
        
        requiredSafetyFeatures.forEach(feature => {
            const featureEl = document.createElement('div');
            featureEl.className = 'safety-feature';
            featureEl.innerHTML = `
                <i class="fas fa-${feature.icon}"></i>
                <div>
                    <div><strong>${feature.name}</strong></div>
                    <div class="feature-description">${feature.description}</div>
                </div>
            `;
            requirementsList.appendChild(featureEl);
        });
        
        governmentRequirementsSection.appendChild(requirementsList);
        safetyInfoContent.appendChild(governmentRequirementsSection);
        
        // Removed "此房屋安全設備" section
        
        // Equipment/Stuff section (if available)
        if (marker.rentalData.stuff) {
            const stuffSection = document.createElement('div');
            stuffSection.className = 'rent-info-section';
            stuffSection.innerHTML = `
                <h4>設備清單</h4>
                <p class="notes-content">${marker.rentalData.stuff}</p>
            `;
            safetyInfoContent.appendChild(stuffSection);
        }
        
        // Notes section (if available)
        if (marker.rentalData.note) {
            const notesSection = document.createElement('div');
            notesSection.className = 'rent-info-section no-border';
            notesSection.innerHTML = `
                <h4>備註</h4>
                <p class="notes-content">${marker.rentalData.note}</p>
            `;
            safetyInfoContent.appendChild(notesSection);
        }
        
        contentWrapper.appendChild(safetyInfoContent);
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