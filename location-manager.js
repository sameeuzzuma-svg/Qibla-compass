// location-manager.js - Include this on every page
class LocationManager {
    constructor() {
        this.userLocation = null;
        this.STORAGE_KEY = 'userLocationData';
        this.MAX_AGE = 30 * 60 * 1000; // 30 minutes
    }

    // Get location from URL, sessionStorage, or geolocation
    async getLocation() {
        // 1. Check URL parameters first (if coming from another page)
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');
        
        if (lat && lng) {
            this.userLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
            this.saveLocation();
            return this.userLocation;
        }

        // 2. Check sessionStorage for recent location
        const stored = this.getStoredLocation();
        if (stored) {
            this.userLocation = stored;
            return this.userLocation;
        }

        // 3. Get fresh location
        return await this.detectFreshLocation();
    }

    async detectFreshLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        timestamp: Date.now()
                    };
                    this.saveLocation();
                    resolve(this.userLocation);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: this.MAX_AGE
                }
            );
        });
    }

    getStoredLocation() {
        try {
            const stored = sessionStorage.getItem(this.STORAGE_KEY);
            if (!stored) return null;

            const data = JSON.parse(stored);
            const isFresh = Date.now() - data.timestamp < this.MAX_AGE;
            
            return isFresh ? data : null;
        } catch {
            return null;
        }
    }

    saveLocation() {
        if (this.userLocation) {
            this.userLocation.timestamp = Date.now();
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userLocation));
        }
    }

    clearLocation() {
        sessionStorage.removeItem(this.STORAGE_KEY);
        this.userLocation = null;
    }

    // Method to use when navigating to other pages
    getLocationURLParams() {
        if (!this.userLocation) return '';
        return `?lat=${this.userLocation.lat}&lng=${this.userLocation.lng}`;
    }
}

// Global instance
window.locationManager = new LocationManager();

// Navigation helper function
function addLocationToLink(link) {
    if (window.locationManager && window.locationManager.userLocation) {
        const url = new URL(link.href);
        url.searchParams.set('lat', window.locationManager.userLocation.lat);
        url.searchParams.set('lng', window.locationManager.userLocation.lng);
        link.href = url.toString();
    }
    return true;
}
