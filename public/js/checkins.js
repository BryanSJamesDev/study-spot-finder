import {
  buildCheckinBody,
  crowdBadgeClass,
  formatCheckinCount,
  formatCheckinTime,
  formatTimeAgo,
  sortCrowdedNow,
  validateCheckin,
} from "./checkinsUtils.js";

// How many recent check-ins to show
const RECENT_LIMIT = 20;

// Page elements
const form = document.querySelector("#checkin-form");
const formTitle = document.querySelector("#form-title");
const formError = document.querySelector("#form-error");
const submitButton = document.querySelector("#form-submit");
const cancelButton = document.querySelector("#form-cancel");
const spotSelect = document.querySelector("#checkin-spot");
const filterSelect = document.querySelector("#filter-spot");
const crowdedList = document.querySelector("#crowded-list");
const checkinList = document.querySelector("#checkin-list");

// The id of the check-in being edited, or null when adding a new one
let editingId = null;

/**
 * Fetches JSON from the API and throws a readable error if the request fails.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>} The parsed response, or null for an empty response
 */
async function fetchJson(url, options) {
  const response = await fetch(url, options);

  // A successful delete has no body
  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

/**
 * Replaces the contents of a container with a single message.
 * @param {HTMLElement} container
 * @param {string} text
 */
function showMessage(container, text) {
  const message = document.createElement("p");
  message.className = "text-muted";
  message.textContent = text;
  container.replaceChildren(message);
}

/**
 * Adds every spot name to the form select and the filter select.
 * @param {{name: string}[]} spots
 */
function fillSpotSelects(spots) {
  const names = spots
    .map((spot) => spot.name)
    .sort((a, b) => a.localeCompare(b));

  for (const select of [spotSelect, filterSelect]) {
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.append(option);
    }
  }
}

/**
 * Creates the colored crowd level badge.
 * @param {string} level
 * @returns {HTMLParagraphElement}
 */
function createBadge(level) {
  const badge = document.createElement("span");
  badge.className = `tag ${crowdBadgeClass(level)}`.trim();
  badge.textContent = level;

  const wrapper = document.createElement("p");
  wrapper.append(badge);
  return wrapper;
}

/**
 * Creates a card for one spot in the crowded-now section.
 * @param {{spotName: string, crowdLevel: string, count: number}} row
 * @returns {HTMLElement}
 */
function createCrowdedCard(row) {
  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h3");
  title.textContent = row.spotName;

  const meta = document.createElement("p");
  meta.className = "text-muted";
  meta.textContent = `${formatCheckinCount(row.count)} in the last 2 hours`;

  card.append(title, createBadge(row.crowdLevel), meta);
  return card;
}

/**
 * Creates a card for one check-in, with edit and delete buttons.
 * @param {object} checkin
 * @returns {HTMLElement}
 */
