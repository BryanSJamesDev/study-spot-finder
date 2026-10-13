# Study Spot Finder

Find study spots on Northeastern's campus that match how you study.

**Authors:** Eleah Burman and Bryan James
**Class:** [CS5610 Web Development](CLASS_LINK_HERE), Northeastern University
**Stack:** Node.js, Express, Vanilla ES6, MongoDB (Node driver), Google Maps JS API
**Design:** [Figma file](https://www.figma.com/design/gAZKaGijIlob4iAr49KcYV/Untitled)
**Design document:** [docs/design-document.md](docs/design-document.md)
**Deployed site:** _coming soon_
**Demo video:** _coming soon_

---

## Project Objective

A web app that helps students find study spots on campus that match their preferences. Users can add study spots with details like noise level, outlets, Wi-Fi, closing time, and tags, and view them on a map limited to Northeastern's campus. Students can rate spots from 1 to 5 stars and check in to report how crowded a spot is. The app also includes a k-nearest neighbors recommender that suggests similar spots, and a crowd forecast that predicts how busy a spot will be at a given day and time. Both algorithms are written from scratch in plain JavaScript.

**Screenshot:** _coming soon_

---

## Golden Rule

**Only directly edit files you own.** If a change is needed in someone else's file, message them first and agree on who makes it.

Shared files (`server.js`, `db.js`, `package.json`, `public/index.html`, `public/css/shared.css`, `public/css/nav.css`) stay stable after setup unless you both agree on a change.

---

## Folder Structure

    study-spot-finder/
    ├── server.js              # Eleah (shared, done)
    ├── db.js                  # Eleah (shared, done)
    ├── package.json           # Shared (done)
    ├── eslint.config.js       # Shared (done)
    ├── .prettierrc            # Shared (done)
    ├── .gitignore             # Bryan
    ├── LICENSE                # MIT (done)
    ├── README.md              # Both (see rules below)
    ├── docs/
    │   ├── design-document.md # Eleah (project description, personas, stories, mockups)
    │   └── images/
    │       └── mockups.png
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
        │   ├── shared.css     # Eleah (variables, base, buttons, forms, cards)
        │   ├── nav.css        # Eleah (nav on every page)
        │   ├── spots.css      # Eleah
        │   ├── ratings.css    # Eleah
        │   └── checkins.css   # Eleah
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
| Styles | All CSS files | Uses classes from the CSS files |
| Setup | `server.js`, `db.js`, route mounting, nav, license, Prettier/ESLint | Dependencies, `.gitignore`, `ratings.js` and `checkins.js` stubs |

Ratings and check-ins store the **spot name as text**, so Bryan never depends on Eleah's code.

---

## Why This Avoids Collisions

- `server.js` mounts all three route files. Bryan never edits it.
- `index.html` nav links to all pages. Bryan never edits it.
- Every route file started as a stub that exports an empty router, so the server ran from day one.
- All CSS is written by Eleah, split by module. Bryan uses the classes in his pages. If he needs a new style, he asks Eleah.
- Everyone uses `getDB()` from `db.js` to reach the database. Nobody opens a second connection.

---

## Styling Guide

CSS is split into modules. Every page links `shared.css` and `nav.css`, plus its own file:

| Page | CSS files |
|------|-----------|
| `index.html` | `shared.css`, `nav.css` |
| `spots.html` | `shared.css`, `nav.css`, `spots.css` |
| `ratings.html` | `shared.css`, `nav.css`, `ratings.css` |
| `checkins.html` | `shared.css`, `nav.css`, `checkins.css` |

To start a new page, copy the `<head>` and `<nav>` from `index.html`, add the page's own CSS link, and move `aria-current="page"` to that page's nav link.

Common classes:

| Class | File | Use |
|-------|------|-----|
| `container` | shared | Centers content and sets max width (use on `<main>`) |
| `card`, `card__header`, `card__title`, `card__meta`, `card__actions` | shared | Cards and info boxes |
| `panel` | shared | Larger sections like forms and charts |
| `btn btn--primary`, `btn btn--secondary` | shared | Buttons |
| `form`, `field`, `field__label`, `input`, `select`, `textarea` | shared | Forms |
| `field__hint`, `field__error` | shared | Help text and error messages under inputs |
| `tag` | shared | Static tags |
| `spot-grid`, `spots-layout`, `map`, `chip`, `filters`, `card__tags` | spots | Spots page layout, map, and filter chips |
| `rating`, `star-rating` | ratings | Average rating display and 1 to 5 star input |
| `status--success`, `status--warning` | checkins | Crowd badges like "Not busy" or "Moderate" |

Colors, fonts, and spacing are CSS variables in `:root` in `shared.css` (for example `var(--color-primary)` or `var(--space-4)`). Use those instead of hex codes.

---

## Git Workflow

1. Always `git pull origin main` before starting.
2. Work on your own branch: `eleah/feature-name` or `bryan/feature-name`.
3. Before committing, run `npm run format` and `npm run lint`. Fix any lint errors.
4. Open a pull request into `main`. The other person gives it a quick look (this counts as our code review).
5. Never push straight to `main`.
6. **New dependency?** Discuss it with the other person first. Include the `package.json` and `package-lock.json` changes in the same PR as the code that needs them.
7. **README edits:** Only check off your own boxes below. Bigger README changes go in their own PR.
8. Stage files by name (`git add file.js`), not `git add .`, so nothing unexpected gets committed.

---

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Starts the server and restarts on save |
| `npm start` | Starts the server (used for deployment) |
| `npm run lint` | Checks for code errors with ESLint |
| `npm run format` | Formats all files with Prettier |
| `npm run format:check` | Checks formatting without changing files |
| `npm test` | Runs tests with Node's built-in test runner |

ES modules only: use `import` and `export`, never `require()`.

---

## Environment Variables

Each person makes their own `.env` file in the project root. It's gitignored and never pushed.

    MONGO_URI=your-connection-string-here
    PORT=3000
    GOOGLE_MAPS_KEY=

- Get the connection string from Bryan, then swap in your own database username and password.
- Use your own database user. Never share passwords in the repo or chat.
- Bryan manages database users and Network Access in Atlas.
- Eleah adds `GOOGLE_MAPS_KEY` when she starts the map and lets Bryan know. The key needs the **Maps JavaScript API** enabled. Because it's visible in the browser, restrict it to your site's URLs in Google Cloud Console.

**Database name:** `studySpotFinder`

---

## Data Model

Agree on these before building routes. Ratings and check-ins reference spots by **name**, so spot names must be unique. **All three collections need full CRUD** (create, read, update, delete).

| Collection | Fields |
|------------|--------|
| `spots` | `name` (unique), `noiseLevel`, `outlets` (true/false), `wifi` (true/false), `closingTime`, `tags` (array), `lat`, `lng` |
| `ratings` | `spotName`, `stars` (1 to 5), `createdAt` |
| `checkins` | `spotName`, `crowdLevel`, `day`, `hour`, `note` (optional), `createdAt` |

**To decide together:**
- What scale is `noiseLevel` (e.g. 1 to 3, or "quiet / moderate / loud")?
- What scale is `crowdLevel`? The Figma design uses "Not busy / Moderate / Very busy."
- The Figma design adds a `building` / location field on spots and an optional written `review` on ratings. Add them?
- If a spot is renamed, do its ratings and check-ins get updated too?
- With no user accounts, how does someone edit or delete "their" rating or check-in?

---

## API Endpoints (planned)

| Method | Endpoint | Owner |
|--------|----------|-------|
| GET, POST | `/api/spots` | Eleah |
| GET, PUT, DELETE | `/api/spots/:id` | Eleah |
| GET, POST | `/api/ratings` | Bryan |
| GET, PUT, DELETE | `/api/ratings/:id` | Bryan |
| GET, POST | `/api/checkins` | Bryan |
| GET, PUT, DELETE | `/api/checkins/:id` | Bryan |

---

## Algorithms

- **KNN recommender (Eleah):** Finds the spots most similar to a chosen spot based on noise, outlets, Wi-Fi, and tags, and explains why each one matched. Plain JavaScript, no libraries.
- **Crowded now (Bryan):** Average crowd level from check-ins in the last 2 hours.
- **Crowd forecast (Bryan):** For a chosen spot and day, predicts crowd level at each hour using a weighted average of past check-ins. Check-ins closer to that day and hour count more. Plain JavaScript, no libraries.

---

## Rubric Checklist

- [x] Design document as a separate file, linked from this README
- [x] Node + Express backend
- [x] ES modules only (no `require()`)
- [x] MIT license
- [x] ESLint config, zero lint errors
- [x] Prettier formatting
- [ ] At least 2 MongoDB collections with full CRUD (we have 3)
- [ ] Client-side rendering with vanilla JS (no template engines)
- [ ] CSS organized by module
- [ ] 1,000+ database records (via seed scripts)
- [ ] Publicly deployed
- [ ] Narrated public demo video
- [ ] Code review (pull requests)
- [ ] README: authors, class link, objective, screenshot, build instructions
- [ ] Code frozen 24 hours before class
- [ ] Final submission form with thumbnail

---

## Roadmap

Must-haves come first. The map and algorithms come after the core app is deployed and working.

### Phase 0: Setup (done)
- [x] **Bryan:** `npm init`, install dependencies (`express`, `mongodb`, `dotenv`), `.gitignore`, push to `main`
- [x] **Bryan:** `.DS_Store` cleanup
- [x] **Bryan:** Stubs in `routes/ratings.js` and `routes/checkins.js`
- [x] **Eleah:** `db.js` with `connectDB()` and `getDB()`
- [x] **Eleah:** `server.js` with Express, JSON, static `public` folder, connects before listening
- [x] **Eleah:** `package.json` set to ES modules, scripts added
- [x] **Eleah:** All three routers mounted in `server.js`
- [x] **Eleah:** `public/index.html` shell with styled nav
- [x] **Eleah:** CSS split into modules (`shared`, `nav`, `spots`, `ratings`, `checkins`)
- [x] **Eleah:** MIT license, Prettier, ESLint
- [ ] **Eleah:** `tests/db.test.js`
- [ ] **Both:** Pull, run `npm run dev`, confirm "Connected" and "Server running on port 3000"

### Phase 1: Backend (full CRUD)
- [ ] **Both:** Agree on the data model above and the API response format
- [ ] **Eleah:** `spots` CRUD routes in `routes/spots.js`
- [ ] **Bryan:** `ratings` CRUD routes and average rating in `routes/ratings.js`
- [ ] **Bryan:** `checkins` CRUD routes and "crowded now" (last 2 hours) in `routes/checkins.js`
- [ ] **Both:** Route tests for your own routes (success, invalid input, missing records)

### Phase 2: Frontend (client-side rendering)
- [ ] **Eleah:** `spots.html` and `js/spots.js`: fetch from `/api/spots`, render cards, add/edit/delete form, filters
- [ ] **Bryan:** `ratings.html` and `js/ratings.js`: star rating UI, average rating
- [ ] **Bryan:** `checkins.html` and `js/checkins.js`: check-in form, "crowded now"

### Phase 3: Data and Deployment
- [ ] **Both:** Seed scripts in `seed/` for your own collections (1,000+ records total)
- [ ] **Both:** Deploy early and confirm the live site connects to MongoDB

### Phase 4: Map and Algorithms
- [ ] **Eleah:** Google Map limited to campus bounds
- [ ] **Eleah:** KNN recommender in `ml/knn.js` with explanations, plus tests
- [ ] **Bryan:** Weighted forecast in `ml/forecast.js`, plus tests

### Phase 5: Submission
- [ ] **Eleah:** Final styling pass
- [ ] **Both:** Screenshot, deployed URL, and video link in README
- [ ] **Both:** Narrated demo video
- [ ] **Both:** Freeze code 24 hours before class
- [ ] **Both:** Submit the final form with thumbnail

---

## What's Next

**Bryan:** Pull `main`. Then start Phase 1 on a `bryan/ratings` branch in `routes/ratings.js`. Run `npm run format` and `npm run lint` before each commit.

**Eleah:** `db.test.js`, then `spots` CRUD routes on an `eleah/spots` branch.

**Both:** Settle the "To decide together" questions in the Data Model section before writing CRUD routes.

---

## Running Locally

**You need:** Node.js, your own `.env` (see above), and your IP added in Atlas Network Access.

    npm install
    npm run dev

Then open http://localhost:3000

You should see "Connected" and "Server running on port 3000." If the connection fails, check your `MONGO_URI` and Atlas Network Access.

Use `localhost:3000`, not VS Code's Live Server. Live Server can show the HTML, but it doesn't run the `/api` routes.

To run tests:

    npm test

---

## License

[MIT](LICENSE)