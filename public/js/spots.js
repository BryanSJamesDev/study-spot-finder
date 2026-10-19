import {
  formatClosingTime,
  getSpotTags,
  parseTags,
  filterSpots,
  formatMatchReasons,
} from "./spotUtils.js";

import {
  initMap,
  showSpotsOnMap,
  onMapClick,
  showSelectedLocation,
  clearSelectedLocation,
} from "./map.js";

/** Global variables */
// The ID of the spot being edited, or null when adding a new spot
let editingId = null;

// Every spot from the database, before filtering
let allSpots = [];

// The location picked on the map for the form, or null if none
let selectedLocation = null;

/** Sets the picked location on the map and updates the UI */
function setLocation(lat, lng) {
  selectedLocation = {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
  showSelectedLocation(selectedLocation.lat, selectedLocation.lng);
  document.querySelector("#spot-location-text").textContent =
    "Location set. Click the map again to move it.";
  document.querySelector("#location-clear").hidden = false;
}

/** Resets the picked location and UI back to default */
function clearLocation() {
  selectedLocation = null;
  clearSelectedLocation();
  document.querySelector("#spot-location-text").textContent =
    "Click the map to set this spot's location.";
  document.querySelector("#location-clear").hidden = true;
}

/* Helper function to load spots */
async function loadSpots() {
  // Load spots
  const res = await fetch("/api/spots");

  // If failure to load spots throw error
  if (!res.ok) {
    throw new Error("Failed to load spots");
  }

  return await res.json();
}

/** Reads the current filter form values */
function getFilters() {
  // Read the filter fields
  const data = new FormData(document.querySelector("#filter-form"));

  // Return the filter values
  return {
    search: data.get("search"),
    noiseLevel: data.get("noiseLevel"),
    outlets: data.get("outlets") === "on",
    wifi: data.get("wifi") === "on",
    tag: data.get("tag"),
  };
}

/** Filters and displays the matching spots */
function applyFilters() {
  // Find the spots that match the filters
  const matches = filterSpots(allSpots, getFilters());

  // Show them as cards and as pins on the map
  renderSpots(matches);
  showSpotsOnMap(matches);
}

/** Reloads spots and applies the current filters */
async function refreshSpots() {
  // Load every spot from the database
  allSpots = await loadSpots();

  // Display only the spots that match the filters
  applyFilters();
}

/* Starts the page */
async function init() {
  // Create the map, but keep the page working if Leaflet fails to load
  try {
    initMap();
    onMapClick(setLocation);
  } catch (error) {
    console.error("Failed to load the map", error);
  }

  // Load and display the spots
  try {
    await refreshSpots();
  } catch (error) {
    // Log the error and display a message
    console.error("Failed to load spots", error);
    const list = document.querySelector("#spot-list");
    list.replaceChildren();

    const message = document.createElement("p");
    message.className = "text-muted";
    message.textContent = "Couldn't load spots. Please refresh.";
    list.append(message);
  }

  // Adds event listener for a submission of a form whether its enter or a click
  document.querySelector("#spot-form").addEventListener("submit", handleSubmit);

  // Adds event listener for the cancel button
  document.querySelector("#form-cancel").addEventListener("click", stopEditing);

  // Adds event listener for clearing the picked map location
  document
    .querySelector("#location-clear")
    .addEventListener("click", clearLocation);

  // Re-filter the spots whenever a filter changes
  const filterForm = document.querySelector("#filter-form");
  filterForm.addEventListener("input", applyFilters);
  filterForm.addEventListener("reset", () => setTimeout(applyFilters));
}

/** Creates a card and returns it */
function createSpotCard(spot) {
  // Create the card
  const card = document.createElement("article");
  card.className = "card";

  // Give the card an ID so other cards can link to it
  card.id = `spot-${spot._id}`;

  // Create the spot title
  const title = document.createElement("h3");
  title.className = "card__title";
  title.textContent = spot.name;

  // Create the building information
  const building = document.createElement("p");
  building.className = "card__meta";
  building.textContent = spot.building;

  // Create the noise level and closing time information
  const details = document.createElement("p");
  details.className = "card__meta";
  details.textContent = `${spot.noiseLevel} · Closing time: ${formatClosingTime(spot.closingTime)}`;

  // Get the tags
  const tags = getSpotTags(spot);

  // Create a container for the tag pills
  const tagList = document.createElement("div");
  tagList.className = "card__tags";

  // Loop through tags and create a pill for each one
  for (const tag of tags) {
    const pill = document.createElement("span");
    pill.className = "tag";
    pill.textContent = tag;
    tagList.append(pill);
  }

  // Add all three elements to the card
  card.append(title, building, details);

  // Add the tag container only if there are tags
  if (tags.length > 0) {
    card.append(tagList);
  }

  // Create a hidden area to show similar spots
  const similar = document.createElement("div");
  similar.className = "card__similar";
  similar.hidden = true;

  // Create a container for the card's buttons
  const actions = document.createElement("div");
  actions.className = "card__actions";

  // Create the edit button
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "btn btn--secondary";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit ${spot.name}`);
  editButton.addEventListener("click", () => startEditing(spot));

  // Add the edit button to the actions
  actions.append(editButton);

  // Create the delete button
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn btn--secondary";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${spot.name}`);
  deleteButton.addEventListener("click", () => deleteSpot(spot));

  // Add the delete button to the actions
  actions.append(deleteButton);

  // Create the similar spots button
  const similarButton = document.createElement("button");
  similarButton.type = "button";
  similarButton.className = "btn btn--secondary";
  similarButton.textContent = "Spots like this";
  similarButton.setAttribute("aria-label", `Spots like ${spot.name}`);
  similarButton.addEventListener("click", () =>
    toggleSimilarSpots(spot, similar, similarButton),
  );

  // Add the similar spots button to the actions
  actions.append(similarButton);

  // Add the actions and similar spots container to the card
  card.append(actions, similar);

  // Return the completed card
  return card;
}

