// Location Manager for Prayer Times Application
// Handles geolocation, reverse geocoding, and location data management

window.locationManager = (function() {
    let currentLocationData = null;
    
    // Configuration
    const GEOLOCATION_OPTIONS = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
    };

    // Get current location using browser geolocation API
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser.'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    let errorMessage = '';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access denied by user.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out.';
                            break;
                        default:
                            errorMessage = 'An unknown error occurred while retrieving location.';
                            break;
                    }
                    reject(new Error(errorMessage));
                },
                GEOLOCATION_OPTIONS
            );
        });
    }

    // Reverse geocoding to get location details
    async function reverseGeocode(latitude, longitude) {
        try {
            // Using OpenStreetMap Nominatim API for reverse geocoding
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch location details');
            }
            
            const data = await response.json();
            
            return {
                city: data.address?.city || 
                      data.address?.town || 
                      data.address?.village || 
                      data.address?.county || 
                      'Unknown City',
                country: data.address?.country || 'Unknown Country',
                state: data.address?.state || '',
                postcode: data.address?.postcode || '',
                displayName: data.display_name || 'Unknown Location'
            };
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            // Return fallback data
            return {
                city: 'Unknown City',
                country: 'Unknown Country',
                state: '',
                postcode: '',
                displayName: 'Unknown Location'
            };
        }
    }

    // Get location with full details
    async function getLocation(forceRefresh = false) {
        try {
            // Check if we have cached location data and don't need to refresh
            if (currentLocationData && !forceRefresh) {
                return currentLocationData;
            }

            // Show loading state
            updateLoadingState(true);

            // Get coordinates
            const coordinates = await getCurrentPosition();
            
            // Get location details
            const locationDetails = await reverseGeocode(coordinates.latitude, coordinates.longitude);
            
            // Combine data
            currentLocationData = {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                accuracy: coordinates.accuracy,
                city: locationDetails.city,
                country: locationDetails.country,
                state: locationDetails.state,
                postcode: locationDetails.postcode,
                displayName: locationDetails.displayName,
                timestamp: new Date().toISOString()
            };

            // Store in global scope for prayer times script
            window.locationData = currentLocationData;

            // Update UI
            updateLocationDisplay();
            updateLoadingState(false);
            
            return currentLocationData;
            
        } catch (error) {
            console.error('Location error:', error);
            updateLoadingState(false);
            throw error;
        }
    }

    // Update loading state in UI
    function updateLoadingState(isLoading) {
        const loadingElement = document.getElementById('prayer-loading');
        const errorElement = document.getElementById('prayer-error');
        
        if (isLoading) {
            if (loadingElement) loadingElement.classList.remove('d-none');
            if (errorElement) errorElement.classList.add('d-none');
        } else {
            if (loadingElement) loadingElement.classList.add('d-none');
        }
    }

    // Update location display in UI
    function updateLocationDisplay() {
        if (!currentLocationData) return;

        // Update location card elements
        const cityElement = document.getElementById('prayer-city');
        const countryElement = document.getElementById('prayer-country');
        const coordinatesElement = document.getElementById('prayer-coordinates');

        if (cityElement) {
            cityElement.textContent = currentLocationData.city;
        }
        
        if (countryElement) {
            countryElement.textContent = currentLocationData.country;
        }
        
        if (coordinatesElement) {
            coordinatesElement.textContent = 
                `${currentLocationData.latitude.toFixed(4)}, ${currentLocationData.longitude.toFixed(4)}`;
        }
    }

    // Request location permission with user-friendly messaging
    function requestLocationPermission() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser.'));
                return;
            }

            // Check current permission state
            if (navigator.permissions) {
                navigator.permissions.query({name: 'geolocation'}).then((result) => {
                    if (result.state === 'granted') {
                        resolve(true);
                    } else if (result.state === 'denied') {
                        reject(new Error('Location permission was denied. Please enable location access in your browser settings.'));
                    } else {
                        // Prompt user for permission
                        getLocation().then(() => resolve(true)).catch(reject);
                    }
                });
            } else {
                // Fallback for browsers without permissions API
                getLocation().then(() => resolve(true)).catch(reject);
            }
        });
    }

    // Initialize location manager
    function init() {
        console.log('Location Manager initialized');
        
        // Try to get location on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                getLocation().catch((error) => {
                    console.error('Initial location fetch failed:', error);
                    showLocationError(error.message);
                });
            });
        } else {
            getLocation().catch((error) => {
                console.error('Initial location fetch failed:', error);
                showLocationError(error.message);
            });
        }
    }

    // Show location error in UI
    function showLocationError(message) {
        const errorElement = document.getElementById('prayer-error');
        if (errorElement) {
            errorElement.classList.remove('d-none');
            const messageElement = errorElement.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message || 'Please allow location access to view accurate prayer times for your area.';
            }
        }
    }

    // Public API
    return {
        getLocation,
        getCurrentPosition,
        reverseGeocode,
        requestLocationPermission,
        getCurrentLocationData: () => currentLocationData,
        init
    };
})();

// Auto-initialize when script loads
window.locationManager.init();

// Global function for refresh button (used by HTML)
window.getCurrentLocation = function() {
    window.locationManager.getLocation(true).catch((error) => {
        console.error('Location refresh failed:', error);
        window.locationManager.showLocationError && window.locationManager.showLocationError(error.message);
    });
};

// Global function for adding location to links (used by navbar)
window.addLocationToLink = function(linkElement) {
    const locationData = window.locationManager.getCurrentLocationData();
    if (locationData && linkElement.href) {
        const url = new URL(linkElement.href, window.location.origin);
        url.searchParams.set('lat', locationData.latitude);
        url.searchParams.set('lng', locationData.longitude);
        linkElement.href = url.toString();
    }
    return true;
};
