const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const statusEl = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");

// Reusable helper: every API call goes through here.
async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error("Request failed with status " + response.status);
  }
  return response;
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type; // "loading", "success" or "error"
}

function createNoteItem(note) {
  const li = document.createElement("li");

  const title = document.createElement("strong");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body;

  li.appendChild(title);
  li.appendChild(body);
  return li;
}

function renderNotes(notes) {
  notesList.textContent = "";

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No notes yet.";
    notesList.appendChild(empty);
    return;
  }

  for (const note of notes) {
    notesList.appendChild(createNoteItem(note));
  }
}

async function loadNotes() {
  showStatus("Loading notes...", "loading");
  loadBtn.disabled = true;

  try {
    const response = await request(API_URL + "?_limit=10");
    const notes = await response.json();
    renderNotes(notes);
    showStatus("Loaded " + notes.length + " notes from the server.", "success");
  } catch (error) {
    showStatus("Could not load notes. Please try again.", "error");
    console.error(error);
  } finally {
    loadBtn.disabled = false;
  }
}

function validateTitle(title) {
  if (title === "") {
    return "A title is required.";
  }
  if (title.length > 100) {
    return "The title must be 100 characters or fewer.";
  }
  return "";
}

loadBtn.addEventListener("click", loadNotes);

async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  const problem = validateTitle(title);
  if (problem) {
    showStatus(problem, "error");
    return;
  }

  showStatus("Saving note...", "loading");
  submitBtn.disabled = true;

  try {
    const response = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });
    const created = await response.json();

    // Remove the "No notes yet." message if it is showing
    if (notesList.children.length === 1 && notesList.firstChild.textContent === "No notes yet.") {
      notesList.textContent = "";
    }

    notesList.prepend(createNoteItem(created));
    showStatus(
      "Note created (status " + response.status + ", id " + created.id + ").",
      "success"
    );
    noteForm.reset();
  } catch (error) {
    showStatus("Could not create the note. Please try again.", "error");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
}

noteForm.addEventListener("submit", createNote);