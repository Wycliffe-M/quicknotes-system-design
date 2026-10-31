# QuickNotes Data Model

This document describes the relational database behind the QuickNotes API. It matches the fields used in `api-design.md`.

## Entities

### users

| Column     | Type    | Key / rules                            |
| ---------- | ------- | -------------------------------------- |
| id         | INTEGER | Primary key, auto-numbered             |
| name       | TEXT    | NOT NULL                               |
| email      | TEXT    | NOT NULL, UNIQUE                       |
| created_at | TEXT    | NOT NULL, defaults to the current time |

### notes

| Column     | Type    | Key / rules                                             |
| ---------- | ------- | ------------------------------------------------------- |
| id         | INTEGER | Primary key, auto-numbered                              |
| user_id    | INTEGER | Foreign key to `users(id)`, NOT NULL, ON DELETE CASCADE |
| text       | TEXT    | NOT NULL, at most 200 characters                        |
| category   | TEXT    | NOT NULL, defaults to `personal`                        |
| created_at | TEXT    | NOT NULL, defaults to the current time                  |

### tags

| Column | Type    | Key / rules                |
| ------ | ------- | -------------------------- |
| id     | INTEGER | Primary key, auto-numbered |
| name   | TEXT    | NOT NULL, UNIQUE           |

### note_tags

| Column  | Type    | Key / rules                                   |
| ------- | ------- | --------------------------------------------- |
| note_id | INTEGER | Foreign key to `notes(id)`, ON DELETE CASCADE |
| tag_id  | INTEGER | Foreign key to `tags(id)`, ON DELETE CASCADE  |

Primary key: the pair `(note_id, tag_id)` (a composite key).

## Relationships

- **One-to-many: users to notes.** One user has many notes, but each note belongs to exactly one user. The foreign key `notes.user_id` sits on the "many" side.
- **Many-to-many: notes to tags.** A note can have many tags (for example `errands` and `urgent`), and a tag can be on many notes. A single column cannot store this, so the join table `note_tags` holds one row for each note-tag pair. Its composite primary key also stops the same tag being added to the same note twice.
- **Cascade:** deleting a user deletes their notes, and deleting a note removes its `note_tags` rows, so no orphan rows are left behind.

## CREATE TABLE statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL CHECK (length(text) <= 200),
  category TEXT NOT NULL DEFAULT 'personal',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

## Example queries

**1. A user's notes, newest first** (this is what `GET /notes` runs):

```sql
SELECT id, text, category, created_at
FROM notes
WHERE user_id = ?
ORDER BY created_at DESC;
```

**2. Notes with a given tag, using two JOINs** (`GET /notes?tag=urgent`):

```sql
SELECT notes.id, notes.text
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags ON tags.id = note_tags.tag_id
WHERE tags.name = 'urgent' AND notes.user_id = ?;
```

**3. Number of notes per user, including users with none:**

```sql
SELECT users.name, COUNT(notes.id) AS note_count
FROM users
LEFT JOIN notes ON notes.user_id = users.id
GROUP BY users.id;
```

**4. Delete one of the user's own notes** (`DELETE /notes/{id}`):

```sql
DELETE FROM notes WHERE id = ? AND user_id = ?;
```

The `?` marks are placeholders: values are passed separately from the SQL text, which prevents SQL injection. The `AND user_id = ?` makes sure users can only change their own notes.

## Indexes

```sql
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
```

- **`notes(user_id)`:** almost every request is "get this user's notes". Without the index the database reads every row in `notes`; with it, it jumps straight to that user's rows.
- **`note_tags(tag_id)`:** the composite key `(note_id, tag_id)` helps lookups by note, but not by tag alone, so filtering notes by tag needs its own index.
- **Trade-off:** indexes make reads faster but writes slightly slower and use extra storage. Primary keys and `UNIQUE` columns are indexed automatically.

## SQL or NoSQL?

I chose **SQL** (a relational database such as PostgreSQL). QuickNotes data is naturally related: users own notes, and notes have many tags. A relational database enforces those rules itself (foreign keys, `UNIQUE`, `NOT NULL`, `CHECK`), supports JOINs for queries like "notes with this tag", and provides transactions so related changes succeed or fail together. At 1 million users the load is about 200 reads and 50 writes per second at peak, and about 180 GB of data per year, which one primary database with read replicas handles comfortably. A document database such as MongoDB would be a good choice if the notes had very different shapes or we needed to spread data across many servers from day one, but neither applies here.
