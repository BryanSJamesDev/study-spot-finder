/* Helper function to load spots*/
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
  console.log(spots);
}

init();
