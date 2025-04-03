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

// Radical function to completely reset touch handling by reinitializing the map
// With optimization to prevent excessive resets
function resetTouchSystem(callback) {
    // Prevent multiple resets within a short time window
    const currentTime = Date.now();
    if (window._lastResetTime && (currentTime - window._lastResetTime < 2000)) {
        console.log('Skipping reset - too soon after previous reset');
        
        // Still execute callback if provided
        if (typeof callback === 'function') {
            setTimeout(callback, 100);
        }
        return;
    }
    
    // Check if this reset is being triggered from a valid source
    // This helps prevent unwanted resets that happen outside of user interaction with popups/pages
    const isValidResetContext = (
        // Check if any of these UI elements were recently active
        window._bottomSheetWasRecentlyActive || 
        window._mobilePopupWasRecentlyActive || 
        window._infoGuideWasRecentlyActive ||
        // Also allow reset if it's been a while since the last one (emergency case)
        !window._lastResetTime || 
        (currentTime - window._lastResetTime > 10000)
    );
    
    if (!isValidResetContext) {
        console.log('Skipping reset - not triggered from valid context');
        // Still execute callback if provided
        if (typeof callback === 'function') {
            setTimeout(callback, 100);
        }
        return;
    }
    
    // Reset these flags since we're now handling the reset
    window._bottomSheetWasRecentlyActive = false;
    window._mobilePopupWasRecentlyActive = false;
    window._infoGuideWasRecentlyActive = false;
    
    // Set time of this reset
    window._lastResetTime = currentTime;
    
    // Also check if user has manually scrolled recently (which fixes the issue naturally)
    if (window._lastMapScrollTime && (currentTime - window._lastMapScrollTime < 1000)) {
        console.log('Skipping reset - user recently scrolled the map');
        
        // Just do a light reset instead of full reinitialization
        if (map) {
            try {
                // Quick cleanup of any visual states
                const markerElements = document.querySelectorAll('.leaflet-marker-icon');
                markerElements.forEach(marker => {
                    marker.style.transform = '';
                    marker.style.zIndex = '';
                    marker.style.pointerEvents = 'auto';
                    
                    const customMarker = marker.querySelector('.marker-icon');
                    if (customMarker) {
                        customMarker.style.transform = '';
                        customMarker.style.backgroundColor = '';
                    }
                });
                
                // Basic handler reset
                if (map.dragging) map.dragging.enable();
                if (map.touchZoom) map.touchZoom.enable();
                if (map.doubleClickZoom) map.doubleClickZoom.enable();
                
                // Quick map refresh
                map.invalidateSize({reset: true, pan: false});
            } catch (e) {
                console.warn('Error during light reset:', e);
            }
        }
        
        // Execute callback if provided
        if (typeof callback === 'function') {
            setTimeout(callback, 100);
        }
        return;
    }
    
    console.log('Radical touch system reset initiated');
    
    // Hide any visible hover labels
    hideAllHoverLabels();
    
    // Save current map state if map exists
    let savedCenter, savedZoom, savedMarkers;
    if (map) {
        try {
            savedCenter = map.getCenter();
            savedZoom = map.getZoom();
            
            // Save references to any marker layers
            if (window.markerClusterGroup) {
                savedMarkers = window.markerClusterGroup.getLayers();
            }
            
            // First, try a complete Leaflet internal state reset
            try {
                // Completely disable all handlers
                map.dragging.disable();
                map.touchZoom.disable();
                map.doubleClickZoom.disable();
                map.scrollWheelZoom.disable();
                map.boxZoom.disable();
                map.keyboard.disable();
                if (map.tap) map.tap.disable();
                
                // Access and reset internal Leaflet state variables
                if (map._leaflet_id) {
                    // Reset dragging state - this is the critical part
                    if (map.dragging && map.dragging._draggable) {
                        // Force "up" state
                        map.dragging._draggable._moved = false;
                        map.dragging._draggable._moving = false;
                        if (map.dragging._draggable._startPoint) {
                            map.dragging._draggable._startPoint = null;
                        }
                        if (map.dragging._draggable._startPos) {
                            map.dragging._draggable._startPos = null;
                        }
                        
                        // Any other internal drag variables
                        map.dragging._draggable._newPos = null;
                        map.dragging._draggable._startTime = 0;
                        map.dragging._draggable._lastPos = null;
                    }
                    
                    // Reset touch zoom handler
                    if (map.touchZoom) {
                        map.touchZoom._zooming = false;
                    }
                    
                    // Reset any _animatingZoom state
                    map._animatingZoom = false;
                    
                    // Reset any moving flags
                    map._moving = false;
                    
                    // Force map to stop any animations
                    map.stop();
                }
            } catch (e) {
                console.warn('Failed to reset Leaflet internal state:', e);
            }
        } catch (e) {
            console.error('Error saving map state:', e);
        }
    }
    
    // Create a fullscreen overlay to capture and reset all touch events
    const touchResetOverlay = document.createElement('div');
    touchResetOverlay.style.position = 'fixed';
    touchResetOverlay.style.top = '0';
    touchResetOverlay.style.left = '0';
    touchResetOverlay.style.width = '100%';
    touchResetOverlay.style.height = '100%';
    touchResetOverlay.style.backgroundColor = 'rgba(255,255,255,0.01)';
    touchResetOverlay.style.zIndex = '9999';
    touchResetOverlay.style.pointerEvents = 'all';
    touchResetOverlay.style.touchAction = 'manipulation';
    
    // Add an explicit touch handler to the overlay
    touchResetOverlay.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log('Touch reset overlay captured touchstart');
    }, { passive: false });
    
    touchResetOverlay.addEventListener('touchmove', (e) => {
        e.preventDefault();
        console.log('Touch reset overlay captured touchmove');
    }, { passive: false });
    
    touchResetOverlay.addEventListener('touchend', (e) => {
        e.preventDefault();
        console.log('Touch reset overlay captured touchend');
    }, { passive: false });
    
    document.body.appendChild(touchResetOverlay);
    
    // Force a browser repaint
    void touchResetOverlay.offsetHeight;
    
    // THE RADICAL APPROACH: We'll completely re-initialize the map!
    // First, get the map container
    const mapContainer = document.getElementById('map');
    
    // Execute the radical reset
    setTimeout(() => {
        // Remove the overlay
        if (document.body.contains(touchResetOverlay)) {
            document.body.removeChild(touchResetOverlay);
        }
        
        if (mapContainer && savedCenter && savedZoom) {
            // EXTREME MEASURE: Get rid of the map entirely and recreate it
            if (map) {
                try {
                    // 1. Remove existing map
                    console.log('Removing existing map for radical reset');
                    map.remove();
                    map = null;
                    
                    // 2. Recreate the map container (force DOM refresh)
                    const parentNode = mapContainer.parentNode;
                    const nextSibling = mapContainer.nextSibling;
                    parentNode.removeChild(mapContainer);
                    
                    // Create a fresh map container
                    const newMapContainer = document.createElement('div');
                    newMapContainer.id = 'map';
                    newMapContainer.style.height = '100vh';
                    newMapContainer.style.width = '100vw';
                    newMapContainer.style.position = 'absolute';
                    newMapContainer.style.top = '0';
                    newMapContainer.style.left = '0';
                    newMapContainer.style.zIndex = '1';
                    
                    // Reinsert the new container
                    if (nextSibling) {
                        parentNode.insertBefore(newMapContainer, nextSibling);
                    } else {
                        parentNode.appendChild(newMapContainer);
                    }
                    
                    // 3. Create a new map instance with the saved state
                    setTimeout(() => {
                        console.log('Creating fresh map instance');
                        map = L.map('map', MAP_CONFIG).setView(savedCenter, savedZoom);
                        
                        // 4. Re-add the tile layer
                        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                            attribution: '© OpenStreetMap contributors, © CARTO',
                            maxZoom: 20,
                            minZoom: 17,
                            subdomains: 'abcd'
                        }).addTo(map);
                        
                        // 5. Recreate marker cluster group
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
                        
                        // 6. Re-add the cluster group to the map
                        map.addLayer(window.markerClusterGroup);
                        
                        // 7. Re-add saved markers if available
                        if (savedMarkers && savedMarkers.length > 0) {
                            window.markerClusterGroup.addLayers(savedMarkers);
                        } else {
                            // 8. If no saved markers, reload establishments data
                            loadEstablishmentsData();
                        }
                        
                        // 9. Setup event listeners
                        setupEventListeners();
                        
                        // 10. Add scroll detection to track when user manually scrolls
                        // This helps us avoid unnecessary resets
                        if (map && map.dragging && map.dragging._draggable) {
                            // Track touchmove events on the map to detect scrolling
                            const mapElement = document.getElementById('map');
                            if (mapElement) {
                                mapElement.addEventListener('touchmove', function() {
                                    // Update the last scroll timestamp
                                    window._lastMapScrollTime = Date.now();
                                }, { passive: true });
                            }
                        }
                        
                        // Execute callback if provided
                        if (typeof callback === 'function') {
                            callback();
                        }
                        
                        console.log('Radical touch system reset complete');
                    }, 100);
                } catch (e) {
                    console.error('Error during radical map reset:', e);
                    
                    // Fallback to simple reinitialization
                    console.log('Falling back to simple map initialization');
                    initializeMap();
                    loadEstablishmentsData();
                    
                    // Execute callback if provided
                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            } else {
                // If no map exists, just initialize normally
                initializeMap();
                loadEstablishmentsData();
                
                // Execute callback if provided
                if (typeof callback === 'function') {
                    callback();
                }
            }
        } else {
            console.log('Map container or state not available, skipping radical reset');
            
            // Execute callback if provided
            if (typeof callback === 'function') {
                callback();
            }
        }
    }, 200);
}

