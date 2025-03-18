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

// Setup global info guide popup for all pages
document.addEventListener('DOMContentLoaded', () => {
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
                
                // Remove the active class from info-guide-btn
                document.querySelectorAll('.navbar-links a').forEach(link => {
                    if (link.id === 'info-guide-btn') {
                        link.classList.remove('active');
                    }
                });
                
                // Restore the correct active state
                setActiveState();
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
                
                // Remove the active class from info-guide-btn
                document.querySelectorAll('.navbar-links a').forEach(link => {
                    if (link.id === 'info-guide-btn') {
                        link.classList.remove('active');
                    }
                });
                
                // Restore the correct active state
                setActiveState();
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
                
                // Remove the active class from info-guide-btn
                document.querySelectorAll('.navbar-links a').forEach(link => {
                    if (link.id === 'info-guide-btn') {
                        link.classList.remove('active');
                    }
                });
                
                // Restore the correct active state
                setActiveState();
            }
        }
    });

    // Only initialize map if on map page
    if (document.getElementById('map')) {
        initializeMap();
    }
});

// Initialize map and related functionality
function initializeMap() {
    // Create map with configuration - add back minZoom constraint
    const map = L.map('map', {
        attributionControl: false,
        zoomControl: false,
        minZoom: 17,
        maxZoom: 20
    }).setView([23.5558, 120.4705], 17);
    
    // Add tile layer with CartoDB Voyager style - add back minZoom constraint
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO',
        maxZoom: 20,
        minZoom: 17,
        subdomains: 'abcd'
    }).addTo(map);
    
    // State variables
    let activeMarker = null;
    let mobilePopupActive = false;
    let establishments = [];
    let markerClusterGroup = L.markerClusterGroup({
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
                establishments = data.features.map(feature => {
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
        establishments = [
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
        // Clear any existing markers first
        markerClusterGroup.clearLayers();
        
        establishments.forEach(establishment => {
            // Create marker HTML elements
            const markerIcon = document.createElement('div');
            markerIcon.className = 'marker-icon';
            markerIcon.innerHTML = `<i class="fas fa-${establishment.icon}"></i>`;
            
            const markerLabel = document.createElement('div');
            markerLabel.className = 'marker-label';
            markerLabel.textContent = establishment.name;
            
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
        if (!marker || !marker.establishment) return;
        
        const overlay = document.querySelector('.mobile-popup-overlay');
        const container = document.querySelector('.mobile-popup-container');
        
        if (!overlay || !container) {
            setupMobilePopup();
            return showMobilePopup(marker);
        }
        
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
        
        mobilePopupActive = true;
    }
    
    // Close mobile popup
    function closeMobilePopup() {
        const overlay = document.querySelector('.mobile-popup-overlay');
        const container = document.querySelector('.mobile-popup-container');
        
        if (!overlay || !container) return;
        
        overlay.classList.remove('active');
        container.classList.remove('active');
        
        mobilePopupActive = false;
        activeMarker = null;
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