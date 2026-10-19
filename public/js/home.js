import { getSpotTags } from "./spotUtils.js";

/** Shows the first three spots as cards on the home page */
async function loadFeaturedSpots() {
  const list = document.querySelector("#featured-spots");

  try {
    // Load every spot from the database
    const res = await fetch("/api/spots");
    if (!res.ok) {
      throw new Error("Failed to load spots");
    }
    const spots = await res.json();

    // Build a card for each of the first three spots
    list.replaceChildren();
    for (const spot of spots.slice(0, 3)) {
      const card = document.createElement("article");
      card.className = "card";

      const title = document.createElement("h3");
      title.className = "card__title";
      title.textContent = spot.name;

      const building = document.createElement("p");
      building.className = "card__meta";
      building.textContent = spot.building;

      const tags = document.createElement("div");
      tags.className = "card__tags";
      for (const tag of getSpotTags(spot)) {
        const pill = document.createElement("span");
        pill.className = "tag";
        pill.textContent = tag;
        tags.append(pill);
      }

      card.append(title, building, tags);
      list.append(card);
    }
  } catch (error) {
    // Log the error and show a message
    console.error("Failed to load featured spots", error);
    const message = document.createElement("p");
    message.className = "text-muted";
    message.textContent = "Couldn't load spots. Please refresh.";
    list.replaceChildren(message);
  }
}

loadFeaturedSpots();
