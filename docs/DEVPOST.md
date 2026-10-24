# Foothold — Devpost submission

**Tagline (≤ 200 chars):** Foothold breaks any task into tiny steps, asks how much energy you have, and shows you just one step that fits. Accessible, offline, no account.

**Try it:** https://beingkumara.github.io/foothold/
**Code:** https://github.com/beingkumara/foothold

---

## Inspiration

Most productivity tools assume the hard part is *remembering* what to do. For many people the hard part is *starting*. That includes people with ADHD, depression, burnout, chronic fatigue, or anyone who is simply overwhelmed. A list of 30 tasks doesn't help someone who is frozen. It makes the freeze worse.

We asked a different question: **what is the smallest thing you could do right now, given how you actually feel?**

## What it does

1. **Dump it.** Type or *say* whatever is on your mind, one task per line.
2. **Foothold breaks each task into 3–7 concrete steps.** The first step is always a 2-minute "foothold", such as *"Open a blank document and title it"*. Each step is tagged with how much energy it takes.
3. **Check in.** Tell Foothold whether you're *running low*, have *some energy*, or have *plenty*.
4. **Do just one thing.** Foothold shows a single step that fits your energy. The full list stays hidden unless you ask for it.
   - **Done** logs a win and brings up the next step.
   - **I'm stuck** replaces the step with smaller, gentler ones.
   - **Not now** sets it aside without guilt.
   - **Start** opens a calm focus mode with a timer that *counts up*, so nothing alarms or expires.
5. A **wins log** counts every step you finished today, which works against the "I did nothing today" feeling.

It works **with no account**, and **offline after your first visit**: a service worker caches the whole app, so it reloads and plans new tasks with no network at all. If you want AI-written steps, add a **free Groq key** (no card needed), press **Test key** to confirm it works, and an open model on Groq writes the steps in under a second. If the AI is busy, unreachable, or you're offline, Foothold falls back to the offline engine and tells you why on screen.

## How it compares

Breaking tasks into steps for ADHD brains isn't new, and good tools already exist. Here is where Foothold sits, as fairly as we can put it:

| | Breaks tasks down | Matches your energy | Decides the *one* next step | Account needed | Works offline | Price |
|---|---|---|---|---|---|---|
| **goblin.tools Magic ToDo** | ✓ AI, adjustable "spiciness", can re-break steps | – | – (you get a list) | No | No (AI is online) | Free web, $1 apps |
| **Tiimo** | ✓ AI checklist from a goal | – | – (visual day planner) | Yes | – | Free tier, Pro subscription |
| **Amazing Marvin** | Manual | You can tag tasks by energy | – | Yes | – | Subscription |
| **Lifestack** | – | ✓ schedules around energy, reads wearables | – | Yes | – | – |
| **Foothold** | ✓ offline engine, optional free AI (Groq) | ✓ low / some / plenty | ✓ one card, the rest hidden | **No** | **Yes** | **Free, open source** |

What's actually new is the combination. Foothold doesn't hand you a better list. It picks one step for how you feel right now and hides the rest. If that step is still too big, "I'm stuck" shrinks it on the spot. It needs no account, keeps your data on your device, works offline, and has accessibility tested in public (zero axe violations, WCAG checks in CI). goblin.tools is the closest in spirit, and we'd happily recommend it. Foothold is for the moment *after* the list, when you still can't start.

