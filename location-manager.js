// location-manager.js - Revised secure version
class LocationManager {
    constructor() {
        this.userLocation = null;
        this.STORAGE_KEY = 'userLocationData';
        this.MAX_AGE = 30 * 60 * 1000; // 30 minutes
    }

    // Get location - now only uses local storage or geolocation
    async getLocation() {
        // 1. Check sessionStorage for recent location (never from URL params)
        const stored = this.getStoredLocation();
        if (stored) {
            this.userLocation = stored;
            
            // If we don't have city/country info, try to get it
            if (!this.userLocation.city || !this.userLocation.country) {
                await this.getReverseGeocoding();
            }
            
            return this.userLocation;
        }

        // 2. Get fresh location (no URL parameter fallback)
        return await this.detectFreshLocation();
    }

    async detectFreshLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        timestamp: Date.now(),
                        city: null,
                        country: null
                    };
                    
                    // Get city/country information
                    await this.getReverseGeocoding();
                    
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

    async getReverseGeocoding() {
        if (!this.userLocation) return;
        
        try {
            const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${this.userLocation.lat}&longitude=${this.userLocation.lng}&localityLanguage=en`
            );
            const data = await response.json();

            this.userLocation.city = data.city || data.locality || 'Unknown';
            this.userLocation.country = data.countryName || 'Unknown';
            
            // Update storage with new info
            this.saveLocation();
        } catch (error) {
            console.error('Error getting location details:', error);
            this.userLocation.city = 'Unknown';
            this.userLocation.country = 'Unknown';
        }
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

    // REMOVED: getLocationURLParams() method entirely
    // We don't want to pass location via URLs
}

// Global instance
window.locationManager = new LocationManager();

