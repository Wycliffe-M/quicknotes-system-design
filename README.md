# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two parts: a small API client that proves the front end can talk to an API, and three design documents the backend team can build from.

## What is in this repo

- `index.html`, `api.js`, `style.css`: the API client, which loads, creates and deletes notes using the JSONPlaceholder practice API
- `docs/`: the design documents for the real QuickNotes backend

## How to run the API client

1. Clone or download this repository.
2. Open the folder in VS Code and install the **Live Server** extension.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Click **Load notes** to fetch 10 notes (GET).
5. Fill in the form and click **Add note** to create a note (POST).
6. Click **Delete** on a note to remove it (DELETE).

JSONPlaceholder does not really save changes, so a created note always comes back with id 101 and a refresh brings back the original data. The client handles this by removing notes created in the session from the page only, and sending a real DELETE request for notes loaded from the server.

## Design documents

- [API design](docs/api-design.md): REST endpoints, JSON examples and error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, indexes and the SQL or NoSQL decision
- [Architecture](docs/architecture.md): requirements, load estimate, diagram, request flows and trade-offs

## What I learned

- **Always check `response.ok`.** `fetch` does not throw on a 404 or 500, so the reusable `request()` function checks the status and throws, and every call sits in `try`, `catch` and `finally`.
- **Show every state.** A good client shows loading, success, error and empty states, disables buttons while a request runs, and uses `textContent` so user text cannot inject HTML.
- **Estimate before designing.** Back-of-the-envelope numbers (about 200 reads and 50 writes per second at peak, 180 GB per year) show that QuickNotes needs a few servers, not a giant system.
- **Stateless servers make scaling possible.** Because app servers keep no user data, a load balancer can send any request to any server, and a failed server can be replaced without losing data.
- **Every design choice is a trade-off.** Caches and replicas make reads fast but can show slightly old data, and extra servers improve reliability but cost more.
