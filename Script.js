// Coordinates of the Kaaba, Mecca
const QIBLA_LAT = 21.4225;
const QIBLA_LONG = 39.8262;

let userLatitude = null;
let userLongitude = null;
let qiblaAngle = null;

// Get DOM elements
const compassRose = document.getElementById('compassRose');
const needle = document.getElementById('needle');
const statusText = document.getElementById('status');
const angleDisplay = document.getElementById('angle');
const headingDisplay = document.getElementById('heading');
const permissionButton = document.getElementById('permissionButton');

// Function to calculate the Qibla bearing
function calculateQiblaAngle(lat, long) {
  const phiK = QIBLA_LAT * Math.PI / 180.0;
  const lambdaK = QIBLA_LONG * Math.PI / 180.0;
  const phi = lat * Math.PI / 180.0;
  const lambda = long * Math.PI / 180.0;

  const psi = 180.0 / Math.PI * Math.atan2(
    Math.sin(lambdaK - lambda),
    (Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda))
  );
  return (psi + 360) % 360;
}

function geoSuccess(position) {
  userLatitude = position.coords.latitude;
  userLongitude = position.coords.longitude;
  statusText.textContent = "Location found! Calculating Qibla...";

  qiblaAngle = calculateQiblaAngle(userLatitude, userLongitude);
  angleDisplay.textContent = qiblaAngle.toFixed(1) + '°';
  statusText.textContent = "Point your device towards the Qibla!";
  
  // Now that we have location, request device orientation
  requestDeviceOrientation();
}

function geoError(error) {
  console.error('Error getting location', error);
  statusText.textContent = "Error: " + error.message + ". Please enable GPS.";
}

// **NEW FUNCTION: Specifically request device orientation**
function requestDeviceOrientation() {
  // Check if the API is actually available
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    // This is the iOS 13+ way of doing it
    DeviceOrientationEvent.requestPermission()
      .then(permissionState => {
        if (permissionState === 'granted') {
          window.addEventListener('deviceorientation', deviceOrientationHandler);
          statusText.textContent = "Compass activated!";
        } else {
          statusText.textContent = "Permission not granted.";
        }
      })
      .catch(console.error);
  } else if (window.DeviceOrientationEvent) {
    // For non-iOS browsers (Android/Chrome). They often don't need a permission prompt.
    window.addEventListener('deviceorientation', deviceOrientationHandler);
    statusText.textContent = "Compass activated!";
  } else {
    statusText.textContent = "Device Orientation not supported on your browser.";
  }
}

function deviceOrientationHandler(event) {
  let compassHeading;

  // Handle iOS Non-Standard Way
  if (event.webkitCompassHeading) {
    compassHeading = event.webkitCompassHeading;
  }
  // Standard way for most other browsers
  else if (event.alpha !== null) {
    compassHeading = 360 - event.alpha; // Convert to standard 0-360
  }

  if (compassHeading === undefined || compassHeading === null) {
    statusText.textContent = "Compass not available. Move phone in a figure-8.";
    return;
  }

  headingDisplay.textContent = compassHeading.toFixed(1) + '°';
  // Rotate the ROSE, not the needle
  compassRose.style.transform = `rotate(${-compassHeading}deg)`;
}

// **START THE PROCESS ON BUTTON CLICK**
permissionButton.addEventListener('click', function() {
  statusText.textContent = "Requesting location...";
  // First, get location. After that, it will request device orientation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(geoSuccess, geoError, { enableHighAccuracy: true });
  } else {
    statusText.textContent = "Geolocation not supported.";
  }
});