/** Gets the confirmation message for deleting an item */
function getDeleteMessage(itemName) {
  // If the item name is a non-empty string, include it in the message
  if (typeof itemName === "string" && itemName.trim() !== "") {
    return `"${itemName.trim()}" will be permanently deleted.`;
  }

  // Return a general message if the item name is missing or invalid
  return "This item will be permanently deleted.";
}

// The delete dialog, built the first time it's needed
let dialog = null;

/** Builds the dialog the first time it is needed and returns it */
function getDialog() {
  // Return the existing dialog if it has already been created
  if (dialog) {
    return dialog;
  }

  // Create the dialog element
  dialog = document.createElement("dialog");
  dialog.className = "panel dialog";
  dialog.setAttribute("aria-labelledby", "confirm-dialog-title");

  // Create the form inside the dialog
  const form = document.createElement("form");
  form.method = "dialog";

  // Create the dialog title
  const title = document.createElement("h2");
  title.id = "confirm-dialog-title";
  title.textContent = "Delete this?";

  // Create the confirmation message
  const message = document.createElement("p");
  message.id = "confirm-dialog-text";

  // Create the container for the action buttons
  const actions = document.createElement("div");
  actions.className = "form__actions";

  // Create the Delete button
  const deleteButton = document.createElement("button");
  deleteButton.type = "submit";
  deleteButton.value = "delete";
  deleteButton.className = "btn btn--primary";
  deleteButton.textContent = "Delete";

  // Create the Cancel button
  const cancelButton = document.createElement("button");
  cancelButton.type = "submit";
  cancelButton.value = "cancel";
  cancelButton.className = "btn btn--secondary";
  cancelButton.textContent = "Cancel";

  // Add the buttons to the actions container
  actions.append(deleteButton, cancelButton);

  // Add the title, message, and actions to the form
  form.append(title, message, actions);

  // Add the form to the dialog
  dialog.append(form);

  // Add the dialog to the page
  document.body.append(dialog);

  return dialog;
}

/** Shows the confirmation dialog and returns whether deletion was confirmed */
function confirmDelete(itemName) {
  const box = getDialog();

  // Update the message for the item being deleted
  box.querySelector("#confirm-dialog-text").textContent =
    getDeleteMessage(itemName);

  // Reset the previous result
  box.returnValue = "";

  // Open the dialog
  box.showModal();

  // Focus Cancel to prevent accidental deletion
  box.querySelector('button[value="cancel"]').focus();

  // Resolve true if Delete was clicked, otherwise resolve false
  return new Promise((resolve) => {
    box.addEventListener("close", () => resolve(box.returnValue === "delete"), {
      once: true,
    });
  });
}

export { getDeleteMessage, confirmDelete };
