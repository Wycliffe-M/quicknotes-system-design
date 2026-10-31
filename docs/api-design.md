# QuickNotes API Design

This document describes the REST API the backend team should build for QuickNotes. It is not the JSONPlaceholder practice API used by the client in this repo.

## Conventions

- Base URL: `https://api.quicknotes.com`
- Resources are plural nouns (`/notes`, `/tags`); the HTTP method says the action.
- All requests and responses use JSON.
- Every request except registering and logging in needs the header `Authorization: Bearer <token>`.
- The API is stateless: the server keeps no session in memory, so any app server can answer any request.
- A user can only see and change their own notes.

## Endpoints

| Method | Path                       | Description                                                              | Success status |
| ------ | -------------------------- | ------------------------------------------------------------------------ | -------------- |
| POST   | `/users`                   | Register a new user                                                      | 201 Created    |
| POST   | `/login`                   | Log in and receive a token                                               | 200 OK         |
| GET    | `/notes`                   | List the logged-in user's notes (supports `?tag=`, `?search=`, `?page=`) | 200 OK         |
| GET    | `/notes/{id}`              | Get one note                                                             | 200 OK         |
| POST   | `/notes`                   | Create a note                                                            | 201 Created    |
| PUT    | `/notes/{id}`              | Replace a note                                                           | 200 OK         |
| PATCH  | `/notes/{id}`              | Update part of a note                                                    | 200 OK         |
| DELETE | `/notes/{id}`              | Delete a note                                                            | 204 No Content |
| GET    | `/tags`                    | List all tags                                                            | 200 OK         |
| POST   | `/notes/{id}/tags`         | Add a tag to a note                                                      | 201 Created    |
| DELETE | `/notes/{id}/tags/{tagId}` | Remove a tag from a note                                                 | 204 No Content |

## Examples

### Create a note

`POST /notes`

Request body:

```json
{
  "text": "Buy milk",
  "category": "personal",
  "tags": ["errands"]
}
```

Response: `201 Created`

```json
{
  "id": 42,
  "user_id": 7,
  "text": "Buy milk",
  "category": "personal",
  "tags": ["errands"],
  "created_at": "2026-10-31T08:15:00Z"
}
```

### List notes

`GET /notes?page=1`

Response: `200 OK`

```json
{
  "page": 1,
  "total": 2,
  "notes": [
    {
      "id": 42,
      "text": "Buy milk",
      "category": "personal",
      "tags": ["errands"],
      "created_at": "2026-10-31T08:15:00Z"
    },
    {
      "id": 41,
      "text": "Call Amina",
      "category": "work",
      "tags": [],
      "created_at": "2026-10-30T14:02:00Z"
    }
  ]
}
```

## Error codes

| Status                    | Meaning                     | When it happens                                  |
| ------------------------- | --------------------------- | ------------------------------------------------ |
| 400 Bad Request           | The request is invalid      | Missing text, or text longer than 200 characters |
| 401 Unauthorized          | Not logged in               | Missing, invalid or expired token                |
| 403 Forbidden             | Logged in but not allowed   | Trying to change another user's note             |
| 404 Not Found             | The resource does not exist | No note with that id                             |
| 429 Too Many Requests     | Rate limit exceeded         | More than 100 requests per minute                |
| 500 Internal Server Error | The server failed           | An unexpected bug or database problem            |

Example error body (`400 Bad Request`):

```json
{
  "error": {
    "status": 400,
    "message": "Note text is required and must be 200 characters or fewer."
  }
}
```

All errors use the same body shape, so the client can always read `error.message`.
