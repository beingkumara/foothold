# Foothold — 60-second voiceover

Read this over the walkthrough video (`docs/demo/foothold-demo.webm`, 59 s), or over your own screen recording of the app. Speak slowly. About 140 words fits 60 seconds. The timestamps line up with the captions already in the walkthrough.

> **Line 2 is yours.** Judges respond to a true reason. Replace it with one honest sentence about why you built this. If you have no personal reason, use the fallback in brackets. Don't invent a story.

| Time | Say | On screen |
|---|---|---|
| 0:00 | "The hardest part of a task usually isn't doing it. It's starting." | Opening caption |
| 0:04 | **"I built Foothold because ___."** *(fallback: "A lot of people freeze in front of a long to-do list, and more lists don't help.")* | Logo caption |
| 0:09 | "So I just dump what's on my mind, typed or spoken." | Typing three tasks |
| 0:13 | "Foothold breaks each one into tiny steps, and shows me only one. The first is always something I can do in two minutes." | One card appears |
| 0:20 | "Done. That counts as a win." | Wins log ticks up |
| 0:23 | "Running low on energy? It only offers steps that fit." | Energy → Running low |
| 0:27 | "Still too big? I'm stuck. It makes the step smaller." | Card shrinks |
| 0:31 | "Focus mode has a timer that counts up, so there's no alarm and no pressure." | Focus mode |
| 0:37 | "Everything works from the keyboard, and you can turn the shortcuts off." | Keyboard shortcuts |
| 0:40 | "It's built for accessibility: a hyperlegible font, extra spacing, large text, high contrast, reduced motion, and screen reader announcements. Zero automated accessibility violations." | Settings |
| 0:50 | "No account. It works offline. Your plans stay on your device." | Closing captions |
| 0:55 | "Foothold. One small step at a time." | Wordmark |

## Record and combine (2 minutes)

1. Record your voice on your phone or with QuickTime (File → New Audio Recording), playing the video on mute as a guide. Save it as `voice.m4a` in the `foothold/` folder.
2. Combine it with the walkthrough:

```bash
cd foothold
ffmpeg -i docs/demo/foothold-demo.webm -i voice.m4a \
  -map 0:v -map 1:a -c:v libx264 -crf 20 -pix_fmt yuv420p \
  -af "loudnorm=I=-16:TP=-1.5" -c:a aac -b:a 160k -shortest \
  docs/demo/foothold-narrated.mp4
```

3. Upload `foothold-narrated.mp4` to YouTube (unlisted is fine) and use it as the Devpost video. Put the 20-second launch video second, or in the gallery.
