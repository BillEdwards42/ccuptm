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

// Define constants for map centering with different values for desktop and mobile
// Desktop coordinates (format is [latitude, longitude])
const DESKTOP_DEFAULT_VIEW = [23.5558, 120.4705]; 
const DESKTOP_DEFAULT_ZOOM = 17;

// Mobile coordinates - more zoomed out to show more on small screens
const MOBILE_DEFAULT_VIEW = [23.5558, 120.4705]; 
const MOBILE_DEFAULT_ZOOM = 17;

// Set default view based on device type - will be determined when map initializes
let DEFAULT_VIEW = DESKTOP_DEFAULT_VIEW;
let DEFAULT_ZOOM = DESKTOP_DEFAULT_ZOOM;

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
    
    // Set the default view based on device type
    const isMobile = isTouchDevice();
    if (isMobile) {
        DEFAULT_VIEW = MOBILE_DEFAULT_VIEW;
        DEFAULT_ZOOM = MOBILE_DEFAULT_ZOOM;
        console.log('Using mobile default view for job map:', DEFAULT_VIEW);
    } else {
        DEFAULT_VIEW = DESKTOP_DEFAULT_VIEW;
        DEFAULT_ZOOM = DESKTOP_DEFAULT_ZOOM;
        console.log('Using desktop default view for job map:', DEFAULT_VIEW);
    }
    
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
        tapTolerance: 15, 
        zoomSnap: 0.5,  
        wheelPxPerZoomLevel: 120, 
        
        // Custom settings
        fadeAnimation: true, 
        zoomAnimation: true, 
        markerZoomAnimation: true, 
        
        tapHold: isTouchDevice() 
    };
    
    if (isTouchDevice()) {
        mapInitConfig.bounceAtZoomLimits = false;
        mapInitConfig.inertiaDeceleration = 2000; 
        mapInitConfig.dragging = true;
        mapInitConfig.touchZoom = true;
        mapInitConfig.doubleClickZoom = true;
    }
    
    map = L.map('map', mapInitConfig).setView(
        mapState.center || DEFAULT_VIEW, 
        mapState.zoom || DEFAULT_ZOOM
    );
    
    tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO',
        maxZoom: 20,
        minZoom: 17, 
        subdomains: 'abcd'
    }).addTo(map);
    
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
    map.addLayer(window.markerClusterGroup);
    
    if (isTouchDevice()) {
        map.options.tap = true;
        map.options.tapTolerance = 40; 
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
    
    // State variables
    window.activeMarker = null; 
    window.mobilePopupActive = false; 
    window.establishments = []; 
    window.legalStandard = {}; // To be populated by loadEstablishmentsData

    setupEventListeners();
    setActiveNavLink(); // Though it does nothing, it's kept for potential future use
    setupInfoGuide();
}

// Helper function to save current map state
function saveMapState() {
    if (!map) return;
    try {
        mapState = {
            center: map.getCenter(),
            zoom: map.getZoom(),
            bounds: map.getBounds()
        };
        console.log('Job map state saved:', mapState);
    } catch (error) {
        console.error('Error saving job map state:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    window.resetView = function() {
        console.log('Job map reset view triggered');
        if (window.bottomSheetActive) closeBottomSheet();
        if (window.mobilePopupActive) closeMobilePopup();
        map.closePopup();
        forceCompleteGhostTouches();
        
        const delay = window.bottomSheetActive ? 350 : 50;
        setTimeout(() => {
            map.setView(DEFAULT_VIEW, DEFAULT_ZOOM, { animate: true, duration: 0.5 });
            setTimeout(() => { // Ensure redraw
                map.invalidateSize({reset: true, animate: false, pan: false});
                const center = map.getCenter();
                map.panBy([1, 1], { animate: false, duration: 0.1 });
                map.panBy([-1, -1], { animate: false, duration: 0.1 });
                console.log('Job map redrawn to prevent gray tile issue');
            }, 100);
            console.log('Job map view reset to default position');
        }, delay);
    };

    const resetViewBtn = document.getElementById('reset-view-btn');
    if (resetViewBtn) {
        resetViewBtn.removeEventListener('click', window.resetView); // Ensure no duplicates
        resetViewBtn.removeEventListener('touchend', window.resetView);
        const handleResetClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Reset view button activated for job map');
            window.resetView();
        };
        resetViewBtn.addEventListener('click', handleResetClick);
        resetViewBtn.addEventListener('touchend', handleResetClick);
    }
}