// Setup global info guide popup for all pages
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    
    // Debug check for buttons
    setTimeout(() => {
        const resetBtn = document.getElementById('reset-view-btn');
        const searchBtn = document.getElementById('search-btn');
        console.log('Reset button exists:', !!resetBtn);
        console.log('Search button exists:', !!searchBtn);
        
        // Direct button initialization with explicit handlers
        if (resetBtn) {
            resetBtn.onclick = function(e) {
                console.log('Reset button clicked via onclick');
                e.preventDefault();
                if (typeof resetView === 'function') {
                    resetView();
                } else {
                    console.error('resetView function not found');
                    // Fallback reset
                    if (map) {
                        map.setView([23.5558, 120.4705], 17);
                    }
                }
            };
        }
        
        if (searchBtn) {
            searchBtn.onclick = function(e) {
                console.log('Search button clicked via onclick');
                e.preventDefault();
                if (typeof openSearchModal === 'function') {
                    openSearchModal();
                } else {
                    console.error('openSearchModal function not found');
                }
            };
        }
    }, 2000);
    
    // Initialize context flags for map reset control
    window._bottomSheetWasRecentlyActive = false;
    window._mobilePopupWasRecentlyActive = false;
    window._infoGuideWasRecentlyActive = false;
    
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
            // Set flag to indicate info guide was just closed
            // This will be used to ensure map reset happens in the proper context
            window._infoGuideWasRecentlyActive = true;
            
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            
            // Re-enable map interactions
            if (document.getElementById('map') && map) {
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                if (map.tap) map.tap.enable();
                
                // For touch devices, do a radical reset like we do for establishment pages
                if (window.isTouchDevice && window.isTouchDevice()) {
                    console.log('Touch device detected, performing radical reset after info guide close');
                    // Use the full reset system for touch devices
                    resetTouchSystem(() => {
                        console.log('Radical reset completed after info guide close');
                    });
                } else {
                    // For non-touch devices, just do a simple refresh
                    try {
                        map.invalidateSize({reset: true, pan: false});
                    } catch(e) {
                        console.error('Error refreshing map:', e);
                    }
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

    // Search functionality
function openSearchModal() {
    console.log('Opening search modal');
    
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
    container.className = 'search-modal-container';
    
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
        { id: 'holiday-pay', label: '國定雙倍' },
        { id: 'legal-compliance', label: '符合法規' }
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
}

function closeSearchModal() {
    const overlay = document.getElementById('search-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

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

function setStarRating(id, rating) {
    const container = document.getElementById(id);
    if (!container) return;
    
    container.dataset.rating = rating;
    
    // Update star appearance
    const stars = container.querySelectorAll('.star-select');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

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
    
    // Reset star ratings
    setStarRating('env-rating', 0);
    setStarRating('sat-rating', 0);
}

function applySearch() {
    // Get all search parameters
    const searchParams = {
        name: document.getElementById('establishment-name-search')?.value || '',
        salary: {
            min: parseInt(document.getElementById('min-salary')?.value || '160'),
            max: parseInt(document.getElementById('max-salary')?.value || '250')
        },
        filters: {
            mealProvided: document.getElementById('meal-provided')?.checked || false,
            probation: document.getElementById('probation')?.checked || false,
            laborInsurance: document.getElementById('labor-insurance')?.checked || false,
            holidayPay: document.getElementById('holiday-pay')?.checked || false,
            legalCompliance: document.getElementById('legal-compliance')?.checked || false
        }
    };
    
    console.log('Applying search with params:', searchParams);
    
    // Filter establishments based on search criteria
    filterEstablishments(searchParams);
    
    // Close the modal
    closeSearchModal();
    
    // Show the "clear filters" button if we have any active filters
    showClearFiltersButton();
}

function filterEstablishments(params) {
    console.log('Filtering establishments with params:', params);
    
    // Check if any filters are actually applied
    const hasNameFilter = params.name && params.name.trim() !== '';
    const hasSalaryFilter = params.salary.min > 160 || params.salary.max < 250;
    const hasCheckboxFilters = Object.values(params.filters).some(value => value === true);
    
    // If no filters are applied, don't filter anything
    if (!hasNameFilter && !hasSalaryFilter && !hasCheckboxFilters) {
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
    if (window.establishments && window.originalMarkers) {
        console.log('Total establishments to filter:', window.originalMarkers.length);
        
        window.originalMarkers.forEach(marker => {
            const est = marker.establishment;
            if (!est) {
                console.log('Marker without establishment data:', marker);
                return;
            }
            
            // Detailed logging for the first few markers to debug
            const debug = filteredMarkers.length < 3;
            if (debug) {
                console.log('Evaluating establishment:', est.name);
            }
            
            // Name filter - only apply if name is provided
            if (hasNameFilter && !est.name.toLowerCase().includes(params.name.toLowerCase())) {
                if (debug) console.log('Failed name filter');
                return;
            }
            
            // Salary filter - only apply if the slider has been adjusted
            if (hasSalaryFilter && est.hourlyWage) {
                if (est.hourlyWage < params.salary.min || est.hourlyWage > params.salary.max) {
                    if (debug) console.log('Failed salary filter, wage:', est.hourlyWage);
                    return;
                }
            }
            
            // Boolean filters - only apply filters that are checked
            // Note: we check against the Chinese property names (供餐, etc.) which are used in the GeoJSON
            if (params.filters.mealProvided && est.供餐 !== true) {
                if (debug) console.log('Failed meal provided filter');
                return;
            }
            
            if (params.filters.probation && est.試用期 !== true) {
                if (debug) console.log('Failed probation filter');
                return;
            }
            
            if (params.filters.laborInsurance && est.勞健保 !== true) {
                if (debug) console.log('Failed labor insurance filter');
                return;
            }
            
            if (params.filters.holidayPay && est.國定雙倍 !== true) {
                if (debug) console.log('Failed holiday pay filter');
                return;
            }
            
            // Legal compliance filter (all must be green)
            if (params.filters.legalCompliance) {
                // Check if legal standards exist and all three are true
                if (!est.legalStandards || 
                    !est.legalStandards.hourlyWage || 
                    !est.legalStandards.laborInsurance || 
                    !est.legalStandards.holidayPay) {
                    if (debug) console.log('Failed legal compliance filter');
                    return;
                }
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
    
    // Reset view to default location without using the resetView function
    // (to avoid potential side effects or recursive clearing)
    if (map) {
        map.setView([23.5558, 120.4705], 17, {
            animate: true,
            duration: 0.5
        });
    }
    
    console.log('Filters cleared');
}

// Global implementation of resetView function that's directly accessible
function resetView() {
    console.log('Map reset view triggered (global function)');
    
    if (!map) {
        console.error('Map not initialized - cannot reset view');
        return;
    }
    
    // Check if we're on a touch device
    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints;
    
    if (isTouchDevice) {
        // Touch device specific logic
        console.log('Using touch device reset logic');
        
        // Close any open popups or sheets
        let sheetWasOpen = window.bottomSheetActive;
        
        if (window.bottomSheetActive && typeof closeBottomSheet === 'function') {
            closeBottomSheet();
        }
        
        if (window.mobilePopupActive && typeof closeMobilePopup === 'function') {
            closeMobilePopup();
        }
        
        if (map.closePopup) {
            map.closePopup();
        }
        
        // Clear any ghost touches immediately
        if (typeof forceCompleteGhostTouches === 'function') {
            forceCompleteGhostTouches();
        }
        
        // Adjust delay based on whether the sheet was open
        const delay = sheetWasOpen ? 350 : 50;
        
        setTimeout(() => {
            // Reset the view with animation
            try {
                map.setView([23.5558, 120.4705], 17, {
                    animate: true,
                    duration: 0.5
                });
                
                // Fix touch handlers
                if (typeof resetMapTouchHandlers === 'function') {
                    resetMapTouchHandlers();
                } else if (typeof forceCompleteGhostTouches === 'function') {
                    forceCompleteGhostTouches();
                }
                
                console.log('Map view reset to default position');
            } catch (e) {
                console.error('Error resetting map view:', e);
            }
        }, delay);
    } else {
        // Non-touch device logic - simpler and more direct
        console.log('Using non-touch device reset logic');
        
        // Close any open popups first
        if (map.closePopup) {
            map.closePopup();
        }
        
        // If filter is active, reset it
        if (window.originalMarkers && window.markerClusterGroup) {
            console.log('Restoring original markers after filter');
            window.markerClusterGroup.clearLayers();
            window.markerClusterGroup.addLayers(window.originalMarkers);
            
            if (window.clearFiltersButton) {
                document.body.removeChild(window.clearFiltersButton);
                window.clearFiltersButton = null;
            }
            
            window.originalMarkers = null;
        }
        
        // Center the map view at default coordinates and zoom
        map.setView([23.5558, 120.4705], 17, {
            animate: true,
            duration: 0.5
        });
        
        console.log('Map view reset to default position');
    }
}

// Initialize map control buttons (search, reset, zoom)
function initMapControlButtons() {
    console.log('Initializing map control buttons');
    
    // Reset view button initialization
    const resetViewBtn = document.getElementById('reset-view-btn');
    if (resetViewBtn) {
        console.log('Found reset view button, adding event listeners');
        
        // Remove any existing handlers
        resetViewBtn.removeEventListener('click', resetView);
        
        // Add fresh handlers
        resetViewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Reset view button clicked');
            resetView();
        });
    } else {
        console.log('Reset view button not found');
    }
    
    // Search button initialization
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        console.log('Found search button, adding event listeners');
        
        // Add event handler
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Search button clicked');
            openSearchModal();
        });
    } else {
        console.log('Search button not found');
    }
    
    // Zoom buttons initialization
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            zoomIn();
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            zoomOut();
        });
    }
}

// Zoom in function - increase map zoom by one level
function zoomIn() {
    if (!map) return;
    
    console.log('Zooming in');
    const currentZoom = map.getZoom();
    // Use zoomIn method which is the Leaflet standard way
    map.zoomIn(1);
    console.log(`Zoomed in from ${currentZoom} to ${map.getZoom()}`);
}

// Zoom out function - decrease map zoom by one level
function zoomOut() {
    if (!map) return;
    
    console.log('Zooming out');
    const currentZoom = map.getZoom();
    // Use zoomOut method which is the Leaflet standard way
    map.zoomOut(1);
    console.log(`Zoomed out from ${currentZoom} to ${map.getZoom()}`);
}

// Call this on document load to ensure buttons are initialized
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other initialization to complete
    setTimeout(initMapControlButtons, 1000);
    
    // Add zoom button functionality specifically designed for Leaflet
    // Add event handlers after map is definitely initialized
    setTimeout(function() {
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        
        if (zoomInBtn && window.map) {
            console.log('Setting up zoom in button with Leaflet map:', !!window.map);
            
            zoomInBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Prevent event bubbling
                
                console.log('Zoom in clicked');
                
                if (window.map) {
                    try {
                        // Use Leaflet's built-in method to ensure animations and bounds
                        window.map.zoomIn(1, {animate: true});
                        // Simulate one mouse wheel scroll for non-touch devices
                        if (!('ontouchstart' in window)) {
                            const zoomEvent = new WheelEvent('wheel', {
                                bubbles: true,
                                cancelable: true,
                                deltaY: -100 // Negative deltaY means zoom in
                            });
                            window.map.getContainer().dispatchEvent(zoomEvent);
                        }
                        console.log('Zoomed in to level:', window.map.getZoom());
                    } catch (err) {
                        console.error('Zoom in error:', err);
                    }
                } else {
                    console.error('Map not available for zoom in');
                }
            });
        }
        
        if (zoomOutBtn && window.map) {
            console.log('Setting up zoom out button with Leaflet map:', !!window.map);
            
            zoomOutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Prevent event bubbling
                
                console.log('Zoom out clicked');
                
                if (window.map) {
                    try {
                        // Use Leaflet's built-in method to ensure animations and bounds
                        window.map.zoomOut(1, {animate: true});
                        // Simulate one mouse wheel scroll for non-touch devices
                        if (!('ontouchstart' in window)) {
                            const zoomEvent = new WheelEvent('wheel', {
                                bubbles: true,
                                cancelable: true,
                                deltaY: 100 // Positive deltaY means zoom out
                            });
                            window.map.getContainer().dispatchEvent(zoomEvent);
                        }
                        console.log('Zoomed out to level:', window.map.getZoom());
                    } catch (err) {
                        console.error('Zoom out error:', err);
                    }
                } else {
                    console.error('Map not available for zoom out');
                }
            });
        }
    }, 2000); // Wait 2 seconds to ensure map is fully loaded
});

