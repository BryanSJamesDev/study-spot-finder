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
