# Launch video plan — llmdeepdive.com

## Answers

- **What is it?** A free, open-source, bilingual course that explains how large language models actually work, from what a parameter is to the silicon that runs them.
- **Who is it for, and what does it do for them?** Curious beginners through working engineers, in English or Brazilian Portuguese: 106 lessons per language take you from intuition to mechanism, and you prove you understood each one.
- **What sets it apart?** One real model (Qwen3.8-27B) is the worked example in every lesson, every number comes from its published config, every lesson cites its sources, and a lesson only counts as done when you explain it back and pass its quiz. No login, no tracking.
- **Most impressive claim?** Lesson 0.1's opener: a language model never outputs a word — one forward pass of Qwen3.8-27B returns 248,320 scores.
- **Visual hook?** That sentence, set huge, then the number rolling up to 248,320.
- **Real UI to show?** The home hero and the four curriculum strata; lesson 4.3 (√d_k, √256 = 16); the teach-back typing and the quiz turning "Correct"; the 3D Signal Observatory with its component library; the pt-BR home.
- **Tone?** `default` leaning `polished`: confident, plain-spoken, precise (the site's own voice: rigorous, curious, honest about evidence).
- **Share caption?** "A language model never outputs a word. llmdeepdive shows you what it does output — 106 free lessons, in English and Portuguese."

## Angle

Open on the course's own first surprise and let the real site pay it off. Every visual after the hook is the actual built site (same-origin iframes of `dist/`, driven by script), except the WebGL explorer, captured frame by frame under a controlled clock.

## Identity

Abyssal Core Atlas: abyss `#061a2b`, chart field `#f4f7f2`, ink `#102b3a`, survey cyan `#007687`, signal cyan `#5de7ee`, kelp `#287855`. Display: Avenir Next Condensed heavy, uppercase for titles; body Avenir Next; data face SF Mono. The crosshair mark from the header.

## Storyboard (30 fps, 1920×1080, 23.0 s; cuts on the 120 BPM grid)

| # | Time | Scene | On screen | Motion | Sound |
|---|---|---|---|---|---|
| 1 | 0.0–4.0 | Hook | Abyss ground. "A LANGUAGE MODEL NEVER OUTPUTS A WORD." settles by 0.5 s. At 1.4 s: "IT OUTPUTS" + counter rolling 0 → 248,320 (settles 2.2 s), cyan; data caption "Qwen3.8-27B · one score per output row · lesson 0.1". | Words rise in, staggered; counter ticks. | Pad + pulse; soft ascending ticks under the counter; riser into 4.0. |
| 2 | 4.0–7.5 | Reveal | Left: mark + "llmdeepdive", line "How LLMs actually work. 106 lessons, first principles to silicon." Right: browser window with the real home page, hero, then scrolls to the four strata. | Old text out, then window rises in; eased scroll 5.4–7.2. | Kick enters on 4.0 (drop). Whoosh. |
| 3 | 7.5–11.0 | One real model | Window: lesson 4.3 header "Scaled dot-product attention & the √d_k", then scrolls to its formula. Caption: "One real model. Every number from its config." Data label "Qwen3.8-27B · config.json". | Window swaps (old out left, new in right), scroll 8.6–10.4. | Groove continues; whoosh. |
| 4 | 11.0–15.0 | Explain it back | Window: lesson 0.1 teach-back; an answer types itself in, the 80-character/15-word meter turns kelp; then the quiz: correct answers pick, "Check", verdicts read "Correct". Caption: "Finish a lesson by explaining it back." | Typing 11.6–13.2; scroll to quiz 13.2–13.6; check at 14.0. | Soft key ticks (quiet); in-key bell on "Correct". |
| 5 | 15.0–18.0 | Take it apart | Full-bleed real 3D explorer, rotating; the library selects "Self-attention" and the drawer updates. Caption: "Take a transformer apart. In 3D." | Dip through abyss, slow push-in. | Hat enters; whoosh. |
| 6 | 18.0–20.0 | Bilingual | Two windows: EN home hero and pt-BR hero "Como os modelos de linguagem realmente funcionam". Caption: "In English and Português." | Windows slide in from both sides. | Fill into outro. |
| 7 | 20.0–23.0 | Outro | Abyss. Crosshair mark draws; "llmdeepdive.com"; "Free · bilingual · open source · no login". | Mark draws, URL rises, hold. | Drums drop out; C major chime; pad rings out. |

Scene durations: 4.0 + 3.5 + 3.5 + 4.0 + 3.0 + 2.0 + 3.0 = 23.0 s.

## Readability check (0.3 s per word, from fully visible)

- Hook line 1 (7 words, 2.1 s): visible 0.5–4.0 → 3.5 s. Line 2 + counter (4 words): 2.2–4.0 → 1.8 s. Caption (7 words): 2.2–4.0 → 1.8 s ≈ 2.1 s needed; make caption texture-sized.
- Reveal line (10 words, 3.0 s): visible 4.6–7.5 → 2.9 s — tighten to "How LLMs actually work. 106 free lessons." (7 words, 2.1 s).
- Scene 3 caption (8 words, 2.4 s): 8.0–11.0 → 3.0 s.
- Scene 4 caption (7 words, 2.1 s): 11.4–15.0 → 3.6 s.
- Scene 5 caption (6 words, 1.8 s): 15.4–18.0 → 2.6 s.
- Scene 6 caption (4 words, 1.2 s): 18.3–20.0 → 1.7 s.
- Outro URL + line (7 words, 2.1 s): 20.5–23.0 → 2.5 s.

## Music cue guidance

Own synthesis, 120 BPM, A minor → C major. Bars (2 s): Am F C G | Am F C G | Am G | C (held 3 s). Intro 0–4 pad + pulse; drop at 4.0 (kick, sub, arp); hats from 8.0; drums out at 20.0; C-major chime and pad tail to 23.0. Transitions land on bar or beat lines (4.0, 7.5, 11.0, 15.0, 18.0, 20.0).

## Delivery (measured on the final files)

- `brag.mp4`: H.264 1920×1080, 30 fps, 690 frames, 23.000 s; AAC 48 kHz stereo 192 kb/s, video and audio both start at 0.000 s. 6.6 MB.
- Audio on the muxed file: −13.8 LUFS integrated, −1.4 dBTP true peak (two-pass loudnorm to −14 LUFS, then a −2 dB limiter because AAC added 0.5 dB of true peak).
- `brag.jpg` is the settled hook (t = 3.6 s) and is baked as frame 0 (SSIM 0.9965 between encoded frame 0 and the poster).
- Claims checked against source: 248,320 raw scores per forward pass (lesson 0.1 summary and model answer); 106 lessons in each of `en` and `pt-br`.
- Rebuild: `node work/server.mjs` (serves `dist/` + `work/` on 127.0.0.1:4417), `node capture-explorer.mjs 100 36` (hardware GPU; SwiftShader took ~35 s per frame on a loaded host), `node render.mjs frames`, `zsh assemble.sh 0108`.
