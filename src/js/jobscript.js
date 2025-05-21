// Function to set the active state based on current page - now just a stub
function setActiveState() {
    // We no longer set active states on navbar links
    // This function kept for compatibility with existing code
    return;
}

// Check if device has touch capability
function isTouchDevice() {
    return (('ontouchstart' in window) ||
           (navigator.maxTouchPoints > 0) ||
           (navigator.msMaxTouchPoints > 0));
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

// Removed resetTouchSystem function

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
        // Removed consecutiveFailedTouches = 0;
        
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
            // consecutiveFailedTouches = 0; // Removed
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
                // Removed logic related to consecutiveFailedTouches and resetTouchSystem
                // if ((touchDuration < 100 && touchDistance < 5) || 
                //     (touchDuration > 500 && touchDistance < 10)) {
                //     // consecutiveFailedTouches++; // Removed
                //     // console.log('Possible touch issue detected: ...'); // Removed
                // }
                
                // Removed block: if (consecutiveFailedTouches >= 2) { ... resetTouchSystem() ... }
                
                // Also check if the touch ended inside the map for the traditional reset
                if (e.target.closest('#map')) {
                    // If we detect touches aren't working (not tested yet), try resetting
                    // setTimeout(function() { // Removed call to resetMapTouchHandlers
                        // if (typeof resetMapTouchHandlers === 'function' && 
                        //     !document.querySelector('.mobile-popup-overlay.active') && 
                        //     !document.querySelector('.info-guide-overlay.active')) {
                        //     resetMapTouchHandlers();
                        // }
                    // }, 500);
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
                // Replace the if/else block for resetTouchSystem/invalidateSize
                // with a consistent map refresh.
                map.invalidateSize({reset: true, animate: false, pan: false});
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                if (map.tap) map.tap.enable();
                console.log('Map refreshed after info guide close');
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
            
            if (params.filters.holidayPay && est.國定雙倍 !== true && est.國定雙倍 !== "放假") {
                if (debug) console.log('Failed holiday pay filter');
                return;
            }
            
            // Legal compliance filter with improved logic for 勞健保 based on employee count
            if (params.filters.legalCompliance) {
                // Check the hourly wage compliance
                const meetsWageStandard = est.hourlyWage >= parseInt(window.legalStandard.salary.replace(/[^0-9]/g, ''));
                
                // Check the 勞健保 compliance based on 勞工人數
                let meetsInsuranceStandard = true;
                if (est.勞工人數 > 5) {
                    // For establishments with more than 5 employees, 勞健保 must be true
                    meetsInsuranceStandard = est.勞健保 === true;
                } else {
                    // For establishments with 5 or fewer employees, both true and false are acceptable
                    meetsInsuranceStandard = true;
                }
                
                // Check 國定雙倍 compliance - now string "放假" is also compliant
                const meetsHolidayStandard = (est.國定雙倍 === true || est.國定雙倍 === "放假");
                
                // All conditions must be met
                if (!meetsWageStandard || !meetsInsuranceStandard || !meetsHolidayStandard) {
                    if (debug) {
                        console.log('Failed legal compliance filter:');
                        console.log('- Wage standard:', meetsWageStandard);
                        console.log('- Insurance standard:', meetsInsuranceStandard, 'Employee count:', est.勞工人數);
                        console.log('- Holiday standard:', meetsHolidayStandard);
                    }
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
// const MAP_CONFIG = { ... }; // Removed as per instructions
// const MAP_CONFIG has been removed.

const DEFAULT_VIEW = [23.5558, 120.4705];
const DEFAULT_ZOOM = 17;

let map; // Store map reference globally
let tileLayer; // Store tile layer reference
let mapState = {}; // Store current map state

// Initialize map and related functionality
function initializeMap() {
    console.log('Initializing job map...'); // Updated log message
    
    // Get map container element
    // const mapContainer = document.getElementById('map'); // mapContainer is defined later if needed
    
    // If a map instance already exists, destroy it first
    if (map && typeof map.remove === 'function') {
        console.log('Removing existing map instance');
        // Save current map state before removing
        saveMapState();
        map.remove();
        map = null;
    }
    
    // Define the new configuration object
    const mapInitConfig = {
        zoomControl: false,
        attributionControl: false,
        closePopupOnClick: true,
        preferCanvas: false,
        minZoom: 17, // from existing jobscript MAP_CONFIG
        maxZoom: 20, // from existing jobscript MAP_CONFIG
        bounceAtZoomLimits: false,
        inertia: !isTouchDevice(),
        scrollWheelZoom: !isTouchDevice(),
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        tap: isTouchDevice(), 
        tapTolerance: 15, 
        zoomSnap: 0.5,
        wheelPxPerZoomLevel: 120,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true,
        tapHold: isTouchDevice()
    };
    
    // Apply touch-specific overrides
    if (isTouchDevice()) {
        mapInitConfig.bounceAtZoomLimits = false; 
        mapInitConfig.inertiaDeceleration = 2000; 
        mapInitConfig.tap = true; 
        mapInitConfig.tapTolerance = 40; // Use 40 for touch devices
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
        maxZoom: 20, // from jobscript
        minZoom: 17, // from jobscript
        subdomains: 'abcd'
    }).addTo(map);
    
    // Create a new marker cluster group with original jobscript styling
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
    
    // For touch devices, apply comprehensive touch optimizations from rentscript.js
    if (isTouchDevice()) {
        // Ensure Leaflet's tap handling is properly configured (already done by mapInitConfig, but good for clarity)
        // map.options.tap = true;
        // map.options.tapTolerance = 40; 
        
        // Make sure all touch handlers are enabled (already done by mapInitConfig, but good for clarity)
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            let lastScrollTime = 0;
            mapContainer.addEventListener('touchmove', function(e) {
                lastScrollTime = Date.now();
            }, {passive: true});
            
            mapContainer.addEventListener('touchend', function(e) {
                const wasScroll = (Date.now() - lastScrollTime) < 300;
                if (wasScroll) {
                    setTimeout(forceCompleteGhostTouches, 50);
                } else {
                    setTimeout(() => {
                        if (!window.bottomSheetActive && !document.querySelector('.leaflet-popup')) {
                            forceCompleteGhostTouches();
                        }
                    }, 300);
                }
            }, {passive: true});
            
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
    // let _markerClusterGroup = L.markerClusterGroup({ ... }); // Removed unused local variable as planned
    
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
                    // Check if marker still exists and has an 'off' method
                    if (marker && typeof marker.off === 'function') { 
                        marker.off('click'); // Avoid errors if marker was removed
                        marker.on('click', () => {
                            window.innerWidth <= 768 ? showMobilePopup(marker) : showDesktopPopup(marker);
                            activeMarker = marker;
                        });
                    }
                }, 50);
            }
            
            activeMarker = null;

            // --- BEGINNING OF ADDED IOS FIX ---
            // Detect iOS specifically
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            if (isIOS) {
                console.log('iOS popup close detected - triggering map refresh');
                // Force a redraw of the map after popup closes
                setTimeout(() => {
                    if (map) { // Ensure map still exists
                        map.invalidateSize({reset: true, animate: false, pan: false});
                        
                        // Additional fix: trigger a small pan to force tile reload if needed
                        try { // Add try-catch for panBy in case map state is unusual
                            const center = map.getCenter(); // Ensure map has a center
                            if (center) {
                                 map.panBy([1, 1], { animate: false, duration: 0.1 });
                                 map.panBy([-1, -1], { animate: false, duration: 0.1 });
                            }
                        } catch (panError) {
                            console.warn('Error during iOS panBy fix:', panError);
                        }
                    }
                }, 100); // 100ms delay
            }
            // --- END OF ADDED IOS FIX ---
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
            // if (!mobilePopupActive && Date.now() - touchStartTime > 300) {
                // resetMapTouchHandlers(); // Removed call
            // }
        }, { passive: true });
    }
    
    // Removed resetMapTouchHandlers function
    
    // No longer setting active class on navigation links
    function setActiveNavLink() {
        // We no longer set active states on links
        return;
    }
    
    // Load establishment data from GeoJSON file
    function loadEstablishmentsData() {
        fetch('../src/data/establishments.geojson')
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
                        勞工人數: feature.properties.勞工人數 || 3, // Default to 3 if not specified
                        老闆的話: feature.properties.老闆的話 || "無店家留言", // Default to "無店家留言"
                        store_auth: feature.properties.store_auth || false, // Information provided by store
                        question_auth: feature.properties.question_auth !== false, // Information collected via questionnaire
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
                store_auth: false,
                question_auth: true,
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
                store_auth: false,
                question_auth: true,
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
        title.style.whiteSpace = 'nowrap'; // Keep on one line
        title.style.overflow = 'hidden'; // Hide overflow
        title.style.textOverflow = 'ellipsis'; // Add ellipsis
        titleContainer.appendChild(title);
        
        // Add auth icons container
        const authContainer = document.createElement('div');
        authContainer.className = 'bottom-sheet-auth-icons';
        
        // Create tooltip container that will be dynamically positioned
        const tooltipContainer = document.createElement('div');
        tooltipContainer.className = 'tooltip-container';
        document.body.appendChild(tooltipContainer);
        
        // Add store auth icon if applicable
        if (marker.establishment.store_auth) {
            const storeIcon = document.createElement('div');
            storeIcon.className = 'auth-icon store-auth-icon';
            
            const iconInner = document.createElement('div');
            iconInner.className = 'auth-icon-inner';
            iconInner.innerHTML = '<i class="fas fa-store"></i>';
            storeIcon.appendChild(iconInner);
            
            // Dynamic tooltip positioning - only for non-touch devices
            if (!('ontouchstart' in window)) {
                storeIcon.addEventListener('mouseenter', (e) => {
                    tooltipContainer.textContent = '此資訊由店家提供';
                    tooltipContainer.classList.add('visible');
                    
                    // Get position of the icon
                    const rect = storeIcon.getBoundingClientRect();
                    
                    // Position tooltip 10px below the icon and centered
                    tooltipContainer.style.left = (rect.left + rect.width/2 - tooltipContainer.offsetWidth/2) + 'px';
                    tooltipContainer.style.top = (rect.bottom + 10) + 'px';
                });
                
                storeIcon.addEventListener('mouseleave', () => {
                    tooltipContainer.classList.remove('visible');
                });
            }
            
            authContainer.appendChild(storeIcon);
        }
        
        // Add questionnaire auth icon if applicable
        if (marker.establishment.question_auth) {
            const questionIcon = document.createElement('div');
            questionIcon.className = 'auth-icon question-auth-icon';
            
            const iconInner = document.createElement('div');
            iconInner.className = 'auth-icon-inner';
            iconInner.innerHTML = '<i class="fas fa-clipboard-list"></i>';
            questionIcon.appendChild(iconInner);
            
            // Dynamic tooltip positioning - only for non-touch devices
            if (!('ontouchstart' in window)) {
                questionIcon.addEventListener('mouseenter', (e) => {
                    tooltipContainer.textContent = '此資訊由問卷蒐集';
                    tooltipContainer.classList.add('visible');
                    
                    // Get position of the icon
                    const rect = questionIcon.getBoundingClientRect();
                    
                    // Position tooltip 10px below the icon and centered
                    tooltipContainer.style.left = (rect.left + rect.width/2 - tooltipContainer.offsetWidth/2) + 'px';
                    tooltipContainer.style.top = (rect.bottom + 10) + 'px';
                });
                
                questionIcon.addEventListener('mouseleave', () => {
                    tooltipContainer.classList.remove('visible');
                });
            }
            
            authContainer.appendChild(questionIcon);
        }
        
        titleContainer.appendChild(authContainer);
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
    
    // Close bottom sheet with map refresh
    function closeBottomSheet() {
        console.log('Closing bottom sheet - with map refresh'); // Updated log
        const bottomSheet = document.getElementById('bottom-sheet-container');
        
        if (!bottomSheet) return;
        
        // Set flag to indicate a bottom sheet was just closed
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
        
        // Removed the 150ms setTimeout block with "Basic quick attempt at touch reset"
        
        // After animation completes, set visibility to hidden and perform map refresh
        setTimeout(() => {
            bottomSheet.style.visibility = 'hidden';
            bottomSheet.style.pointerEvents = 'none';
            
            // Clear state variables
            window.bottomSheetActive = false;
            window.activeMarker = null;
            
            // Replace resetTouchSystem with map.invalidateSize() and handler re-enabling
            if (map) {
                map.invalidateSize({reset: true, animate: false, pan: false});

                const center = map.getCenter();
                if (center) { // Ensure map has a center to avoid errors
                    try {
                        map.panBy([1, 1], { animate: false, duration: 0.1 });
                        map.panBy([-1, -1], { animate: false, duration: 0.1 });
                        console.log('Map panned slightly to encourage refresh in closeBottomSheet.');
                    } catch (panError) {
                        console.warn('Error during panBy trick in closeBottomSheet:', panError);
                    }
                } else {
                    console.warn('Map center not available for panBy trick in closeBottomSheet.');
                }

                if (window.markerClusterGroup && typeof window.markerClusterGroup.refreshClusters === 'function') {
                    window.markerClusterGroup.refreshClusters();
                    console.log('MarkerClusterGroup refreshed via refreshClusters() in closeBottomSheet.');
                } else {
                    if (!window.markerClusterGroup) console.warn('closeBottomSheet: MarkerClusterGroup not found for refreshClusters().');
                    else console.warn('closeBottomSheet: refreshClusters() method not available.');
                }
            
                // Re-enable map interactions
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                if (map.tap) map.tap.enable(); // Ensure tap is enabled

                // Removed MarkerClusterGroup refresh logic
                // if (window.markerClusterGroup && map && map.hasLayer(window.markerClusterGroup)) {
                //     map.removeLayer(window.markerClusterGroup);
                //     map.addLayer(window.markerClusterGroup);
                //     console.log('MarkerClusterGroup layer refreshed in closeBottomSheet.');
                // } else {
                //     if (!window.markerClusterGroup) console.log('closeBottomSheet: MarkerClusterGroup not found.');
                //     else if (!map) console.log('closeBottomSheet: Map not found.');
                //     else if (!map.hasLayer(window.markerClusterGroup)) console.log('closeBottomSheet: MarkerClusterGroup not on map.');
                // }

                console.log('Map refreshed and interactions re-enabled after bottom sheet close'); // Updated log
                forceCompleteGhostTouches(); // Add call here
            }
            // Removed resetTouchSystem call and its callback (which re-added resetViewBtn listener)
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
        
        // Remove resetTouchSystem() call and its callback
        // Implement map.invalidateSize() refresh logic
        if (map) {
            map.invalidateSize({reset: true, animate: false, pan: false});

            const center = map.getCenter();
            if (center) { // Ensure map has a center to avoid errors
                try {
                    map.panBy([1, 1], { animate: false, duration: 0.1 });
                    map.panBy([-1, -1], { animate: false, duration: 0.1 });
                    console.log('Map panned slightly to encourage refresh in closeMobilePopup.');
                } catch (panError) {
                    console.warn('Error during panBy trick in closeMobilePopup:', panError);
                }
            } else {
                console.warn('Map center not available for panBy trick in closeMobilePopup.');
            }

            if (window.markerClusterGroup && typeof window.markerClusterGroup.refreshClusters === 'function') {
                window.markerClusterGroup.refreshClusters();
                console.log('MarkerClusterGroup refreshed via refreshClusters() in closeMobilePopup.');
            } else {
                if (!window.markerClusterGroup) console.warn('closeMobilePopup: MarkerClusterGroup not found for refreshClusters().');
                else console.warn('closeMobilePopup: refreshClusters() method not available.');
            }

            // Re-enable map interactions (including desktop-specific ones)
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
            map.scrollWheelZoom.enable(); // Enable for desktop/non-touch
            map.boxZoom.enable();         // Enable for desktop/non-touch
            map.keyboard.enable();        // Enable for desktop/non-touch
            if (map.tap) map.tap.enable();

            // Removed MarkerClusterGroup refresh logic
            // if (window.markerClusterGroup && map && map.hasLayer(window.markerClusterGroup)) {
            //     map.removeLayer(window.markerClusterGroup);
            //     map.addLayer(window.markerClusterGroup);
            //     console.log('MarkerClusterGroup layer refreshed in closeMobilePopup.');
            // } else {
            //     if (!window.markerClusterGroup) console.log('closeMobilePopup: MarkerClusterGroup not found.');
            //     else if (!map) console.log('closeMobilePopup: Map not found.');
            //     else if (!map.hasLayer(window.markerClusterGroup)) console.log('closeMobilePopup: MarkerClusterGroup not on map.');
            // }
            
            console.log('Map refreshed and interactions re-enabled after mobile popup close');
            forceCompleteGhostTouches(); // Add call here
        }
        // All logic from the previous resetTouchSystem callback (saveMapState, initializeMap, etc.) is removed.
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
        titleContainer.style.flexDirection = 'column';
        titleContainer.style.justifyContent = 'center';
        titleContainer.style.flex = '1';
        titleContainer.style.overflow = 'hidden'; // Ensure container doesn't overflow
        
        const title = document.createElement('h3');
        title.textContent = establishment.name;
        title.style.whiteSpace = 'nowrap'; // Keep on one line
        title.style.overflow = 'hidden'; // Hide overflow
        title.style.textOverflow = 'ellipsis'; // Add ellipsis
        title.style.margin = '0'; // Remove default margin
        titleContainer.appendChild(title);
        
        // Add auth icons container
        const authContainer = document.createElement('div');
        authContainer.className = 'auth-icons-container';
        
        // Create tooltip container that will be dynamically positioned
        const tooltipContainer = document.createElement('div');
        tooltipContainer.className = 'tooltip-container';
        document.body.appendChild(tooltipContainer);
        
        // Add store auth icon if applicable
        if (establishment.store_auth) {
            const storeIcon = document.createElement('div');
            storeIcon.className = 'auth-icon store-auth-icon';
            
            const iconInner = document.createElement('div');
            iconInner.className = 'auth-icon-inner';
            iconInner.innerHTML = '<i class="fas fa-store"></i>';
            storeIcon.appendChild(iconInner);
            
            // Dynamic tooltip positioning - only for non-touch devices
            if (!('ontouchstart' in window)) {
                storeIcon.addEventListener('mouseenter', (e) => {
                    tooltipContainer.textContent = '此資訊由店家提供';
                    tooltipContainer.classList.add('visible');
                    
                    // Get position of the icon
                    const rect = storeIcon.getBoundingClientRect();
                    
                    // Position tooltip 10px below the icon and centered
                    tooltipContainer.style.left = (rect.left + rect.width/2 - tooltipContainer.offsetWidth/2) + 'px';
                    tooltipContainer.style.top = (rect.bottom + 10) + 'px';
                });
                
                storeIcon.addEventListener('mouseleave', () => {
                    tooltipContainer.classList.remove('visible');
                });
            }
            
            authContainer.appendChild(storeIcon);
        }
        
        // Add questionnaire auth icon if applicable
        if (establishment.question_auth) {
            const questionIcon = document.createElement('div');
            questionIcon.className = 'auth-icon question-auth-icon';
            
            const iconInner = document.createElement('div');
            iconInner.className = 'auth-icon-inner';
            iconInner.innerHTML = '<i class="fas fa-clipboard-list"></i>';
            questionIcon.appendChild(iconInner);
            
            // Dynamic tooltip positioning - only for non-touch devices
            if (!('ontouchstart' in window)) {
                questionIcon.addEventListener('mouseenter', (e) => {
                    tooltipContainer.textContent = '此資訊由問卷蒐集';
                    tooltipContainer.classList.add('visible');
                    
                    // Get position of the icon
                    const rect = questionIcon.getBoundingClientRect();
                    
                    // Position tooltip 10px below the icon and centered
                    tooltipContainer.style.left = (rect.left + rect.width/2 - tooltipContainer.offsetWidth/2) + 'px';
                    tooltipContainer.style.top = (rect.bottom + 10) + 'px';
                });
                
                questionIcon.addEventListener('mouseleave', () => {
                    tooltipContainer.classList.remove('visible');
                });
            }
            
            authContainer.appendChild(questionIcon);
        }
        
        titleContainer.appendChild(authContainer);
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
        
        // Get the satisfaction rating row and mark it as last (for CSS targeting)
        const satisfactionRow = createStarRatingRowWithUpdate('滿意度評分', establishment.滿意度評分, establishment.updates.滿意度評分, establishment.滿意度評分人數);
        satisfactionRow.className += ' last-info-row'; // Add class to target with CSS
        establishmentContent.appendChild(satisfactionRow);
        
        // Add 老闆的話 section - always add it, the function will handle empty case
        establishmentContent.appendChild(createOwnerMessageRow(establishment.老闆的話));
        
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
        
        // Footer for standards without color coding description
        const standardsFooter = document.createElement('div');
        standardsFooter.className = 'standards-footer';
        standardsFooter.innerHTML = '<span><i class="fas fa-info-circle"></i> 依據勞基法規定的基本標準</span>';
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
        
        // Special case for 勞健保 to show both icon and text
        if (label === '勞健保' && standardValue === "是 5人以上需保") {
            standardElement.innerHTML = `<span class="value-label">標準：</span><i class="fas fa-check-circle yes"></i> 5人以上需保`;
        }
        // Other string values
        else if (typeof standardValue === 'string') {
            standardElement.innerHTML = `<span class="value-label">標準：</span>${standardValue}`;
        } 
        // Boolean values
        else {
            standardElement.innerHTML = `<span class="value-label">標準：</span>${standardValue ? 
                '<i class="fas fa-check-circle yes"></i> 是' : 
                '<i class="fas fa-times-circle no"></i> 否'}`;
        }
        
        const establishmentElement = document.createElement('div');
        establishmentElement.className = 'establishment-value';
        
        // Special handling for 國定雙倍 with "放假" option
        if (typeof establishmentValue === 'string' && label === '國定雙倍') {
            establishmentElement.innerHTML = `<span class="value-label">店家：</span><i class="fas fa-calendar-alt holiday"></i> ${establishmentValue}`;
        } else {
            establishmentElement.innerHTML = `<span class="value-label">店家：</span>${establishmentValue ? 
                '<i class="fas fa-check-circle yes"></i> 是' : 
                '<i class="fas fa-times-circle no"></i> 否'}`;
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
    
    // Create a boolean row with icon and update time - enhanced to handle special values like "放假"
    function createBooleanRowWithUpdate(label, value, updateTime) {
        const row = document.createElement('div');
        row.className = 'info-row';
        
        const labelElement = document.createElement('div');
        labelElement.className = 'label';
        labelElement.textContent = label;
        
        const valueContainer = document.createElement('div');
        valueContainer.className = 'value';
        
        const valueElement = document.createElement('div');
        
        // Check if value is a string - special case for "國定雙倍" with "放假" option
        if (typeof value === 'string') {
            valueElement.className = 'boolean-value holiday';
            valueElement.innerHTML = '<i class="fas fa-calendar-alt holiday"></i> ' + value;
        } else {
            valueElement.className = 'boolean-value ' + (value ? 'yes' : 'no');
            valueElement.innerHTML = value ? 
                '<i class="fas fa-check-circle yes"></i> 是' : 
                '<i class="fas fa-times-circle no"></i> 否';
        }
        
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
    
    // Create a container for 老闆的話 - showing the actual value
    function createOwnerMessageRow(message) {
        // Create a wrapper with top border for separation
        const wrapper = document.createElement('div');
        wrapper.className = 'owner-message-wrapper';
        
        // Create the message container
        const messageContainer = document.createElement('div');
        messageContainer.className = 'owner-message-container';
        
        // Create the message element
        const messageElement = document.createElement('div');
        
        // Set message and styling
        if (message === "無店家留言") {
            messageElement.className = 'owner-message empty';
        } else {
            messageElement.className = 'owner-message';
        }
        messageElement.textContent = message;
        
        // Assemble the components
        messageContainer.appendChild(messageElement);
        wrapper.appendChild(messageContainer);
        
        return wrapper;
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