// Function to set up the info guide overlay
function setupInfoGuide() {
    const infoGuideBtn = document.getElementById('info-guide-btn');
    const infoGuideOverlay = document.getElementById('info-guide-overlay');
    const infoGuideClose = document.getElementById('info-guide-close');
    
    if (infoGuideBtn && infoGuideOverlay && infoGuideClose) {
        infoGuideBtn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            infoGuideOverlay.classList.add('active');
        });
        infoGuideClose.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            infoGuideOverlay.classList.remove('active');
        });
        infoGuideOverlay.addEventListener('click', function(e) {
            if (e.target === infoGuideOverlay) infoGuideOverlay.classList.remove('active');
        });
    }
}

// Function to load establishment data
function loadEstablishmentsData() {
    console.log('Starting to load establishment data from establishments.geojson...');
    if (window.markerClusterGroup) {
        window.markerClusterGroup.clearLayers();
        console.log("Cleared existing markers from cluster group for new data.");
    }
    window.originalMarkers = null;
    
    fetch('../src/data/establishments.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Establishments data loaded successfully:', data);
            if (!data || !data.features || data.features.length === 0) {
                console.warn('No establishment features found in loaded data.');
            }

            window.legalStandard = data.standard || {
                year: '2025', salary: 'NT$ 176/小時', 勞健保: "是 (5人以上強制)", 國定雙倍: true
            };
            console.log('Legal standards set to:', window.legalStandard);

            window.establishments = data.features.map(feature => {
                const props = feature.properties;
                const [lng, lat] = feature.geometry.coordinates;
                let hourlyWage = 0;
                if (props.salary) {
                    const match = props.salary.match(/(\d+)/);
                    if (match && match[1]) hourlyWage = parseInt(match[1]);
                }
                return {
                    name: props.name || "未命名店家",
                    position: [lat, lng],
                    icon: props.icon || 'briefcase',
                    salary: props.salary || '面議',
                    hourlyWage: hourlyWage,
                    供餐: props.供餐 || props.mealProvided || false,
                    試用期: props.試用期 || props.holidayPay || false, // Assuming holidayPay was a typo for probation period adjustment
                    勞健保: props.勞健保 || props.flexibleHours || false, // Assuming flexibleHours was a typo for insurance
                    國定雙倍: props.國定雙倍 || props.trainingProvided || false, // Assuming trainingProvided was a typo for holiday double pay
                    環境評分: props.環境評分 || props.environmentRating || 0,
                    滿意度評分: props.滿意度評分 || props.managementRating || 0,
                    環境評分人數: props.環境評分人數 || 0,
                    滿意度評分人數: props.滿意度評分人數 || 0,
                    勞工人數: props.勞工人數 || 0,
                    老闆的話: props.老闆的話 || "店家未提供說明。",
                    store_auth: props.store_auth || false,
                    question_auth: props.question_auth !== false, // Default to true if undefined
                    updates: props.updates || {}
                };
            });
            console.log(`Processed ${window.establishments.length} establishments.`);
            
            let labelContainer = document.getElementById('map-label-container');
            if (!labelContainer) {
                labelContainer = document.createElement('div');
                labelContainer.id = 'map-label-container';
                document.getElementById('map').appendChild(labelContainer);
            }
            addMapMarkers();
        })
        .catch(error => {
            console.error('Error loading establishments data:', error);
            setupDefaultEstablishments();
        });
}

