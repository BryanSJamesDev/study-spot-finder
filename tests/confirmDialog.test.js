import test from "node:test";
import assert from "node:assert/strict";
import { getDeleteMessage } from "../public/js/confirmDialog.js";

/** Test that a normal name is included in the message. */
test("getDeleteMessage includes the item name", () => {
  assert.equal(
    getDeleteMessage("Snell Quiet Floor"),
    '"Snell Quiet Floor" will be permanently deleted.',
  );
});

/** Test that extra spaces around the name are trimmed. */
test("getDeleteMessage trims the item name", () => {
  assert.equal(
    getDeleteMessage("  Curry Quiet Room  "),
    '"Curry Quiet Room" will be permanently deleted.',
  );
});

/** Test that missing or empty names use the general message. */
test("getDeleteMessage uses a general message for missing names", () => {
  for (const name of ["", "   ", null, undefined]) {
    assert.equal(
      getDeleteMessage(name),
      "This item will be permanently deleted.",
    );
  }
});

/** Test that names of the wrong type use the general message. */
test("getDeleteMessage uses a general message for wrong types", () => {
  for (const name of [5, 0, true, {}, [], ["Snell"]]) {
    assert.equal(
      getDeleteMessage(name),
      "This item will be permanently deleted.",
    );
  }
});

/** Test that special characters in names are kept as they are. */
test("getDeleteMessage keeps special characters in names", () => {
  assert.equal(
    getDeleteMessage('Snell "Café" Tables'),
    '"Snell "Café" Tables" will be permanently deleted.',
  );
});

/** Test that a very long name still works. */
test("getDeleteMessage handles a very long name", () => {
  const longName = "a".repeat(1000);
  assert.equal(
    getDeleteMessage(longName),
    `"${longName}" will be permanently deleted.`,
  );
});