*Sources: [goblin.tools Magic ToDo overview](https://www.gigazine.net/gsc_news/en/20250326-magic-todo/), [Sheridan College guide](https://sheridancollege.libguides.com/ai-tools-for-students-module/increase-productivity-with-ai/create-task-lists); [Tiimo listing](https://postmake.io/tools/tiimo), [TWiT on Tiimo](https://twit.tv/posts/tech/how-tiimo-makes-task-and-time-management-easier-neurodiverse-users); [Amazing Marvin and Lifestack comparison](https://lifestack.ai/blog/amazing-marvin-alternative); [ADHD task app roundup 2026](https://super-productivity.com/blog/best-adhd-task-management-apps-2026/). Feature details are taken from public pages and may have changed; "–" means we found no evidence of the feature, not that it definitely doesn't exist.*

## Tested with real people

<!-- Fill this in from the Foothold Field Notes responses. Use only real answers from people who ticked "you may quote". Delete this section if you get no responses. -->
We asked N people to try Foothold on a task they'd been putting off. X of N said seeing one step made it easier to start. The feature they mentioned most was ___.

> "…" — name/role (shared with permission)

## Accessibility

Accessibility was part of the design from the start, not added at the end:

- The body font is **Atkinson Hyperlegible**, designed by the Braille Institute for low-vision readers.
- **Reading-comfort spacing** adds letter, word, and line spacing. We chose this instead of a "dyslexia font", because the evidence for spacing is stronger. The layout also holds up under the full WCAG 1.4.12 text-spacing overrides, which is tested automatically.
- Text size goes up to **150%**, with **no horizontal scroll at 320px** (WCAG 1.4.10). This is tested automatically.
- **High-contrast mode** works in light and dark, alongside light, dark, and system themes.
- **Reduced motion** follows your OS setting live and also has its own toggle. Card flings, the confetti burst, and the breathing blob are all switched off.
- **Every gesture has a button** (WCAG 2.5.7). The focus-mode breathing animation stops whenever you pause (WCAG 2.2.2).
- **Screen readers:** every action is announced through ARIA live regions. Dialogs use native `<dialog>`, so they trap focus, close on Escape, and return focus to where you were.
- **Keyboard-first:** a skip link, strong focus rings, and focus that stays on the button when the step changes, so you can press Done, Done, Done.
- Single-key shortcuts never fire while you type, and **you can switch them off** for speech-control users (WCAG 2.1.4).
- **Voice input** for people who find typing hard, and **read-aloud** for every step.
- **Never colour alone:** energy levels always have a text label and a bar-meter shape. Every control is at least 44px.
- **axe-core finds zero WCAG 2.2 AA violations** in the empty, planned, dark, and high-contrast states. This check runs on every build.

## How we built it

- **React 19, TypeScript (strict), and Vite**, with **Motion** for spring physics, drag gestures, and layout animations. 133 KB of JS gzipped, with fonts self-hosted. There is no backend.
- **A neo-brutalist zine look:** thick ink, hard offset shadows, rotated stickers, and wonky Fraunces type. Your next step sits on a physical deck of cards: fling it right for done or left for not now, watch it shrink when you're stuck, and get a confetti burst when you finish.
- **An offline breakdown engine** (`src/lib/breakdown.ts`) with templates for writing, study, email, cleaning, admin and forms, calls, shopping, code, exercise, cooking, and laundry. A general fallback weaves your own words into the steps.
- **A next-step picker** (`pickNextStep`) that ranks tasks pinned to today first, then tasks already in progress (to protect momentum), then the oldest. It returns the first step that fits your energy. If nothing fits, it offers the gentlest step and tells you openly that it's a stretch.
- **An immutable reducer** for state, persisted to localStorage and **validated with zod** on load and on backup import.
- **Optional free AI via Groq**, called directly from the browser with your own free key (Groq's API allows cross-origin calls, so there's still no backend). It uses `llama-3.3-70b-versatile` and falls through to `openai/gpt-oss-20b` or `llama-3.1-8b-instant` if Groq retires a model. The model's JSON output is validated with zod. Calls time out after 15 seconds, retry once on 429 or 503 (honouring `retry-after`), run at most 8 in parallel (to respect free-tier limits), and skip instantly when the device is offline. A **Test key** button sends a tiny request so you know straight away whether your key works.
- **Real offline support:** a build-time Vite plugin writes a service worker with the exact list of built files, precaches all of them, serves the page network-first, and serves the hashed assets cache-first. An end-to-end test cuts the network, reloads, and plans a new task.
- **A production Content-Security-Policy** that only allows network requests to the app itself and `api.groq.com`.
- **Testing:** 58 unit tests (Vitest, 96% coverage of logic, state, and hooks) and 33 Playwright end-to-end runs on desktop and mobile, including axe scans, keyboard flows, swipe gestures, reduced motion, offline reload, persistence, and reflow at 320px.
- **CI/CD:** GitHub Actions runs the tests and deploys to GitHub Pages.

## Challenges we ran into

- **Showing fewer things is harder than showing more.** Hiding the list by default felt risky. In the end it became the core of the product.
- **Keeping focus in place.** When a step is marked done, the card's content changes. Our first version remounted the whole card, which dropped keyboard focus to the page body. We restructured it so only the text re-renders and the buttons stay mounted.
- **Never losing data.** A code review found that repeated "I'm stuck" clicks could grow a step past our validation limits, and the next reload would then wipe everything. We now clamp every value at the reducer, cap plan size, and keep a copy of any save that fails to load.

## Accomplishments we're proud of

- A product that is **useful with zero setup**: no sign-up, no key, and it works offline after your first visit.
- **Zero automated accessibility violations**, plus the manual work that tools can't check: announcements, focus flow, and shortcuts you can turn off.
- A visual identity, warm editorial "paper", that feels calm rather than clinical.

## What we learned

Accessibility features tend to help everyone. Reading-comfort spacing, "I'm stuck", and the count-up timer were designed for specific needs, but each one also makes the app calmer for anyone who is tired or overwhelmed. We also learned that automated checks like axe catch only part of the picture. Focus flow and announcements needed deliberate design and their own tests.

## What's next

- Sync between devices, with optional end-to-end encryption.
- **Body-doubling:** share a focus session with a friend.
- Learn which step sizes work for each person and adapt the breakdowns.
- Gentle, opt-in reminders once installed as an app.

## Built with

react · typescript · vite · zod · vitest · playwright · axe-core · groq · llama · web-speech-api · github-actions · github-pages
