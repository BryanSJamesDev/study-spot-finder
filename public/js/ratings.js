import {
  starsToText,
  formatAverage,
  formatRatingCount,
  formatRatingDate,
  getRecentRatings,
  parseStars,
  sortByAverage,
} from "./ratingsUtils.js";

/** Global variables */
// How many recent ratings to show at once
const RECENT_LIMIT = 20;

// How many top-rated spots to show in the averages section
const TOP_LIMIT = 3;

// The ID of the rating being edited, or null when adding a new rating
let editingId = null;

// Every rating from the database, before filtering
let allRatings = [];

/* Helper function to load JSON from the API */
async function fetchJson(url) {
  // Load the data
  const res = await fetch(url);

  // If the request failed throw an error
  if (!res.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return await res.json();
}

/** Shows a short message in place of a list */
function showMessage(list, text) {
  const message = document.createElement("p");
  message.className = "text-muted";
  message.textContent = text;
  list.replaceChildren(message);
}

/** Fills a dropdown with one option per spot, keeping its first option */
function fillSpotSelect(select, spots) {
  // Remove old spot options, but keep the first option
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Add an option for each spot, sorted by name
  const sorted = [...spots].sort((a, b) => a.name.localeCompare(b.name));
  for (const spot of sorted) {
    const option = document.createElement("option");
    option.value = spot.name;
    option.textContent = spot.name;
    select.append(option);
  }
}

/** Creates the stars and the number, like ★★★★☆ 4.2 out of 5 */
function createRatingDisplay(stars, valueText) {
  // Create the container
  const rating = document.createElement("div");
  rating.className = "rating";

  // Create the stars, hidden from screen readers since the number says the same thing
  const starText = document.createElement("span");
  starText.className = "rating__stars";
  starText.setAttribute("aria-hidden", "true");
  starText.textContent = starsToText(stars);

  // Create the number
  const value = document.createElement("span");
  value.className = "rating__value";
  value.textContent = valueText;

  rating.append(starText, value);
  return rating;
}

/** Creates a card showing the average rating for one spot */
function createAverageCard(average) {
  // Create the card
  const card = document.createElement("article");
  card.className = "card";

  // Create the spot title
  const title = document.createElement("h3");
  title.className = "card__title";
  title.textContent = average.spotName;

  // Create the stars and the average
  const rating = createRatingDisplay(
    average.average,
    `${formatAverage(average.average)} out of 5`,
  );

  // Create how many ratings the average is based on
  const count = document.createElement("p");
  count.className = "card__meta";
  count.textContent = formatRatingCount(average.count);

  card.append(title, rating, count);
  return card;
}

/** Creates a card for one rating, with edit and delete buttons */
function createRatingCard(rating) {
  // Create the card
  const card = document.createElement("article");
  card.className = "card";

  // Create the spot title
  const title = document.createElement("h3");
  title.className = "card__title";
  title.textContent = rating.spotName;

  // Create the stars and the number of stars
  const display = createRatingDisplay(rating.stars, `${rating.stars} out of 5`);

  // Create the date
  const date = document.createElement("p");
  date.className = "card__meta";
  date.textContent = formatRatingDate(rating.createdAt);

  // Create a container for the card's buttons
  const actions = document.createElement("div");
  actions.className = "card__actions";

  // Create the edit button
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "btn btn--secondary";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit rating for ${rating.spotName}`);
  editButton.addEventListener("click", () => startEditing(rating));

  // Create the delete button
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn btn--secondary";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute(
    "aria-label",
    `Delete rating for ${rating.spotName}`,
  );
  deleteButton.addEventListener("click", () => deleteRating(rating));

  // Add the buttons to the actions, and everything to the card
  actions.append(editButton, deleteButton);
  card.append(title, display, date, actions);
  return card;
}

/** Displays the average rating cards for the top-rated spots */
function renderAverages(averages) {
  const list = document.querySelector("#average-list");

  // If there are no ratings yet, display a message
  if (averages.length === 0) {
    showMessage(list, "No ratings yet. Add the first one below.");
    return;
  }

  // Clear the list, then add a card for each of the top-rated spots
  list.replaceChildren();
  for (const average of sortByAverage(averages).slice(0, TOP_LIMIT)) {
    list.append(createAverageCard(average));
  }
}

/** Displays the newest ratings for the selected spot */
function renderRatings() {
  const list = document.querySelector("#rating-list");

  // Find the ratings to show, for one spot or all spots
  const spotName = document.querySelector("#filter-spot").value;
  const recent = getRecentRatings(allRatings, spotName, RECENT_LIMIT);

  // If there are no ratings to show, display a message
  if (recent.length === 0) {
    showMessage(
      list,
      allRatings.length === 0
        ? "No ratings yet. Add the first one above."
        : "No ratings for this spot yet.",
    );
    return;
  }

  // Clear the list, then add a card for each rating
  list.replaceChildren();
  for (const rating of recent) {
    list.append(createRatingCard(rating));
  }
}

/** Reloads the ratings and averages, and displays them */
async function refreshRatings() {
  // Load the ratings and the averages at the same time
  const [ratings, averages] = await Promise.all([
    fetchJson("/api/ratings"),
    fetchJson("/api/ratings/averages"),
  ]);

  // Display them
  allRatings = ratings;
  renderAverages(averages);
  renderRatings();
}

/* Starts the page */
async function init() {
  // Load the spots for both dropdowns
  try {
    const spots = await fetchJson("/api/spots");
    fillSpotSelect(document.querySelector("#rating-spot"), spots);
    fillSpotSelect(document.querySelector("#filter-spot"), spots);
  } catch (error) {
    // Log the error and display a message
    console.error("Failed to load spots", error);
    document.querySelector("#form-error").textContent =
      "Couldn't load spots. Please refresh.";
  }

  // Load and display the ratings
  try {
    await refreshRatings();
  } catch (error) {
    // Log the error and display a message
    console.error("Failed to load ratings", error);
    showMessage(
      document.querySelector("#average-list"),
      "Couldn't load ratings. Please refresh.",
    );
    showMessage(
      document.querySelector("#rating-list"),
      "Couldn't load ratings. Please refresh.",
    );
  }

  // Adds event listener for a submission of a form whether its enter or a click
  document
    .querySelector("#rating-form")
    .addEventListener("submit", handleSubmit);

  // Adds event listener for the cancel button
  document.querySelector("#form-cancel").addEventListener("click", stopEditing);

  // Show different ratings whenever the spot filter changes
  document
    .querySelector("#filter-spot")
    .addEventListener("change", renderRatings);
}

/** Handle the submission of a form */
async function handleSubmit(event) {
  // Prevent reloading the whole page
  event.preventDefault();

  // Find the error spot and clear it to remove old errors
  const errorMessage = document.querySelector("#form-error");
  errorMessage.textContent = "";

  // Read the fields and create the rating
  const data = new FormData(event.target);
  const rating = {
    spotName: data.get("spotName"),
    stars: parseStars(data.get("stars")),
  };

  // Update the rating being edited, or create a new one
  const url = editingId ? `/api/ratings/${editingId}` : "/api/ratings";
  const method = editingId ? "PUT" : "POST";
  try {
    // Send the rating to the PUT or POST route
    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rating),
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

    // Reload the ratings and averages
    await refreshRatings();
  } catch (error) {
    // Log the error and display a message if the request fails
    console.error("Failed to save rating", error);
    errorMessage.textContent = "Couldn't save the rating. Please try again.";
  }
}

/** Handle the delete button */
async function deleteRating(rating) {
  // Ask if you're sure you want to delete
  if (
    !confirm(
      `Delete this ${rating.stars}-star rating for "${rating.spotName}"?`,
    )
  ) {
    return;
  }

  try {
    // Fetch the rating by ID and use method DELETE
    const res = await fetch(`/api/ratings/${rating._id}`, { method: "DELETE" });

    // If the response is not ok, show an error and stop
    if (!res.ok) {
      alert("Couldn't delete the rating. Please try again.");
      return;
    }

    // Reload the ratings and averages
    await refreshRatings();
  } catch (error) {
    // Log the error and display a message if the request fails
    console.error("Couldn't delete the rating", error);
    alert("Couldn't delete the rating. Please try again.");
  }
}

/** Fills form, sets editing ID, and scrolls form into view */
function startEditing(rating) {
  // Find the form and the spot dropdown
  const form = document.querySelector("#rating-form");
  const spotSelect = form.elements.spotName;

  // Pick the spot, adding it to the dropdown if it is no longer a spot
  spotSelect.value = rating.spotName;
  if (spotSelect.value !== rating.spotName) {
    const option = document.createElement("option");
    option.value = rating.spotName;
    option.textContent = rating.spotName;
    spotSelect.append(option);
    spotSelect.value = rating.spotName;
  }

  // Pick the stars
  form.elements.stars.value = String(rating.stars);

  // Remember which rating is being edited
  editingId = rating._id;

  // Change the form title and submit button for editing
  document.querySelector("#form-title").textContent =
    `Edit rating for ${rating.spotName}`;
  document.querySelector("#form-submit").textContent = "Save changes";

  // Show the cancel button
  document.querySelector("#form-cancel").hidden = false;

  // Scroll the form into view
  form.scrollIntoView({ behavior: "smooth" });
}

/** Stops editing and resets the form */
function stopEditing() {
  // Stop editing the current rating
  editingId = null;

  // Reset the form fields
  document.querySelector("#rating-form").reset();

  // Restore the original form title and submit button
  document.querySelector("#form-title").textContent = "Rate a spot";
  document.querySelector("#form-submit").textContent = "Save rating";

  // Hide the cancel button
  document.querySelector("#form-cancel").hidden = true;

  // Clear any existing error message
  document.querySelector("#form-error").textContent = "";
}

init();