// Advanced helper function to completely reset touch handling and ghost states
function forceCompleteGhostTouches() {
    if (!map) return;
    
    console.log('Forcing completion of any ghost touches');
    
    // Create a safety flag for preventing infinite loops
    if (window._forceCompleteGhostTouchesActive) {
        console.log('Touch reset already in progress, skipping');
        return;
    }
    
    // Also protect against too frequent calls
    const currentTime = Date.now();
    if (window._lastGhostTouchReset && (currentTime - window._lastGhostTouchReset < 1000)) {
        console.log('Skipping ghost touch reset - too soon after previous reset');
        return;
    }
    
    window._lastGhostTouchReset = currentTime;
    window._forceCompleteGhostTouchesActive = true;
    
    // Method 1: Create and dispatch more realistic synthetic touch events
    try {
        // Get the map container
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            // Create a simulated touch point
            const touch = {
                identifier: Date.now(),
                target: mapContainer,
                clientX: Math.floor(window.innerWidth / 2),
                clientY: Math.floor(window.innerHeight / 2),
                screenX: Math.floor(window.innerWidth / 2),
                screenY: Math.floor(window.innerHeight / 2),
                pageX: Math.floor(window.innerWidth / 2),
                pageY: Math.floor(window.innerHeight / 2),
                radiusX: 1,
                radiusY: 1,
                rotationAngle: 0,
                force: 1
            };
            
            // Attempt to create a TouchList-like object
            const createTouchList = (touch) => {
                try {
                    // Try native TouchList if available
                    if (window.TouchList) {
                        const list = new TouchList();
                        list[0] = touch;
                        list.length = 1;
                        return list;
                    } else {
                        // Fallback to array-like object
                        return [touch];
                    }
                } catch (e) {
                    // Simple fallback
                    return [touch];
                }
            };
            
            // Create touch events with the touch list
            try {
                const touchList = createTouchList(touch);
                
                // Create touchstart event
                let touchStartEvent;
                try {
                    touchStartEvent = new TouchEvent('touchstart', {
                        bubbles: true,
                        cancelable: true,
                        touches: touchList,
                        targetTouches: touchList,
                        changedTouches: touchList
                    });
                } catch (e) {
                    // Fallback for browsers without TouchEvent constructor
                    touchStartEvent = document.createEvent('Event');
                    touchStartEvent.initEvent('touchstart', true, true);
                    touchStartEvent.touches = touchList;
                    touchStartEvent.targetTouches = touchList;
                    touchStartEvent.changedTouches = touchList;
                }
                
                // Dispatch touchstart
                mapContainer.dispatchEvent(touchStartEvent);
                
                // Short timeout to simulate real touch sequence timing
                setTimeout(() => {
                    // Create touchmove event - KEY for simulating scrolling
                    let touchMoveEvent;
                    try {
                        // Move the touch slightly to simulate a tiny drag
                        touch.clientY += 10;
                        touch.pageY += 10;
                        touch.screenY += 10;
                        
                        const moveList = createTouchList(touch);
                        touchMoveEvent = new TouchEvent('touchmove', {
                            bubbles: true,
                            cancelable: true,
                            touches: moveList,
                            targetTouches: moveList,
                            changedTouches: moveList
                        });
                    } catch (e) {
                        touchMoveEvent = document.createEvent('Event');
                        touchMoveEvent.initEvent('touchmove', true, true);
                        touchMoveEvent.touches = touchList;
                        touchMoveEvent.targetTouches = touchList;
                        touchMoveEvent.changedTouches = touchList;
                    }
                    
                    // Dispatch touchmove
                    mapContainer.dispatchEvent(touchMoveEvent);
                    
                    // Even more move events to simulate scrolling
                    setTimeout(() => {
                        touch.clientY += 10;
                        touch.pageY += 10;
                        touch.screenY += 10;
                        mapContainer.dispatchEvent(touchMoveEvent);
                        
                        // Final touchend to complete the sequence
                        setTimeout(() => {
                            let touchEndEvent;
                            try {
                                // Empty touches list, but keep changed touches
                                const emptyList = createTouchList();
                                const changedList = createTouchList(touch);
                                
                                touchEndEvent = new TouchEvent('touchend', {
                                    bubbles: true,
                                    cancelable: true,
                                    touches: emptyList,
                                    targetTouches: emptyList,
                                    changedTouches: changedList
                                });
                            } catch (e) {
                                touchEndEvent = document.createEvent('Event');
                                touchEndEvent.initEvent('touchend', true, true);
                                touchEndEvent.touches = [];
                                touchEndEvent.targetTouches = [];
                                touchEndEvent.changedTouches = touchList;
                            }
                            
                            // Dispatch touchend
                            mapContainer.dispatchEvent(touchEndEvent);
                            document.dispatchEvent(touchEndEvent);
                            window.dispatchEvent(touchEndEvent);
                            
                            // Also dispatch mouseup for hybrid events
                            const mouseUpEvent = new MouseEvent('mouseup', {
                                bubbles: true,
                                cancelable: true,
                                clientX: touch.clientX,
                                clientY: touch.clientY
                            });
                            document.dispatchEvent(mouseUpEvent);
                            
                            // Clear the safety flag
                            setTimeout(() => {
                                window._forceCompleteGhostTouchesActive = false;
                            }, 100);
                        }, 50);
                    }, 50);
                }, 50);
            } catch (e) {
                console.warn('Failed to create advanced touch events:', e);
                window._forceCompleteGhostTouchesActive = false;
            }
        }
    } catch (e) {
        console.warn('Failed to create synthetic events:', e);
        window._forceCompleteGhostTouchesActive = false;
    }
    
    // Method 2: Directly manipulate Leaflet's internal state (comprehensive approach)
    if (map._leaflet_id) {
        try {
            // COMPLETELY reset dragging state
            if (map.dragging && map.dragging._draggable) {
                // Reset all dragging internal flags and state
                map.dragging._draggable._moved = false;
                map.dragging._draggable._moving = false;
                map.dragging._draggable._startPoint = null;
                map.dragging._draggable._startPos = null;
                map.dragging._draggable._newPos = null;
                map.dragging._draggable._startTime = 0;
                map.dragging._draggable._lastPos = null;
                
                // Clear move handlers temporarily
                if (map.dragging._draggable._onMove) {
                    const originalOnMove = map.dragging._draggable._onMove;
                    map.dragging._draggable._onMove = null;
                    setTimeout(() => {
                        map.dragging._draggable._onMove = originalOnMove;
                    }, 10);
                }
                
                // Force a call to _onUp to ensure drag end is processed
                if (typeof map.dragging._draggable._onUp === 'function') {
                    try {
                        map.dragging._draggable._onUp({ 
                            type: 'touchend',
                            preventDefault: function() {},
                            stopPropagation: function() {}
                        });
                    } catch (e) {
                        console.warn('Error calling internal _onUp handler:', e);
                    }
                }
                
                // Force disable and re-enable to reset all event listeners
                try {
                    map.dragging.disable();
                    setTimeout(() => {
                        map.dragging.enable();
                    }, 10);
                } catch (e) {
                    console.warn('Error toggling drag handler:', e);
                }
            }
            
            // Reset ALL touch zoom handler state
            if (map.touchZoom) {
                map.touchZoom._zooming = false;
                
                // Reset any other touch zoom internal state
                if (map.touchZoom._moved) map.touchZoom._moved = false;
                if (map.touchZoom._startPoint) map.touchZoom._startPoint = null;
                if (map.touchZoom._startDist) map.touchZoom._startDist = 0;
                if (map.touchZoom._zoom) map.touchZoom._zoom = map.getZoom();
                
                // Force touch end handling
                if (typeof map.touchZoom._onTouchEnd === 'function') {
                    try {
                        map.touchZoom._onTouchEnd();
                    } catch (e) {
                        console.warn('Error calling touchZoom._onTouchEnd:', e);
                    }
                }
                
                // Toggle to ensure full reset
                map.touchZoom.disable();
                setTimeout(() => {
                    map.touchZoom.enable();
                }, 10);
            }
            
            // Reset ANY animation or motion flags
            map._animatingZoom = false;
            map._moving = false;
            map._loaded = true;
            
            // Force map to stop any animations
            if (typeof map.stop === 'function') {
                try {
                    map.stop();
                } catch (e) {
                    console.warn('Error stopping map animations:', e);
                }
            }
            
            // Reset EVERY handler we can find
            if (map._handlers && map._handlers.length) {
                for (let i = 0; i < map._handlers.length; i++) {
                    const handler = map._handlers[i];
                    if (handler && typeof handler.disable === 'function' && typeof handler.enable === 'function') {
                        try {
                            const wasEnabled = handler.enabled;
                            handler.disable();
                            if (wasEnabled) {
                                setTimeout(() => {
                                    handler.enable();
                                }, 10);
                            }
                        } catch (e) {
                            console.warn(`Error resetting handler ${i}:`, e);
                        }
                    }
                }
            }
            
            // Reset any marker layer interactivity
            if (window.markerClusterGroup) {
                try {
                    window.markerClusterGroup.refreshClusters();
                } catch (e) {
                    console.warn('Error refreshing marker clusters:', e);
                }
            }
        } catch (e) {
            console.warn('Failed deep reset of Leaflet internal handlers:', e);
        }
    }
    
    // Method 3: Force visual refresh of all map elements
    try {
        // Reset all markers to normal state
        const markerElements = document.querySelectorAll('.leaflet-marker-icon');
        markerElements.forEach(marker => {
            // Reset any stuck hover/active states
            marker.style.transform = '';
            marker.style.zIndex = '';
            marker.style.pointerEvents = 'auto';
            
            // Force a DOM reflow
            const originalDisplay = marker.style.display;
            marker.style.display = 'none';
            void marker.offsetHeight; // Force reflow
            marker.style.display = originalDisplay;
            
            // Reset internal marker elements
            const customMarker = marker.querySelector('.marker-icon');
            if (customMarker) {
                customMarker.style.transform = '';
                customMarker.style.backgroundColor = '';
            }
        });
        
        // Reset map container styles
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.style.pointerEvents = 'auto';
            mapContainer.style.touchAction = 'manipulation';
            
            // Force container redraw
            mapContainer.style.transform = 'translateZ(0)';
            void mapContainer.offsetHeight;
            mapContainer.style.transform = '';
        }
        
        // Force a complete map refresh
        map.invalidateSize({reset: true, pan: false, animate: false});
    } catch (e) {
        console.warn('Failed to refresh map visual state:', e);
    }
}

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
            const resetViewBtn = document.getElementById('reset-view-btn');
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
            
            // Track when user manually scrolls to avoid unnecessary resets
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                mapContainer.addEventListener('touchmove', function() {
                    window._lastMapScrollTime = Date.now();
                }, { passive: true });
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
    
    // Create a new map instance with optimized config for touch devices
    const mapInitConfig = {...MAP_CONFIG};
    
    // Enhance touch device configuration
    if (isTouchDevice()) {
        // Enable tap with higher tolerance for better marker clicking
        mapInitConfig.tap = true;
        mapInitConfig.tapTolerance = 30;
        
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
            
            // Set initial touch action to none and pointer events to auto
            mapContainer.style.touchAction = 'pan-x pan-y';
            mapContainer.style.pointerEvents = 'auto';
        }
    }
    
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
            
            // Clear any ghost touches immediately
            forceCompleteGhostTouches();
            
            // Adjust delay based on whether the sheet was open
            const delay = sheetWasOpen ? 350 : 50;
            
            setTimeout(() => {
                // Reset the view with animation
                map.setView([23.5558, 120.4705], 17, {
                    animate: true,
                    duration: 0.5
                });
                
                // Fix touch handlers
                if (typeof resetMapTouchHandlers === 'function') {
                    resetMapTouchHandlers();
                } else {
                    forceCompleteGhostTouches();
                }
                
                console.log('Map view reset to default position');
            }, delay);
        }

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
        
        // Setup search button functionality (new feature)
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            // First remove any existing handlers to prevent duplicates
            const handleSearchClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSearchModal();
            };
            
            searchBtn.addEventListener('click', handleSearchClick);
            searchBtn.addEventListener('touchend', handleSearchClick);
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
                    
                    // Extract hourly wage from salary string (e.g., "NT$ 190/小時" -> 190)
                    let hourlyWage = 0;
                    if (feature.properties.salary) {
                        const match = feature.properties.salary.match(/(\d+)/);
                        if (match && match[1]) {
                            hourlyWage = parseInt(match[1]);
                        }
                    }
                    
                    // Define default rating counts if not available
                    const envRatingCount = feature.properties.環境評分人數 || 0;
                    const satRatingCount = feature.properties.滿意度評分人數 || 0;
                    
                    return {
                        name: feature.properties.name,
                        position: [lat, lng],
                        icon: feature.properties.icon || 'building',
                        salary: feature.properties.salary || 'N/A',
                        hourlyWage: hourlyWage, // Add parsed hourly wage for filtering
                        // Using Chinese property names in display
                        供餐: feature.properties.供餐 || feature.properties.mealProvided || false,
                        試用期: feature.properties.試用期 || feature.properties.holidayPay || false,
                        勞健保: feature.properties.勞健保 || feature.properties.flexibleHours || false,
                        國定雙倍: feature.properties.國定雙倍 || feature.properties.trainingProvided || false,
                        環境評分: feature.properties.環境評分 || feature.properties.environmentRating || 0,
                        滿意度評分: feature.properties.滿意度評分 || feature.properties.managementRating || 0,
                        環境評分人數: envRatingCount,
                        滿意度評分人數: satRatingCount,
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
                hourlyWage: 180,
                供餐: true,
                試用期: true,
                勞健保: true,
                國定雙倍: false,
                環境評分: 3,
                滿意度評分: 4,
                環境評分人數: 5,
                滿意度評分人數: 5,
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
                hourlyWage: 160,
                供餐: false,
                試用期: true,
                勞健保: false,
                國定雙倍: true,
                環境評分: 4,
                滿意度評分: 3,
                環境評分人數: 5,
                滿意度評分人數: 5,
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
            
            // Create custom icon and marker with interactive options
            const customIcon = L.divIcon({
                html: markerContainer,
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            
            const marker = L.marker(establishment.position, { 
                icon: customIcon,
                interactive: true,  // Ensure markers are interactive
                bubblingMouseEvents: false // Prevent events from bubbling to map
            });
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
            
            // Improved click event listener with focus on reliable touch handling
            marker.on('click', (e) => {
                // Don't aggressively block propagation - allows scrolling to work
                console.log('Marker clicked', marker.establishment.name);
                
                // Immediately close any open popups
                map.closePopup();
                
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
                
                // Use a small delay to ensure any previous popups are closed
                setTimeout(() => {
                    // Determine which popup method to use based on device
                    if (window.innerWidth <= 768) {
                        showMobilePopup(marker);
                    } else {
                        showDesktopPopup(marker);
                    }
                    
                    // Track active marker
                    activeMarker = marker;
                }, 50);
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
        const certBadge = document.createElement('div');
        certBadge.className = marker.establishment.certified ? 'certification-badge' : 'certification-badge inactive';
        certBadge.innerHTML = '<i class="fas fa-award"></i>';
        certBadge.title = marker.establishment.certified ? '店家協助認證此資訊' : '店家尚未協助認證此資訊';
        titleContainer.appendChild(certBadge);
        
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
    
    // Close bottom sheet with RADICAL touch reset
    function closeBottomSheet() {
        console.log('Closing bottom sheet - with RADICAL touch reset');
        const bottomSheet = document.getElementById('bottom-sheet-container');
        
        if (!bottomSheet) return;
        
        // Set flag to indicate a bottom sheet was just closed
        // This will be used to ensure map reset happens in the proper context
        window._bottomSheetWasRecentlyActive = true;
        
        // Make sure the bottom sheet has transition
        bottomSheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s';
        
        // Hide with animation - move completely off screen and hide 
        bottomSheet.classList.remove('active');
        bottomSheet.style.transform = 'translateY(100%)';
        
        // Restore body scrolling
        document.body.style.overflow = '';
        
        // First, immediately reset all marker elements to normal state
        const markerElements = document.querySelectorAll('.leaflet-marker-icon');
        markerElements.forEach(marker => {
            // Reset any stuck hover states on markers
            marker.style.transform = '';
            marker.style.zIndex = '';
            marker.style.pointerEvents = 'auto';
            
            // Reset any custom markers inside
            const customMarker = marker.querySelector('.marker-icon');
            if (customMarker) {
                customMarker.style.transform = '';
                customMarker.style.backgroundColor = '';
            }
        });
        
        // After animation starts but before it completes, begin touch reset
        setTimeout(() => {
            // Basic quick attempt at touch reset
            if (map) {
                try {
                    // Manually reset key internal Leaflet state flags
                    if (map.dragging && map.dragging._draggable) {
                        map.dragging._draggable._moved = false;
                        map.dragging._draggable._moving = false;
                    }
                    
                    if (map.touchZoom) {
                        map.touchZoom._zooming = false;
                    }
                    
                    map._animatingZoom = false;
                    map._moving = false;
                    
                    // Force reset all handlers
                    map.dragging.enable();
                    map.touchZoom.enable();
                    map.doubleClickZoom.enable();
                } catch (e) {
                    console.warn('Error in first phase touch reset:', e);
                }
            }
        }, 150);
        
        // After animation completes, set visibility to hidden and do radical reset
        setTimeout(() => {
            bottomSheet.style.visibility = 'hidden';
            bottomSheet.style.pointerEvents = 'none';
            
            // Clear state variables
            window.bottomSheetActive = false;
            window.activeMarker = null;
            
            // INITIATE RADICAL RESET - completely reinitialize the map
            resetTouchSystem(() => {
                console.log('Radical reset completed after bottom sheet close');
                
                // Re-enable any critical event handlers
                if (document.getElementById('reset-view-btn')) {
                    const resetViewBtn = document.getElementById('reset-view-btn');
                    resetViewBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (typeof resetView === 'function') {
                            resetView();
                        }
                    });
                }
            });
        }, 300);
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
        
        // Set flag to indicate a mobile popup was just closed
        // This will be used to ensure map reset happens in the proper context
        window._mobilePopupWasRecentlyActive = true;
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
        certBadge.title = establishment.certified ? '店家協助認證此資訊' : '店家尚未協助認證此資訊';
        titleContainer.appendChild(certBadge);
        
        header.appendChild(titleContainer);
        
        // Create tabs for toggling between establishment info and legal standards
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'popup-tabs';
        
        const establishmentTab = document.createElement('div');
        establishmentTab.className = 'popup-tab active';
        establishmentTab.textContent = '店家資訊';
        establishmentTab.dataset.target = 'establishment-info';
        
        // Add explicit touch optimizations for tab items
        establishmentTab.style.touchAction = 'manipulation';
        establishmentTab.style.webkitTapHighlightColor = 'transparent';
        establishmentTab.style.userSelect = 'none';
        
        const standardsTab = document.createElement('div');
        standardsTab.className = 'popup-tab';
        standardsTab.textContent = '法定規範';
        standardsTab.dataset.target = 'legal-standards';
        
        // Add explicit touch optimizations for tab items
        standardsTab.style.touchAction = 'manipulation';
        standardsTab.style.webkitTapHighlightColor = 'transparent';
        standardsTab.style.userSelect = 'none';
        
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
        
        // Add star ratings with rater counts
        establishmentContent.appendChild(createStarRatingRowWithUpdate('環境評分', establishment.環境評分, establishment.updates.環境評分, establishment.環境評分人數));
        establishmentContent.appendChild(createStarRatingRowWithUpdate('滿意度評分', establishment.滿意度評分, establishment.updates.滿意度評分, establishment.滿意度評分人數));
        
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
        explanationText.innerHTML = '依據勞動基準法規定，\n以下是雇主應遵守的基本標準：<br><small>法律未規範供餐和試用期</small>';
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
        
        // Add optimized tab event listeners with touch-specific handling
        function setupTabHandlers(tabElement, otherTabElement, contentToShow, contentToHide) {
            // Improved event handlers for both touch and mouse
            function activateTab(e) {
                // Stop event from propagating to prevent any map interaction
                if (e) {
                    e.stopPropagation();
                    if (e.cancelable) e.preventDefault();
                }
                
                // Switch tabs
                tabElement.classList.add('active');
                otherTabElement.classList.remove('active');
                
                // Switch content with a slight delay for smoother transition
                setTimeout(() => {
                    contentToShow.classList.add('active');
                    contentToHide.classList.remove('active');
                }, 10);
                
                // For touch events, ensure ghost states are cleared
                if (isTouchDevice()) {
                    // Clear ghost touches but don't move the map
                    setTimeout(() => {
                        // Use a simplified version that doesn't move the map
                        // Just dispatch synthetic events to clear stuck states
                        try {
                            const fakeTouchEnd = new Event('touchend', { bubbles: true, cancelable: true });
                            document.dispatchEvent(fakeTouchEnd);
                        } catch(e) { /* ignore */ }
                    }, 50);
                }
            }
            
            // Use both standard click and touchend for most reliable handling
            tabElement.addEventListener('click', activateTab);
            
            // On touch devices, also use touchend for more immediate response
            if (isTouchDevice()) {
                tabElement.addEventListener('touchend', activateTab, { passive: false });
            }
        }
        
        // Setup tab handlers going in both directions
        setupTabHandlers(establishmentTab, standardsTab, establishmentContent, standardsContent);
        setupTabHandlers(standardsTab, establishmentTab, standardsContent, establishmentContent);
        
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
    
    // Create a star rating row with update time and rater count
    function createStarRatingRowWithUpdate(label, rating, updateTime, raterCount) {
        const row = document.createElement('div');
        row.className = 'info-row';
        
        const labelElement = document.createElement('div');
        labelElement.className = 'label';
        labelElement.textContent = label;
        
        // Add rater count directly next to the label
        if (raterCount) {
            const raterCountElem = document.createElement('span');
            raterCountElem.className = 'rater-count';
            raterCountElem.textContent = `${raterCount}人`;
            labelElement.appendChild(raterCountElem);
        }
        
        const valueContainer = document.createElement('div');
        valueContainer.className = 'value';
        
        const ratingElement = document.createElement('div');
        ratingElement.className = 'star-rating';
        
        // Add 5 stars (filled, half-filled or empty based on rating)
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            if (i <= Math.floor(rating)) {
                // Fully filled star
                star.className = 'fas fa-star star filled';
            } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                // Half-filled star for decimal values
                star.className = 'fas fa-star-half-alt star filled';
            } else {
                // Empty star
                star.className = 'far fa-star star';
            }
            ratingElement.appendChild(star);
        }
        
        // Add tooltip to show exact rating number on hover
        ratingElement.title = `評分: ${rating.toFixed(1)}/5.0`;
        ratingElement.style.cursor = 'default';
        
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
