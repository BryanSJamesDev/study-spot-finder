import { formatClosingTime, getSpotTags, parseTags } from "./spotUtils.js";

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

  try {
    // Send the new spot to the POST route
    const res = await fetch("/api/spots", {
      method: "POST",
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

    // If successful, clear the form
    event.target.reset();

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

init();