// Function to setup default establishments if GeoJSON loading fails
function setupDefaultEstablishments() {
    window.legalStandard = { year: '2025', salary: 'NT$ 176/小時', 勞健保: true, 國定雙倍: true };
    window.establishments = [
        { name: "預設店家 A (資料載入失敗)", position: [23.560, 120.470], icon: 'store', salary: 'NT$ 180/小時', hourlyWage: 180, 供餐: true, 試用期: false, 勞健保: true, 國定雙倍: true, 環境評分: 3, 滿意度評分: 3, 環境評分人數: 1, 滿意度評分人數: 1, 勞工人數: 5, 老闆的話: "此為預設資料，實際店家資訊載入失敗。", store_auth: false, question_auth: true, updates: {}}
    ];
    console.warn('Using default establishments data due to fetch error.');
    addMapMarkers();
}

// Function to add map markers for establishments
function addMapMarkers() {
    if (!window.establishments || window.establishments.length === 0) {
        console.warn("No establishments data to create markers for job map.");
        return;
    }
    const markers = window.establishments.map(establishment => {
        try {
            if (!establishment.position || establishment.position.length < 2) {
                console.error("Missing coordinates in establishment:", establishment.name); return null;
            }
            const [lat, lng] = establishment.position;
            if (isNaN(lat) || isNaN(lng)) {
                console.error("Invalid coordinates for establishment:", establishment.name); return null;
            }

            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: `<div class="job-marker-icon"><i class="fas fa-${establishment.icon || 'briefcase'}"></i></div>`,
                    className: '', iconSize: [30, 30], iconAnchor: [15, 15]
                })
            });
            marker.establishmentData = establishment;

            marker.on('click', function() {
                if (isTouchDevice()) {
                    showMobilePopup(this);
                } else {
                    const popupContent = createEstablishmentPopup(this.establishmentData);
                    this.unbindPopup(); // Clear existing popups
                    this.bindPopup(popupContent, {
                        className: 'establishment-popup job-popup-wrapper', // Consistent class
                        maxWidth: 500, minWidth: 300, offset: [0, -15],
                        autoPan: true, closeButton: true, autoClose: true, closeOnEscapeKey: true,
                    }).openPopup();
                    setTimeout(setupPopupTabs, 10); // Ensure tabs are set up after popup DOM is ready
                }
            });
            return marker;
        } catch (error) {
            console.error("Error creating marker for establishment:", establishment.name, error);
            return null;
        }
    });

    const validMarkers = markers.filter(marker => marker !== null);
    console.log(`Created ${validMarkers.length} valid job markers out of ${window.establishments.length} establishments.`);

    if (window.markerClusterGroup) {
        window.markerClusterGroup.clearLayers();
        if (validMarkers.length > 0) {
            window.markerClusterGroup.addLayers(validMarkers);
            console.log("Job markers added to cluster group.");
        } else {
            console.warn("No valid job markers found to add to the map.");
        }
    }
    window.originalMarkers = validMarkers; // Save for filtering
}


