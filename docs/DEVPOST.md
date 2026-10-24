# Foothold — Devpost submission

**Tagline (≤ 200 chars):** Foothold breaks any task into tiny steps, asks how much energy you have, and shows you just one step that fits. It's accessible, works offline, and keeps your data private.

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

It works **fully offline with no account**. If you want custom breakdowns, you can add your own Anthropic key, and Claude writes the steps. If that call fails, Foothold falls back to the offline engine and tells you why.

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
- **Optional Claude integration** called directly from the browser with your own key. The model's JSON output is validated with zod, calls time out after 15 seconds, at most 8 calls run in parallel, and the app falls back to the offline engine automatically.
- **A production Content-Security-Policy** that only allows network requests to the app itself and `api.anthropic.com`.
- **Testing:** 53 unit tests (Vitest, about 97% coverage of logic, state, and hooks) and 29 Playwright end-to-end runs on desktop and mobile, including axe scans, keyboard flows, swipe gestures, reduced motion, persistence, and reflow at 320px.
- **CI/CD:** GitHub Actions runs the tests and deploys to GitHub Pages.

## Challenges we ran into

- **Showing fewer things is harder than showing more.** Hiding the list by default felt risky. In the end it became the core of the product.
- **Keeping focus in place.** When a step is marked done, the card's content changes. Our first version remounted the whole card, which dropped keyboard focus to the page body. We restructured it so only the text re-renders and the buttons stay mounted.
- **Never losing data.** A code review found that repeated "I'm stuck" clicks could grow a step past our validation limits, and the next reload would then wipe everything. We now clamp every value at the reducer, cap plan size, and keep a copy of any save that fails to load.

## Accomplishments we're proud of

- A product that is **useful with zero setup**: no sign-up, no key, works offline.
- **Zero automated accessibility violations**, plus the manual work that tools can't check: announcements, focus flow, and shortcuts you can turn off.
- A visual identity, warm editorial "paper", that feels calm rather than clinical.

## What we learned

Accessibility features tend to help everyone. Reading-comfort spacing, "I'm stuck", and the count-up timer were designed for specific needs, but each one also makes the app calmer for anyone who is tired or overwhelmed. We also learned that automated checks like axe catch only part of the picture. Focus flow and announcements needed deliberate design and their own tests.

## What's next

- Sync between devices, with optional end-to-end encryption.
- **Body-doubling:** share a focus session with a friend.
- Learn which step sizes work for each person and adapt the breakdowns.
- Install as a PWA with gentle, opt-in nudges.

## Built with

react · typescript · vite · zod · vitest · playwright · axe-core · claude-api · web-speech-api · github-actions · github-pages