function createCheckinCard(checkin) {
  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h3");
  title.textContent = checkin.spotName;

  const when = document.createElement("p");
  when.className = "text-muted";
  when.textContent = [
    formatTimeAgo(checkin.createdAt),
    formatCheckinTime(checkin),
  ]
    .filter(Boolean)
    .join(" · ");

  card.append(title, createBadge(checkin.crowdLevel), when);

  // The note is optional
  if (checkin.note) {
    const note = document.createElement("p");
    note.textContent = checkin.note;
    card.append(note);
  }

  // Edit button
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "btn btn--secondary";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit check-in at ${checkin.spotName}`);
  editButton.addEventListener("click", () => startEditing(checkin));

  // Delete button
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn btn--secondary";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute(
    "aria-label",
    `Delete check-in at ${checkin.spotName}`,
  );
  deleteButton.addEventListener("click", () => deleteCheckin(checkin));

  const actions = document.createElement("div");
  actions.className = "form__actions";
  actions.append(editButton, deleteButton);

  card.append(actions);
  return card;
}

/**
 * Shows the crowded-now cards, busiest spots first.
 * @param {object[]} rows
 */
function renderCrowdedNow(rows) {
  if (rows.length === 0) {
    showMessage(crowdedList, "No check-ins in the last 2 hours. Be the first!");
    return;
  }
  crowdedList.replaceChildren(...sortCrowdedNow(rows).map(createCrowdedCard));
}

/**
 * Shows the recent check-in cards.
 * @param {object[]} checkins
 */
function renderCheckins(checkins) {
  if (checkins.length === 0) {
    showMessage(checkinList, "No check-ins yet.");
    return;
  }
  checkinList.replaceChildren(...checkins.map(createCheckinCard));
}

/**
 * Loads the recent check-ins, using the spot filter if one is chosen.
 */
async function loadCheckins() {
  const params = new URLSearchParams({ limit: RECENT_LIMIT });
  if (filterSelect.value) {
    params.set("spotName", filterSelect.value);
  }

  try {
    renderCheckins(await fetchJson(`/api/checkins?${params}`));
  } catch (error) {
    showMessage(checkinList, error.message);
  }
}

/**
 * Loads the crowded-now section.
 */
async function loadCrowdedNow() {
  try {
    renderCrowdedNow(await fetchJson("/api/checkins/crowded-now"));
  } catch (error) {
    showMessage(crowdedList, error.message);
  }
}

/**
 * Reloads everything on the page that depends on check-ins.
 */
async function refreshCheckins() {
  await Promise.all([loadCheckins(), loadCrowdedNow()]);
}

/**
 * Puts the form back into "add a check-in" mode.
 */
function stopEditing() {
  editingId = null;
  form.reset();
  formError.textContent = "";
  formTitle.textContent = "Check in";
  submitButton.textContent = "Check in";
  cancelButton.hidden = true;
}

/**
 * Fills the form with a check-in so it can be edited.
 * @param {object} checkin
 */
function startEditing(checkin) {
  editingId = checkin._id;
  form.elements.spotName.value = checkin.spotName;
  form.elements.crowdLevel.value = checkin.crowdLevel;
  form.elements.note.value = checkin.note || "";
  formError.textContent = "";
  formTitle.textContent = "Edit check-in";
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;

  // Focusing the first field also scrolls the form into view
  spotSelect.focus();
}

/**
 * Validates the form, then creates or updates a check-in.
 * @param {SubmitEvent} event
 */
async function handleSubmit(event) {
  event.preventDefault();

  // Read the form values
  const values = {
    spotName: form.elements.spotName.value,
    crowdLevel: form.elements.crowdLevel.value,
    note: form.elements.note.value,
  };

  // Stop early if anything is invalid
  const errors = validateCheckin(values);
  if (errors.length > 0) {
    formError.textContent = errors.join(" ");
    return;
  }

  // Editing uses PUT, adding uses POST
  const url = editingId ? `/api/checkins/${editingId}` : "/api/checkins";
  const method = editingId ? "PUT" : "POST";

  // Disable the button so a double click can't submit twice
  submitButton.disabled = true;
  try {
    await fetchJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCheckinBody(values)),
    });
    stopEditing();
    await refreshCheckins();
  } catch (error) {
    formError.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
}

/**
 * Asks for confirmation, then deletes a check-in.
 * @param {object} checkin
 */
async function deleteCheckin(checkin) {
  if (!confirm(`Delete this check-in at ${checkin.spotName}?`)) {
    return;
  }

  try {
    await fetchJson(`/api/checkins/${checkin._id}`, { method: "DELETE" });

    // Don't leave the form editing something that no longer exists
    if (editingId === checkin._id) {
      stopEditing();
    }
    await refreshCheckins();
  } catch (error) {
    alert(error.message);
  }
}

/**
 * Sets up the page: listeners, spot lists, then the check-ins.
 */
async function init() {
  form.addEventListener("submit", handleSubmit);
  cancelButton.addEventListener("click", stopEditing);
  filterSelect.addEventListener("change", loadCheckins);

  try {
    fillSpotSelects(await fetchJson("/api/spots"));
  } catch {
    formError.textContent = "Could not load the list of spots.";
  }

  await refreshCheckins();
}

init();
