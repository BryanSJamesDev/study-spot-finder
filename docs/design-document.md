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