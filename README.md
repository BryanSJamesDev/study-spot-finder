# Study Spot Finder

Find study spots on Northeastern's campus that match how you study.

**Team:** Eleah and Bryan James
**Stack:** Node.js, Express, Vanilla ES6, MongoDB (Node driver), Google Maps JS API

---

## Golden Rule

**Only directly edit files you own.** If a change is needed in someone else's file, message them first and agree on who makes it.

Shared files (`server.js`, `db.js`, `package.json`, `public/index.html`) stay stable after setup unless you both agree on a change.

---

## Folder Structure

    study-spot-finder/
    ├── server.js              # Eleah (shared, done)
    ├── db.js                  # Eleah (shared, done)
    ├── package.json           # Bryan (shared, done)
    ├── .gitignore             # Bryan
    ├── README.md              # Both (see rules below)
    ├── routes/
    │   ├── spots.js           # Eleah
    │   ├── ratings.js         # Bryan
    │   └── checkins.js        # Bryan
    ├── ml/
    │   ├── knn.js             # Eleah
    │   └── forecast.js        # Bryan
    ├── seed/                  # Each person seeds their own collection
    ├── tests/
    │   ├── db.test.js         # Eleah
    │   ├── knn.test.js        # Eleah
    │   └── forecast.test.js   # Bryan
    └── public/
        ├── index.html         # Eleah (shared, nav links to all pages)
        ├── spots.html         # Eleah
        ├── ratings.html       # Bryan
        ├── checkins.html      # Bryan
        ├── css/
        │   ├── shared.css     # Eleah (colors, nav, common styles)
        │   ├── spots.css      # Eleah
        │   ├── ratings.css    # Bryan
        │   └── checkins.css   # Bryan
        └── js/
            ├── spots.js       # Eleah
            ├── map.js         # Eleah
            ├── ratings.js     # Bryan
            └── checkins.js    # Bryan

---

## Who Owns What

| Area | Eleah | Bryan |
|------|-------|-------|
| Collections | `spots` | `ratings`, `checkins` |
| Routes | `/api/spots` | `/api/ratings`, `/api/checkins` |
| Pages | `index.html`, `spots.html` | `ratings.html`, `checkins.html` |
| Algorithm | KNN recommender (`ml/knn.js`) | Crowd forecast (`ml/forecast.js`) |
| Extras | Google Maps, filters | Average rating, "crowded now" |
| Setup | `server.js`, `db.js`, `spots.js` stub, nav | Dependencies, `.gitignore`, `ratings.js` and `checkins.js` stubs |

Ratings and check-ins store the **spot name as text**, so Bryan never depends on Eleah's code.

---

## Why This Avoids Collisions

- `server.js` mounts all three route files. Bryan never edits it.
- `index.html` nav links to all pages. Bryan never edits it.
- Every route file starts as a stub that exports an empty router, so the server runs from day one.
- Each person has their own CSS and JS files. `shared.css` holds only common styles.
- Everyone uses `getDB()` from `db.js` to reach the database. Nobody opens a second connection.

---

## Git Workflow

1. Always `git pull origin main` before starting.
2. Work on your own branch: `eleah/feature-name` or `bryan/feature-name`.
3. Open a pull request into `main`. The other person gives it a quick look.
4. Never push straight to `main` after setup is done.
5. **New dependency?** Discuss it with the other person first. Include the `package.json` and `package-lock.json` changes in the same PR as the code that needs them.
6. **README edits:** Only check off your own boxes below. Bigger README changes go in their own PR.
7. Stage files by name (`git add file.js`), not `git add .`, so nothing unexpected gets committed.

---

## Environment Variables

Each person makes their own `.env` file in the project root. It's gitignored and never pushed.

    MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.ezsdfny.mongodb.net/?appName=Cluster0
    PORT=3000
    GOOGLE_MAPS_KEY=

- Use your own database user. Never share passwords in the repo or chat.
- Bryan manages database users and Network Access in Atlas.
- Eleah adds `GOOGLE_MAPS_KEY` when she starts the map and lets Bryan know. The key needs the **Maps JavaScript API** enabled. Because it's visible in the browser, restrict it to your site's URLs in Google Cloud Console.

**Database name:** `studySpotFinder`

---

## Data Model

Agree on these before building routes. Ratings and check-ins reference spots by **name**, so spot names must be unique.