/** Shows or hides similar spots for a spot */
async function toggleSimilarSpots(spot, container, button) {
  // If the results are already open, hide them
  if (!container.hidden) {
    container.hidden = true;
    button.textContent = "Spots like this";
    return;
  }

  // Show the container and loading message
  container.hidden = false;
  container.textContent = "Loading...";
  button.textContent = "Hide similar spots";

  try {
    // Fetch similar spots from the API
    const res = await fetch(`/api/spots/${spot._id}/similar`);

    // If the response is not ok, show an error message
    if (!res.ok) {
      container.textContent = "Couldn't load similar spots";
      return;
    }

    // Read the similar spots from the response
    const matches = await res.json();

    // If there are no similar spots, show a message
    if (matches.length === 0) {
      container.textContent = "No similar spots yet";
      return;
    }

    // Clear the loading message
    container.replaceChildren();

    // Add a heading for the similar spots
    const heading = document.createElement("h4");
    heading.textContent = "Spots like this";
    container.appendChild(heading);

    // Add each similar spot and its match reasons
    for (const match of matches) {
      const name = document.createElement("p");
      const link = document.createElement("a");
      link.href = `#spot-${match.spot._id}`;
      link.textContent = match.spot.name;
      name.appendChild(link);
      container.appendChild(name);

      const reasons = document.createElement("p");
      reasons.className = "card__meta";
      reasons.textContent = formatMatchReasons(match.reasons);
      container.appendChild(reasons);
    }
  } catch (error) {
    // Log the error and show a message
    console.error("Failed to load similar spots", error);
    container.textContent = "Couldn't load similar spots";
  }
}

/** Displays all spot cards on the page */
function renderSpots(spots) {
  // Find the spot list on the page
  const list = document.querySelector("#spot-list");

  // Clear the list before rendering spots
  list.replaceChildren();

  // If there are no matching spots, display a message
  if (spots.length === 0) {
    const message = document.createElement("p");
    message.className = "text-muted";
    message.textContent =
      allSpots.length === 0
        ? "No spots yet. Add the first one below."
        : "No spots match your filters.";
    list.append(message);
    return;
  }

  // Loop through spots and add a card for each one
  for (const spot of spots) {
    list.append(createSpotCard(spot));
  }
}