// Function to create establishment popup content
function createEstablishmentPopup(establishmentData) {
    const popupContainer = document.createElement('div');
    popupContainer.className = 'establishment-popup job-popup-wrapper'; 
    
    const header = document.createElement('div');
    header.className = 'establishment-popup-header';
    header.innerHTML = `<h3>${establishmentData.name || '未命名的場所'}</h3>`;
    popupContainer.appendChild(header);
    
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'popup-tabs';
    tabsContainer.innerHTML = `
        <div class="popup-tab active" data-tab="job-details">職缺詳情</div>
        <div class="popup-tab" data-tab="company-ratings">店家評價</div>
        <div class="popup-tab" data-tab="employer-notes">老闆的話</div>
    `;
    popupContainer.appendChild(tabsContainer);
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'popup-content-wrapper';
    
    // Job Details Tab
    const jobDetailsContent = document.createElement('div');
    jobDetailsContent.className = 'establishment-popup-content active';
    jobDetailsContent.id = 'job-details-content';
    const jobInfoItems = [
        { label: '時薪', value: establishmentData.salary || '未提供', icon: 'money-bill-wave' },
        { label: '供餐', value: establishmentData.供餐 ? '是' : '否', icon: 'utensils' },
        { label: '試用期薪資', value: establishmentData.試用期 ? '詳情請洽雇主' : '無試用期薪資調整', icon: 'user-clock' },
        { label: '勞健保', value: establishmentData.勞健保 ? '依法投保' : '未提供', icon: 'shield-alt' },
        { label: '國定假日雙倍薪', value: establishmentData.國定雙倍 ? '是' : '否', icon: 'calendar-day' }
    ];
    const jobInfoGrid = document.createElement('div');
    jobInfoGrid.className = 'main-info-grid job-info-grid'; 
    jobInfoItems.forEach(item => {
        const infoItem = document.createElement('div');
        infoItem.className = 'main-info-item';
        infoItem.innerHTML = `<div class="label"><i class="fas fa-${item.icon}"></i> ${item.label}</div><div class="value">${item.value}</div>`;
        jobInfoGrid.appendChild(infoItem);
    });
    jobDetailsContent.appendChild(jobInfoGrid);
    contentWrapper.appendChild(jobDetailsContent);

    // Company Ratings Tab
    const companyRatingsContent = document.createElement('div');
    companyRatingsContent.className = 'establishment-popup-content';
    companyRatingsContent.id = 'company-ratings-content';
    const ratingsItems = [
        { label: '環境評分', value: `${establishmentData.環境評分 || 0} / 5 (${establishmentData.環境評分人數 || 0} 人評價)`, icon: 'store-alt' },
        { label: '工作滿意度', value: `${establishmentData.滿意度評分 || 0} / 5 (${establishmentData.滿意度評分人數 || 0} 人評價)`, icon: 'smile-beam' },
        { label: '預估勞工人數', value: establishmentData.勞工人數 ? `${establishmentData.勞工人數}人` : '未提供', icon: 'users' }
    ];
    const ratingsGrid = document.createElement('div');
    ratingsGrid.className = 'main-info-grid ratings-info-grid'; 
     ratingsItems.forEach(item => {
        const infoItem = document.createElement('div');
        infoItem.className = 'main-info-item';
        infoItem.innerHTML = `<div class="label"><i class="fas fa-${item.icon}"></i> ${item.label}</div><div class="value">${item.value}</div>`;
        ratingsGrid.appendChild(infoItem);
    });
    companyRatingsContent.appendChild(ratingsGrid);
    contentWrapper.appendChild(companyRatingsContent);

    // Employer Notes Tab
    const employerNotesContent = document.createElement('div');
    employerNotesContent.className = 'establishment-popup-content';
    employerNotesContent.id = 'employer-notes-content';
    const notesSection = document.createElement('div');
    notesSection.className = 'job-info-section'; 
    notesSection.innerHTML = `<h4>老闆的話</h4><p class="notes-content">${establishmentData.老闆的話 || '店家未提供說明。'}</p>`;
    employerNotesContent.appendChild(notesSection);
    contentWrapper.appendChild(employerNotesContent);
    
    popupContainer.appendChild(contentWrapper);
    return popupContainer;
}

// Function to handle popup tabs
function setupPopupTabs() {
    const tabs = document.querySelectorAll('.establishment-popup .popup-tab'); 
    if (!tabs.length) return;
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            const popup = this.closest('.establishment-popup'); 
            if (!popup) return;
            popup.querySelectorAll('.popup-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            popup.querySelectorAll('.establishment-popup-content').forEach(content => content.classList.remove('active'));
            const contentToShow = popup.querySelector(`#${tabId}-content`);
            if (contentToShow) contentToShow.classList.add('active');
        });
    });
}

