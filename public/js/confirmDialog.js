/** Gets the confirmation message for deleting an item */
function getDeleteMessage(itemName) {
  // If the item name is a non-empty string, include it in the message
  if (typeof itemName === "string" && itemName.trim() !== "") {
    return `"${itemName.trim()}" will be permanently deleted.`;
  }

  // Return a general message if the item name is missing or invalid
  return "This item will be permanently deleted.";
}

export { getDeleteMessage };
