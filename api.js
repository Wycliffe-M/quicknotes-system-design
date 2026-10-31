const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const statusEl = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

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

function renderNotes(notes) {
  notesList.textContent = "";

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No notes yet.";
    notesList.appendChild(empty);
    return;
  }

  for (const note of notes) {
    const li = document.createElement("li");

    const title = document.createElement("strong");
    title.textContent = note.title;

    const body = document.createElement("p");
    body.textContent = note.body;

    li.appendChild(title);
    li.appendChild(body);
    notesList.appendChild(li);
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

loadBtn.addEventListener("click", loadNotes);