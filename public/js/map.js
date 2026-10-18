/* global L */
// Center of Northeastern's campus
const CAMPUS_CENTER = [42.3385, -71.089];

// Corners of the campus box, matching CAMPUS_BOUNDS in routes/spots.js
const CAMPUS_CORNERS = [
  [42.333, -71.096],
  [42.344, -71.083],
];

// Map and markers to remember between function calls
let map = null;
let markers = null;

// The pin showing the location picked for the form
let selectedMarker = null;

/** A function that creates the map once */
export function initMap() {
  // Don't create the map more than once
  if (map !== null) {
    return;
  }

  // Create the map centered on campus
  map = L.map("map").setView(CAMPUS_CENTER, 16);

  // Add OpenStreetMap tiles and required attribution
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Keep the map within the campus area
  map.setMaxBounds(L.latLngBounds(CAMPUS_CORNERS).pad(0.2));

  // Create a group to hold the map pins
  markers = L.layerGroup().addTo(map);
}

/** A function that displays spots with valid coordinates on the map */
export function showSpotsOnMap(spots) {
  // Return if the map or markers were not initialized
  if (markers === null) {
    return;
  }

  // Remove the old pins before displaying the updated spots
  markers.clearLayers();

  // Add a pin for each spot with valid coordinates
  for (const spot of spots) {
    if (typeof spot.lat !== "number" || typeof spot.lng !== "number") {
      continue;
    }

    // Use textContent to safely display the spot name in the popup
    const label = document.createElement("strong");
    label.textContent = spot.name;

    // Add the pin and its popup to the map
    L.marker([spot.lat, spot.lng]).bindPopup(label).addTo(markers);
  }
}

/** A function that runs when someone clicks the map */
export function onMapClick(callback) {
  // Return if the map has not been initialized
  if (map === null) {
    return;
  }

  // Pass the clicked latitude and longitude to the callback
  map.on("click", (event) => callback(event.latlng.lat, event.latlng.lng));
}

/** A function that shows the selected location for the form */
export function showSelectedLocation(lat, lng) {
  // Return if the map has not been initialized
  if (map === null) {
    return;
  }

  // Remove the previous selected location pin
  if (selectedMarker !== null) {
    selectedMarker.remove();
  }

  // Add a red circle to mark the selected location
  selectedMarker = L.circleMarker([lat, lng], {
    radius: 10,
    color: "#b42332",
  }).addTo(map);
}

/** A function that clears the selected location pin */
export function clearSelectedLocation() {
  // Remove the selected location pin if one exists
  if (selectedMarker !== null) {
    selectedMarker.remove();
  }

  // Reset the selected marker
  selectedMarker = null;
}