// Function for mobile popup handling (bottom sheet)
function setupMobilePopup() {
    window.mobilePopupActive = false;
    window.bottomSheetActive = false; // Ensure this is also managed
    
    window.showMobilePopup = function(marker) {
        if (!marker || !marker.establishmentData) return;
        const establishmentData = marker.establishmentData;
        
        const bottomSheetContainer = document.getElementById('bottom-sheet-container');
        const bottomSheetContent = document.getElementById('bottom-sheet-content');
        if (!bottomSheetContainer || !bottomSheetContent) return;
        
        const mobileContent = document.createElement('div');
        mobileContent.className = 'bottom-sheet-establishment-content job-popup-wrapper'; 
        
        const header = document.createElement('div');
        header.className = 'bottom-sheet-header';
        header.innerHTML = `
            <div class="bottom-sheet-title-container">
                <h3 class="bottom-sheet-title">${establishmentData.name || '未命名的場所'}</h3>
            </div>
            <div class="bottom-sheet-close" id="bottom-sheet-close"><i class="fas fa-times"></i></div>`;
        mobileContent.appendChild(header);
        
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'popup-tabs';
        tabsContainer.innerHTML = `
            <div class="popup-tab active" data-tab="mobile-job-details">職缺詳情</div>
            <div class="popup-tab" data-tab="mobile-company-ratings">店家評價</div>
            <div class="popup-tab" data-tab="mobile-employer-notes">老闆的話</div>`;
        mobileContent.appendChild(tabsContainer);
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'popup-content-wrapper';
        
        // Mobile Job Details
        const jobDetailsContentMobile = document.createElement('div');
        jobDetailsContentMobile.className = 'establishment-popup-content active';
        jobDetailsContentMobile.id = 'mobile-job-details-content';
        const mobileJobInfoItems = [
            { label: '時薪', value: establishmentData.salary || '未提供', icon: 'money-bill-wave' },
            { label: '供餐', value: establishmentData.供餐 ? '是' : '否', icon: 'utensils' },
            { label: '試用期薪資', value: establishmentData.試用期 ? '詳情請洽雇主' : '無試用期薪資調整', icon: 'user-clock' },
            { label: '勞健保', value: establishmentData.勞健保 ? '依法投保' : '未提供', icon: 'shield-alt' },
            { label: '國定假日雙倍薪', value: establishmentData.國定雙倍 ? '是' : '否', icon: 'calendar-day' }
        ];
        mobileJobInfoItems.forEach(item => {
            const infoRow = document.createElement('div');
            infoRow.className = 'info-row'; 
            infoRow.innerHTML = `<div class="label"><i class="fas fa-${item.icon}"></i> ${item.label}</div><div class="value">${item.value}</div>`;
            jobDetailsContentMobile.appendChild(infoRow);
        });
        contentWrapper.appendChild(jobDetailsContentMobile);

        // Mobile Company Ratings
        const companyRatingsContentMobile = document.createElement('div');
        companyRatingsContentMobile.className = 'establishment-popup-content';
        companyRatingsContentMobile.id = 'mobile-company-ratings-content';
        const mobileRatingsItems = [
            { label: '環境評分', value: `${establishmentData.環境評分 || 0}/5 (${establishmentData.環境評分人數 || 0}人)`, icon: 'store-alt' },
            { label: '工作滿意度', value: `${establishmentData.滿意度評分 || 0}/5 (${establishmentData.滿意度評分人數 || 0}人)`, icon: 'smile-beam' },
            { label: '預估勞工人數', value: establishmentData.勞工人數 ? `${establishmentData.勞工人數}人` : '未提供', icon: 'users' }
        ];
        mobileRatingsItems.forEach(item => {
            const infoRow = document.createElement('div');
            infoRow.className = 'info-row';
            infoRow.innerHTML = `<div class="label"><i class="fas fa-${item.icon}"></i> ${item.label}</div><div class="value">${item.value}</div>`;
            companyRatingsContentMobile.appendChild(infoRow);
        });
        contentWrapper.appendChild(companyRatingsContentMobile);
        
        // Mobile Employer Notes
        const employerNotesContentMobile = document.createElement('div');
        employerNotesContentMobile.className = 'establishment-popup-content';
        employerNotesContentMobile.id = 'mobile-employer-notes-content';
        const notesRow = document.createElement('div');
        notesRow.className = 'info-row'; 
        notesRow.innerHTML = `<div class="label"><i class="fas fa-comment-dots"></i> 老闆的話</div><div class="notes-value">${establishmentData.老闆的話 || '店家未提供說明。'}</div>`;
        employerNotesContentMobile.appendChild(notesRow);
        contentWrapper.appendChild(employerNotesContentMobile);
        
        mobileContent.appendChild(contentWrapper);
        bottomSheetContent.innerHTML = '';
        bottomSheetContent.appendChild(mobileContent);
        
        setupMobilePopupTabs();
        
        bottomSheetContainer.classList.add('active');
        window.bottomSheetActive = true; // Set flag
        
        const closeBtn = document.getElementById('bottom-sheet-close');
        if (closeBtn) {
            closeBtn.removeEventListener('click', closeBottomSheet); // Prevent duplicate listeners
            closeBtn.addEventListener('click', closeBottomSheet);
        }
    };
    
    window.closeBottomSheet = function() {
        const bottomSheetContainer = document.getElementById('bottom-sheet-container');
        if (bottomSheetContainer) {
            bottomSheetContainer.classList.remove('active');
            window.bottomSheetActive = false; // Reset flag
            setTimeout(() => {
                const bottomSheetContent = document.getElementById('bottom-sheet-content');
                if (bottomSheetContent) bottomSheetContent.innerHTML = '';
                if (isTouchDevice() && map) {
                    map.invalidateSize({reset: true, animate: false, pan: false});
                    const center = map.getCenter();
                    map.panBy([1, 1], { animate: false, duration: 0.1 });
                    map.panBy([-1, -1], { animate: false, duration: 0.1 });
                    map.dragging.enable(); map.touchZoom.enable(); map.doubleClickZoom.enable();
                    if (map.tap) map.tap.enable();
                    forceCompleteGhostTouches();
                }
            }, 300);
        }
    };
    
    window.closeMobilePopup = function() { // Legacy/compatibility
        closeBottomSheet();
    };
}