| Collection | Fields |
|------------|--------|
| `spots` | `name` (unique), `noiseLevel`, `outlets` (true/false), `wifi` (true/false), `closingTime`, `tags` (array), `lat`, `lng` |
| `ratings` | `spotName`, `stars` (1 to 5), `createdAt` |
| `checkins` | `spotName`, `crowdLevel`, `day`, `hour`, `note` (optional), `createdAt` |

**To decide together:**
- What scale is `noiseLevel` (e.g. 1 to 3, or "quiet / moderate / loud")?
- What scale is `crowdLevel`?
- If a spot is renamed, do its ratings and check-ins get updated too?
- With no user accounts, how does someone edit or delete "their" rating or check-in?

---

## Algorithms

- **KNN recommender (Eleah):** Finds the spots most similar to a chosen spot based on noise, outlets, Wi-Fi, and tags, and explains why each one matched. Plain JavaScript, no libraries.
- **Crowded now (Bryan):** Average crowd level from check-ins in the last 2 hours.
- **Crowd forecast (Bryan):** For a chosen spot and day, predicts crowd level at each hour using a weighted average of past check-ins. Check-ins closer to that day and hour count more. Plain JavaScript, no libraries.

---

## Roadmap

### Phase 0: Setup
- [x] **Bryan:** `npm init`, install dependencies (`express`, `mongodb`, `dotenv`), `.gitignore`, push to `main`
- [x] **Eleah:** `db.js` with `connectDB()` and `getDB()`
- [x] **Eleah:** `server.js` with Express, JSON, static `public` folder, connects before listening
- [x] **Eleah:** `package.json` set to ES modules, `start` and `dev` scripts
- [x] **Eleah:** `routes/spots.js` stub, mounted at `/api/spots` in `server.js`
- [ ] **Bryan:** Add `.DS_Store` to `.gitignore`, remove tracked copies with `git rm --cached .DS_Store`, push
- [ ] **Bryan:** Stubs in `routes/ratings.js` and `routes/checkins.js` (export `ratingsRouter` and `checkinsRouter`), push
- [ ] **Eleah:** Mount `ratingsRouter` and `checkinsRouter` in `server.js` after Bryan's stubs are pushed
- [ ] **Eleah:** `public/index.html` shell with nav and `shared.css`
- [ ] **Eleah:** `tests/db.test.js` and `npm test` script
- [ ] **Both:** Pull, run `npm run dev`, confirm "Connected" and "Server running on port 3000"

### Phase 1: Backend
- [ ] **Both:** Agree on the data model above and the API response format
- [ ] **Eleah:** `spots` CRUD routes in `routes/spots.js`
- [ ] **Bryan:** `ratings` CRUD routes and average rating in `routes/ratings.js`
- [ ] **Bryan:** `checkins` CRUD routes and "crowded now" (last 2 hours) in `routes/checkins.js`
- [ ] **Both:** Route tests for your own routes (success, invalid input, missing records)

### Phase 2: Frontend
- [ ] **Eleah:** `spots.html` with add, edit, delete form and filters
- [ ] **Bryan:** `ratings.html` with star rating UI
- [ ] **Bryan:** `checkins.html` with check-in form

### Phase 3: Algorithms
- [ ] **Eleah:** KNN recommender in `ml/knn.js` with explanations, plus tests
- [ ] **Bryan:** Weighted forecast in `ml/forecast.js`, plus tests

### Phase 4: Map and Polish
- [ ] **Eleah:** Google Map limited to campus bounds
- [ ] **Both:** Seed data for own collections
- [ ] **Both:** Styling pass on own pages
- [ ] **Both:** Deploy, final README, demo video

---

## What's Next

**Bryan:** Fix `.DS_Store`, add stubs to `routes/ratings.js` and `routes/checkins.js`, push, and tell Eleah. Then pull and confirm the server runs for you. After Eleah mounts your routes, start Phase 1 on a `bryan/ratings` branch.

**Eleah:** `index.html` shell, then `db.test.js`. Mount Bryan's routes once his stubs are pushed.

**Both:** Settle the "To decide together" questions in the Data Model section before writing CRUD routes.

---

## Running Locally

**You need:** Node.js, your own `.env` (see above), and your IP added in Atlas Network Access.

    npm install
    npm run dev

Then open http://localhost:3000

You should see "Connected" and "Server running on port 3000." If the connection fails, check your `MONGO_URI` and Atlas Network Access.

To run tests:

    npm test