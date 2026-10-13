# Study Spot Finder: Design Document

**Authors:** Eleah Burman and Bryan James
**Class:** [CS5610 Web Development](CLASS_LINK_HERE), Northeastern University
**Project repo:** [study-spot-finder](https://github.com/BryanSJamesDev/study-spot-finder)

---

## 1. Project Description

### The problem

Finding a good place to study on campus usually means walking from building to building until you find an open seat. Even then, the spot might be too loud, have no outlets, or close an hour after you sit down. Students end up relying on word of mouth or luck, and the information they need (how quiet is it, can I plug in my laptop, is it packed right now) isn't written down anywhere.

### Our solution

Study Spot Finder is a web app where Northeastern students share and find study spots on campus. Students can:

- **Add and browse study spots** with details like noise level, outlets, Wi-Fi, closing time, and tags such as "group study" or "natural light."
- **See spots on a campus map** and filter them to match how they like to study.
- **Rate spots** from 1 to 5 stars and see each spot's average rating.
- **Check in** to report how crowded a spot is, and see how busy it is right now based on the last 2 hours of check-ins.
- **Get recommendations** for similar spots, using a k-nearest neighbors algorithm that explains why each spot matched.
- **See a crowd forecast** that predicts how busy a spot will be at each hour of a chosen day, based on past check-ins.

### Who it's for

Northeastern students who study on campus, especially those who have specific needs, like a quiet room, an outlet, or a table for a group, and don't want to waste time searching.

### Why it's useful

The app turns scattered, word-of-mouth knowledge into shared, searchable information. Because students add the spots, ratings, and check-ins themselves, the information stays current, and the more people use it, the better the recommendations and forecasts get.

---

## 2. User Personas

### Maya, the quiet-study grad student

- **Who:** 26, first-year Master's student in Data Science. Commutes from Brooklyn three days a week.
- **Habits:** Comes to campus with a long block of time between classes. Needs a silent space and an outlet, since her laptop battery dies by midday.
- **Frustrations:** Wastes 20 minutes walking between buildings looking for a quiet spot with an open outlet. The library's silent floor is often full by the time she arrives.
- **What she needs from the app:** Filter by noise level and outlets, and see how crowded a spot is before she walks over.

### Jordan, the group-project organizer

- **Who:** 20, third-year undergrad in Business. Always the one coordinating study sessions for group projects.
- **Habits:** Needs a table for 4 to 6 people where talking is okay. Plans sessions a day or two ahead.
- **Frustrations:** Group study rooms are booked up, and open tables are hard to find at peak times. He doesn't know when spots are least busy.
- **What he needs from the app:** Tags like "group study," the crowd forecast to pick a time when tables will be open, and ratings from other students on which spots actually work for groups.

### Priya, the new transfer student

- **Who:** 19, second-year undergrad who just transferred to Northeastern. Doesn't know the campus yet.
- **Habits:** Studies between classes in whatever building she's already in. Likes natural light and a calm, but not silent, atmosphere.
- **Frustrations:** Only knows the main library. Doesn't know which other buildings have good spaces or where they are.
- **What she needs from the app:** The campus map to discover spots near her, and "spots like this" recommendations to find new places similar to one she already likes.
  
---

## 3. User Stories

### Story 1: Adding a study spot (Eleah)

> As a student, I want to add, edit, and delete a study spot with its noise level, outlets, Wi-Fi, closing time, tags, and location, so that other students know what it's like.

Priya finally finds a spot she loves: a bright, calm lounge on the second floor of a building near her classes. It has big windows and a few outlets along the wall, and nobody else seems to know about it. She opens Study Spot Finder, goes to the Spots page, and fills out the "Add a study spot" form. She enters the name, sets the noise level to moderate, marks outlets and Wi-Fi as available, adds the closing time, and tags it "natural light." The spot appears on the map and in the list right away. A week later she notices the lounge now closes earlier, so she clicks "Edit spot" and updates the closing time.

### Story 2: Finding a spot on the map, and similar ones (Eleah)

> As a student, I want to see spots on a map, filter them by noise, outlets, and tags, and see a "spots like this" list on any spot, so that I can quickly find a place that fits how I study.

Maya has three hours before her evening class and needs to get work done. She opens the Spots page and filters by "Quiet" noise level and "Outlets: Available." The map narrows down to two pins near her. She clicks the library, but she's been there before and it's usually packed by noon. She scrolls to "Spots like this," which shows a quiet study room in another building with outlets and Wi-Fi. The app explains the match: same noise level, outlets, and Wi-Fi. She heads there instead.

### Story 3: Rating a study spot (Bryan)

> As a student, I want to give a spot a 1 to 5 star rating, edit or delete my rating, and see each spot's average rating, so that I know which places are worth going to.

Jordan's group met at the student center for their project. The tables were big enough, but it got loud around lunch. After the session, he goes to the Ratings page, picks the student center, and gives it 3 stars. The spot's average rating updates. The next time he plans a session, he checks the Ratings page first and picks a spot with a 4.5 average that other students say works well for groups.

### Story 4: Checking in and seeing the crowd forecast (Bryan)

> As a student, I want to submit, edit, and delete a check-in that reports how crowded a spot is, see how crowded it is right now, and see how busy it's predicted to be at each hour, so that I can avoid crowded times.

Jordan needs to book a group session for Thursday. On the Check-Ins page, he picks a spot and Thursday, and the hourly forecast shows it's busiest at noon and quieter at 9 a.m. He schedules the session for the morning. On Thursday, when the group arrives, he submits a quick check-in: "Not busy," with a note that the big tables by the window are open. Maya, checking the app across campus, sees that it's not crowded right now and decides to head over too.

---

## 4. Design Mockups

Mockups were designed in Figma for both desktop and mobile. [View the full Figma file](https://www.figma.com/design/gAZKaGijIlob4iAr49KcYV/Untitled).

![Study Spot Finder mockups: style guide and all four pages on desktop and mobile](images/mockups.png)

### Style guide

Defines the color tokens, typography, spacing scale, and shared components (nav, cards, buttons, form inputs, tags, and star rating) used on every page. These map directly to the CSS variables in `public/css/shared.css`.

### Home

Introduces the app with a short headline and two main actions: "Explore study spots" and "Report a crowd level." Below that, a few featured spot cards and a three-step summary of what students can do: find a spot, rate it, and check in.

### Spots

The main page for finding a spot. A search bar and filter chips (noise, outlets, Wi-Fi, tags) sit above a map and a list of matching spot cards. Each card shows the spot's rating, tags, and current crowd level. The "Add or edit a study spot" form sits at the bottom of the page.

### Ratings

Shows the top-rated spots with their average ratings. A form lets students pick a spot, choose 1 to 5 stars, and leave an optional review. Recent reviews appear next to the form.

### Check-Ins

A form for reporting how crowded a spot is (Not busy, Moderate, or Very busy) with an optional note. Next to it, an hourly bar chart shows the crowd forecast for a chosen spot. Recent check-ins appear below.

### Mobile

On narrow screens, the nav wraps into a grid, and side-by-side sections (like the map and spot list, or the form and forecast) stack into a single column. Buttons and nav links stay at least 44px tall so they're easy to tap.

---

## 5. Design Decisions

### Visual style

- **Northeastern red.** The primary color (`#b42332`) nods to Northeastern's school colors, but it's used sparingly, only for main buttons, the active nav link, and highlights. Most of the page is white cards on a light gray background, so the information stays the focus.
- **Two fonts.** Manrope for headings gives the app a friendly, modern feel. Source Sans 3 for body text is easy to read at small sizes, which matters for spot details and form labels.
- **Cards for scanning.** Each spot is a card with the same layout: name, location, rating, tags, and crowd level. Students can compare spots at a glance without reading paragraphs.
- **Design tokens.** All colors, font sizes, spacing, and corner radii are CSS variables in `shared.css`. This keeps every page consistent and makes changes easy, since one variable updates the whole app.

### Accessibility

- **Color contrast.** Text and background colors meet WCAG AA contrast so the app is readable for students with low vision.
- **Color is never the only signal.** Crowd levels always show text ("Not busy," "Moderate") along with a color, and star ratings show the number (for example, "4.6 / 5").
- **Standard HTML elements.** Buttons are `<button>`, forms use `<form>` and `<label>`, and the nav uses `<nav>`. This makes the app work with keyboards and screen readers by default.
- **Visible focus.** Every interactive element shows a clear outline when focused with the keyboard.
- **Large tap targets.** Buttons, nav links, and filter chips are at least 44px tall, so they're easy to tap on a phone.
- **ARIA where it helps.** `aria-current="page"` marks the active nav link, and `aria-pressed` shows which filter chips are on.

### Layout and responsiveness

- **Mobile first in mind.** Students often check for a study spot on their phone while walking across campus. On small screens, the nav wraps into a grid and two-column sections stack into one column.
- **Map next to the list.** On desktop, the map and spot list sit side by side so students can connect a pin to its details. On mobile, the map comes first, then the list.

### Product decisions

- **Students add the data.** Spots, ratings, and check-ins all come from students, so the information stays current without anyone maintaining it.
- **Simple crowd levels.** Three levels (Not busy, Moderate, Very busy) are quick to report in a few seconds. More options would make check-ins slower and less likely to happen.
- **Explain recommendations.** The "spots like this" list says *why* each spot matched, so students can trust the suggestion instead of guessing.
- **Simulated users.** The professor confirmed a full login system isn't needed for this project, so the app focuses on the study spot features instead of authentication.