// Function to handle mobile popup tabs
function setupMobilePopupTabs() {
    const tabs = document.querySelectorAll('.bottom-sheet-establishment-content .popup-tab');
    if (!tabs.length) return;
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            const popup = this.closest('.bottom-sheet-establishment-content');
            if (!popup) return;
            popup.querySelectorAll('.popup-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            popup.querySelectorAll('.establishment-popup-content').forEach(content => content.classList.remove('active'));
            const contentToShow = popup.querySelector(`#${tabId}-content`);
            if (contentToShow) contentToShow.classList.add('active');
        });
    });
}

// Setup global event listeners and initializations
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired for job map.');
    window._bottomSheetWasRecentlyActive = false;
    window._mobilePopupWasRecentlyActive = false;
    window._infoGuideWasRecentlyActive = false;
    
    initializeMap();
    setupInfoGuide();
    loadEstablishmentsData(); 
    setupMobilePopup();
    
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            openSearchModal(); 
        });
    }
});

// Search functionality
function openSearchModal() {
    console.log('Opening establishment search modal.');
    const existingModal = document.getElementById('search-modal-overlay');
    if (existingModal) {
        if (window.originalMarkers) clearFilters(); 
        resetEstablishmentSearch(false); // Reset form without clearing map yet
        existingModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'search-modal-overlay';
    overlay.id = 'search-modal-overlay';
    const container = document.createElement('div');
    container.className = 'search-modal-container job-search-modal'; 
    
    const header = document.createElement('div');
    header.className = 'search-modal-header';
    const title = document.createElement('h3');
    title.textContent = '搜尋職缺';
    const closeButton = document.createElement('button');
    closeButton.className = 'search-modal-close';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.addEventListener('click', closeSearchModal);
    header.appendChild(title);
    header.appendChild(closeButton);
    
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
    nameInput.placeholder = '輸入店家名稱關鍵字...';
    nameInput.className = 'search-input';
    nameInput.id = 'establishment-name-search';
    nameSection.appendChild(nameLabel);
    nameSection.appendChild(nameInput);
    
    // Salary range slider section
    const salarySection = document.createElement('div');
    salarySection.className = 'search-section';
    const salaryLabelElement = document.createElement('div'); 
    salaryLabelElement.className = 'search-label';
    salaryLabelElement.textContent = '時薪範圍 (NT$)';
    const salaryRangeContainer = document.createElement('div');
    salaryRangeContainer.className = 'range-container';
    const salaryRange = document.createElement('div');
    salaryRange.className = 'range-slider';
    const minSalary = document.createElement('input');
    minSalary.type = 'range'; minSalary.min = '170'; minSalary.max = '300'; minSalary.value = '170'; minSalary.id = 'min-salary';
    const maxSalary = document.createElement('input');
    maxSalary.type = 'range'; maxSalary.min = '170'; maxSalary.max = '300'; maxSalary.value = '300'; maxSalary.id = 'max-salary';
    const salaryDisplay = document.createElement('div');
    salaryDisplay.className = 'range-display';
    salaryDisplay.innerHTML = `<span id="min-salary-display">170</span> - <span id="max-salary-display">300</span> 元`;
    minSalary.addEventListener('input', updateSalaryRange); 
    maxSalary.addEventListener('input', updateSalaryRange); 
    salaryRange.appendChild(minSalary); salaryRange.appendChild(maxSalary);
    salaryRangeContainer.appendChild(salaryRange); salaryRangeContainer.appendChild(salaryDisplay);
    salarySection.appendChild(salaryLabelElement); salarySection.appendChild(salaryRangeContainer);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'search-button-container';
    const applyButton = document.createElement('button');
    applyButton.className = 'search-apply-button'; applyButton.textContent = '套用篩選';
    applyButton.addEventListener('click', applyEstablishmentSearch); 
    const resetButton = document.createElement('button');
    resetButton.className = 'search-reset-button'; resetButton.textContent = '清除重置';
    resetButton.addEventListener('click', () => resetEstablishmentSearch(true)); // Pass true to clear map
    buttonContainer.appendChild(resetButton); buttonContainer.appendChild(applyButton);
    
    content.appendChild(nameSection); content.appendChild(salarySection); content.appendChild(buttonContainer);
    container.appendChild(header); container.appendChild(content);
    overlay.appendChild(container); document.body.appendChild(overlay);
    
    setTimeout(() => overlay.classList.add('active'), 10);
    document.body.style.overflow = 'hidden';
    updateSalaryRange(); // Initialize display
}

function closeSearchModal() {
    const overlay = document.getElementById('search-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function updateSalaryRange() {
    const minSalaryInput = document.getElementById('min-salary');
    const maxSalaryInput = document.getElementById('max-salary');
    const minDisplay = document.getElementById('min-salary-display');
    const maxDisplay = document.getElementById('max-salary-display');
    
    if (parseInt(minSalaryInput.value) > parseInt(maxSalaryInput.value)) {
        minSalaryInput.value = maxSalaryInput.value; 
    }
    minDisplay.textContent = minSalaryInput.value;
    maxDisplay.textContent = maxSalaryInput.value;
}

function resetEstablishmentSearch(clearMap = true) {
    const nameInput = document.getElementById('establishment-name-search');
    if (nameInput) nameInput.value = '';
    const minSalaryInput = document.getElementById('min-salary');
    const maxSalaryInput = document.getElementById('max-salary');
    if (minSalaryInput) minSalaryInput.value = '170'; 
    if (maxSalaryInput) maxSalaryInput.value = '300'; 
    updateSalaryRange(); 
    if (clearMap) {
        clearFilters(); 
    }
    console.log('Establishment search form reset.');
}

function applyEstablishmentSearch() {
    const nameInput = document.getElementById('establishment-name-search');
    const minSalaryInput = document.getElementById('min-salary');
    const maxSalaryInput = document.getElementById('max-salary');
    const searchParams = {
        name: nameInput ? nameInput.value.trim().toLowerCase() : '',
        salary: {
            min: minSalaryInput ? parseInt(minSalaryInput.value) : 170,
            max: maxSalaryInput ? parseInt(maxSalaryInput.value) : 300
        }
    };
    console.log('Applying establishment search with params:', searchParams);
    filterEstablishments(searchParams); 
    closeSearchModal();
    showClearFiltersButton();
}

// Filter establishments based on search parameters
function filterEstablishments(params) {
    console.log('Filtering establishments with params:', params);
    const hasNameFilter = params.name !== '';
    const hasSalaryFilter = params.salary.min > 170 || params.salary.max < 300; 

    if (!hasNameFilter && !hasSalaryFilter) {
        console.log('No specific filters applied - showing all establishments.');
        if (window.originalMarkers) clearFilters(); 
        return;
    }
    
    if (!window.originalMarkers && window.markerClusterGroup) {
        console.log('Saving original markers for filtering.');
        window.originalMarkers = window.markerClusterGroup.getLayers();
    }
    
    const filteredMarkers = [];
    if (window.originalMarkers) {
        window.originalMarkers.forEach(marker => {
            const establishment = marker.establishmentData;
            if (!establishment) return;
            let nameMatch = true;
            if (hasNameFilter) nameMatch = establishment.name.toLowerCase().includes(params.name);
            let salaryMatch = true;
            if (hasSalaryFilter) {
                const hourlyWage = establishment.hourlyWage || 0; 
                salaryMatch = hourlyWage >= params.salary.min && hourlyWage <= params.salary.max;
            }
            if (nameMatch && salaryMatch) filteredMarkers.push(marker);
        });
    }
    console.log(`Filtered markers count for job map: ${filteredMarkers.length}`);
    updateMapMarkers(filteredMarkers);
}

function updateMapMarkers(filteredMarkers) {
    if (window.markerClusterGroup) {
        window.markerClusterGroup.clearLayers();
        window.markerClusterGroup.addLayers(filteredMarkers);
        if (filteredMarkers.length > 0) {
            const group = L.featureGroup(filteredMarkers);
            try { // Add try-catch for getBounds if group is empty or invalid
                map.fitBounds(group.getBounds().pad(0.2));
            } catch (e) {
                console.warn("Could not fit bounds for filtered markers:", e);
                map.setView(DEFAULT_VIEW, DEFAULT_ZOOM); // Fallback to default view
            }
        } else {
             map.setView(DEFAULT_VIEW, DEFAULT_ZOOM); // No markers, reset to default
        }
        if (window.clearFiltersButton) {
            const countBadge = window.clearFiltersButton.querySelector('.filter-count');
            if (countBadge) countBadge.textContent = filteredMarkers.length;
        }
    }
}

function showClearFiltersButton() {
    if (window.clearFiltersButton) { // Remove if already exists to prevent duplicates
        document.body.removeChild(window.clearFiltersButton);
        window.clearFiltersButton = null;
    }
    const button = document.createElement('div');
    button.className = 'clear-filters-button';
    const countBadge = document.createElement('span');
    countBadge.className = 'filter-count';
    countBadge.textContent = window.markerClusterGroup ? window.markerClusterGroup.getLayers().length : '0';
    const buttonText = document.createElement('span');
    buttonText.textContent = '清除篩選';
    button.appendChild(countBadge); button.appendChild(buttonText);
    button.addEventListener('click', clearFilters);
    button.addEventListener('touchend', clearFilters); // For touch devices
    document.body.appendChild(button);
    window.clearFiltersButton = button;
}

function clearFilters() {
    console.log('Clearing all job filters.');
    if (window.originalMarkers && window.markerClusterGroup) {
        try {
            window.markerClusterGroup.clearLayers();
            window.markerClusterGroup.addLayers(window.originalMarkers);
            console.log('Restored original job markers.');
        } catch (e) {
            console.error('Error restoring job markers:', e);
            if (typeof loadEstablishmentsData === 'function') loadEstablishmentsData();
        }
    } else {
        if (typeof loadEstablishmentsData === 'function') loadEstablishmentsData();
    }
    if (window.clearFiltersButton) {
        document.body.removeChild(window.clearFiltersButton);
        window.clearFiltersButton = null;
    }
    window.originalMarkers = null; // Important: reset this
    if (map) map.setView(DEFAULT_VIEW, DEFAULT_ZOOM, { animate: true, duration: 0.5 });
    console.log('Job filters cleared.');
}