/** Handle the submission of a form */
async function handleSubmit(event) {
  // Prevent reloading the whole page
  event.preventDefault();

  // Find the error spot and clear it to remove old errors
  const errorMessage = document.querySelector("#form-error");
  errorMessage.textContent = "";

  // Read the fields
  const data = new FormData(event.target);

  // Create the spot
  const spot = {
    name: data.get("name"),
    building: data.get("building"),
    noiseLevel: data.get("noiseLevel"),
    outlets: data.get("outlets") === "on",
    wifi: data.get("wifi") === "on",
    closingTime: data.get("closingTime") || undefined,
    tags: parseTags(data.get("tags")),
    lat: selectedLocation ? selectedLocation.lat : null,
    lng: selectedLocation ? selectedLocation.lng : null,
  };

  // Update the spot being edited, or create a new one
  const url = editingId ? `/api/spots/${editingId}` : "/api/spots";
  const method = editingId ? "PUT" : "POST";

  try {
    // Send the new spot to the PUT or POST route
    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(spot),
    });

    // Read the response
    const body = await res.json();

    // If the response is not ok, display the error message
    if (!res.ok) {
      errorMessage.textContent = body.error;
      return;
    }

    // Leave edit mode and reset the form
    stopEditing();

    // Reload spots and keep the current filters applied
    await refreshSpots();
  } catch (error) {
    // Log the error and display a message if the request fails
    console.error("Failed to save spot", error);
    errorMessage.textContent = "Couldn't save the spot. Please try again.";
  }
}

/** Handle the delete button */
async function deleteSpot(spot) {
  // Ask if you're sure you want to delete
  if (!confirm(`Delete "${spot.name}"?`)) {
    return;
  }

  try {
    // Fetch the spot by ID and use method DELETE
    const res = await fetch(`/api/spots/${spot._id}`, { method: "DELETE" });

    // If the response is not ok, show an error and stop
    if (!res.ok) {
      alert(`Couldn't delete ${spot.name}. Please try again.`);
      return;
    }

    // Reload spots and keep the current filters applied
    await refreshSpots();
  } catch (error) {
    // Log the error and display a message if the request fails
    console.error(`Couldn't delete ${spot.name}. Please try again.`, error);
    alert(`Couldn't delete ${spot.name}. Please try again.`);
  }
}

/** Fills form, sets editing ID, and scrolls form into view */
function startEditing(spot) {
  // Find the form
  const form = document.querySelector("#spot-form");

  // Fill each field with the spot's information
  form.elements.name.value = spot.name;
  form.elements.building.value = spot.building;
  form.elements.noiseLevel.value = spot.noiseLevel;
  form.elements.outlets.checked = spot.outlets;
  form.elements.wifi.checked = spot.wifi;
  form.elements.closingTime.value = spot.closingTime ?? "";
  form.elements.tags.value = (spot.tags ?? []).join(", ");

  // Show the spot's location, if it has one
  if (typeof spot.lat === "number" && typeof spot.lng === "number") {
    setLocation(spot.lat, spot.lng);
  } else {
    clearLocation();
  }

  // Remember which spot is being edited
  editingId = spot._id;

  // Change the form title and submit button for editing
  document.querySelector("#form-title").textContent = `Edit ${spot.name}`;
  document.querySelector("#form-submit").textContent = "Save changes";

  // Show the cancel button
  document.querySelector("#form-cancel").hidden = false;

  // Scroll the form into view
  form.scrollIntoView({ behavior: "smooth" });
}

/** Stops editing and resets the form */
function stopEditing() {
  // Stop editing the current spot
  editingId = null;

  // Reset the form fields
  document.querySelector("#spot-form").reset();

  // Reset map location selection
  clearLocation();

  // Restore the original form title and submit button
  document.querySelector("#form-title").textContent = "Add a study spot";
  document.querySelector("#form-submit").textContent = "Save spot";

  // Hide the cancel button
  document.querySelector("#form-cancel").hidden = true;

  // Clear any existing error message
  document.querySelector("#form-error").textContent = "";
}

init();
