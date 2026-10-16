import { formatClosingTime, getSpotTags, parseTags } from "./spotUtils.js";

/** Global variables */
// The ID of the spot being edited, or null when adding a new spot
let editingId = null;

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

/* Starts the page */
async function init() {
  const spots = await loadSpots();
  renderSpots(spots);

  // Adds event listener for a submission of a form whether its enter or a click
  document.querySelector("#spot-form").addEventListener("submit", handleSubmit);

  // Adds event listener for the cancel button
  document.querySelector("#form-cancel").addEventListener("click", stopEditing);
}

/** Creates a card and returns it */
function createSpotCard(spot) {
  // Create the card
  const card = document.createElement("article");
  card.className = "card";

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

  // Add the delete button to the actions, and the actions to the card
  actions.append(deleteButton);
  card.append(actions);
  // Return the completed card
  return card;
}

/** Displays all spot cards on the page */
function renderSpots(spots) {
  // Find the spot list on the page
  const list = document.querySelector("#spot-list");

  // Clear the list before rendering spots
  list.replaceChildren();

  // If there are no spots, display a message
  if (spots.length === 0) {
    const message = document.createElement("p");
    message.className = "text-muted";
    message.textContent = "No spots yet. Add the first one below.";
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

    // Reload and display the updated spots
    renderSpots(await loadSpots());
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

    // Rerender spots so the deleted spot disappears
    renderSpots(await loadSpots());
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

  // Restore the original form title and submit button
  document.querySelector("#form-title").textContent = "Add a study spot";
  document.querySelector("#form-submit").textContent = "Save spot";

  // Hide the cancel button
  document.querySelector("#form-cancel").hidden = true;

  // Clear any existing error message
  document.querySelector("#form-error").textContent = "";
}
init();
