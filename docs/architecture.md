# QuickNotes Architecture

This document describes how QuickNotes can serve 1 million users. It builds on `api-design.md` and `data-model.md`.

## Requirements

### Functional requirements

- Users can register and log in.
- Users can create, list, edit and delete their own notes.
- Users can add tags to notes and filter notes by tag.
- Users can search their notes.

### Non-functional requirements

- **Scalability:** support 1 million registered users.
- **Latency:** `GET /notes` responds in under 200 ms for 95% of requests.
- **Availability:** 99.9% uptime, with no single point of failure.
- **Durability:** notes are never lost, with regular backups.
- **Security:** HTTPS everywhere, a token on every request, users can only access their own notes.
- **Consistency:** a list that is a few seconds out of date is acceptable.

## Load estimate

Assumptions:

- 1,000,000 registered users, 20% active per day: **200,000 daily active users (DAU)**
- Each active user creates 5 notes and loads their notes 20 times per day
- An average note is about 500 bytes
- 1 day is about 100,000 seconds (rounded), and peak traffic is 5 times the average

| Measure               | Working                                             | Average       | Peak (5x)             |
| --------------------- | --------------------------------------------------- | ------------- | --------------------- |
| Writes (new notes)    | 200,000 x 5 = 1,000,000/day, / 100,000              | 10 per second | 50 per second         |
| Reads (loading notes) | 200,000 x 20 = 4,000,000/day, / 100,000             | 40 per second | 200 per second        |
| Storage               | 1,000,000 notes/day x 500 bytes = 500 MB/day, x 365 |               | about 180 GB per year |

**What this tells us:** QuickNotes is **read-heavy** (4 times more reads than writes), so caching reads will help a lot. 200 requests per second at peak is manageable for a few ordinary servers, and 180 GB per year fits in one well-configured database. The design does not need to be enormous, because over-engineering is also a mistake.

## Architecture diagram

```
Client (browser/mobile) ──> DNS
   │ static files (HTML, CSS, JS)
   ├──────────> CDN ──(miss)──> Origin
   │ API calls (HTTPS, JSON)
   v
Load balancer
   ├──> App server 1 ─┐
   ├──> App server 2 ─┼──> Cache (Redis)
   └──> App server 3 ─┘
        │ writes          │ reads             │ jobs
        v                 v                   v
   Primary DB ──copies──> Read replica       Queue ──> Worker
```

## What each component does

- **Client:** shows the notes and sends API requests, so users never touch the servers directly.
- **DNS:** turns quicknotes.com into the address of our servers, so users do not need to know any IP addresses.
- **CDN:** serves index.html, style.css and script files from servers near the user, which cuts latency and load on our own servers.
- **Load balancer:** spreads requests across the app servers and skips unhealthy ones, which removes a single server as a bottleneck and single point of failure.
- **App servers (stateless):** run the API code, and because they keep no user data, we can add or replace servers as load changes.
- **Cache (Redis):** keeps each user's note list in memory, so most reads never reach the database, which solves the read-heavy load.
- **Primary database:** holds the one true copy of users, notes and tags and takes all writes.
- **Read replica:** a copy of the primary that serves read queries, so reads do not slow down writes.
- **Queue:** holds slow jobs such as welcome emails and exports, so the app server can reply straight away and bursts wait in line.
- **Worker:** takes jobs from the queue and runs them in the background, keeping slow work out of the request.

## Request flows

### GET /notes

1. The client sends `GET /notes` with its token to the load balancer.
2. The load balancer picks the least busy healthy app server.
3. The app server checks the token and identifies the user.
4. It asks Redis for the key `notes:user:1`.
5. **Cache hit:** Redis returns the list in about 1 ms and the server responds `200 OK`.
6. **Cache miss:** the server queries a read replica (`WHERE user_id = ?`, using the index on `notes.user_id`), saves the result in Redis with a TTL of 5 minutes, and responds `200 OK`.

### POST /notes

1. The client sends `POST /notes` with its token and the JSON body to the load balancer.
2. The load balancer forwards it to any healthy app server.
3. The app server checks the token and validates the data (text required, at most 200 characters).
4. It writes the note to the **primary** database, because only the primary accepts writes.
5. It deletes `notes:user:1` from Redis so the next read fetches fresh data.
6. It responds `201 Created` with the new note.
7. The primary copies the new row to the read replica within milliseconds.
8. If the request needs slow follow-up work, such as an export, the app server adds a job to the queue and a worker handles it in the background.

## Trade-offs

1. **Speed vs freshness:** the cache and the read replica make reads fast, but a list can be a few seconds out of date because of the TTL and replication lag (eventual consistency). For notes this is acceptable. A bank balance would not accept it.
2. **Simplicity vs scalability:** one server would be easy to build and run, but it could not survive a failure. Several servers, a cache, a replica and a queue scale further but are harder to build, debug and run.
3. **Cost vs reliability:** extra app servers and replicas improve uptime but cost more money. We start with three app servers and one replica, and add more only when the numbers say so.

## Avoiding single points of failure

- **App servers:** at least two, behind the load balancer. Health checks remove a failed server within seconds, and because the servers are stateless no data is lost.
- **Load balancer:** run it as a managed cloud load balancer, or as a pair, so it is not a single machine.
- **Database:** the primary has a read replica. If the primary fails, the replica is promoted (failover).
- **Cache:** if Redis fails, requests fall back to the database, so the app slows down but stays up. Redis can also run as a replicated pair.
- **Backups:** regular backups, with test restores, protect against data loss.
