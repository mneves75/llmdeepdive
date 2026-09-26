// Music and sound effects as one piece: A minor → C major, 120 BPM, 23.0 s.
// Writes audio.wav (48 kHz, 16-bit stereo). Deterministic (seeded noise).
import { writeFileSync } from 'node:fs'

const SR = 48000
const DUR = 23.0
const N = Math.round(SR * DUR)
const L = new Float32Array(N), R = new Float32Array(N)       // dry mix
const SL = new Float32Array(N), SR_ = new Float32Array(N)    // reverb send
const DL = new Float32Array(N), DR = new Float32Array(N)     // delay send (arp)
const duckSrc = new Float32Array(N)                          // kick envelope for sidechain
const duckable = { L: new Float32Array(N), R: new Float32Array(N) }

const TAU = Math.PI * 2
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12)
let seed = 0x5eed1234
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const noise = () => rnd() * 2 - 1
const idx = (t) => Math.max(0, Math.min(N, Math.round(t * SR)))

// Harmony: bars of 2 s.
const CH = {
  Am: { root: 45, pad: [57, 60, 64, 67] },
  F: { root: 41, pad: [53, 57, 60, 64] },
  C: { root: 48, pad: [55, 60, 64, 67] },
  G: { root: 43, pad: [55, 59, 62, 67] },
  Cadd9: { root: 48, pad: [60, 64, 67, 74] },
}
const BARS = [[0, 2, 'Am'], [2, 4, 'F'], [4, 6, 'C'], [6, 8, 'G'], [8, 10, 'Am'], [10, 12, 'F'], [12, 14, 'C'], [14, 16, 'G'], [16, 18, 'Am'], [18, 20, 'G'], [20, 23, 'Cadd9']]
const chordAt = (t) => CH[(BARS.find(([a, b]) => t >= a && t < b) ?? BARS[BARS.length - 1])[2]]

// ── Pad: detuned band-limited saws, slow envelope, gentle low-pass ─────────
for (const [a, b, name] of BARS) {
  const { pad } = CH[name]
  const s0 = idx(a - 0.05), s1 = idx(Math.min(DUR, b + (b >= DUR ? 0 : 0.35)))
  const lpState = [[0, 0], [0, 0]]
  for (const [ni, m] of pad.entries()) {
    const detunes = [-7, 0, 7]
    for (const [di, cents] of detunes.entries()) {
      const f = hz(m) * Math.pow(2, cents / 1200)
      const pan = di === 0 ? 0.5 : di === 1 ? 0.2 : 0.8
      let ph = (ni * 0.37 + di * 0.21) % 1
      for (let s = s0; s < s1; s += 1) {
        const t = s / SR
        const att = Math.min(1, (t - (a - 0.05)) / 0.35)
        const rel = b >= DUR ? Math.min(1, (DUR - t) / 2.2) : Math.min(1, (b + 0.35 - t) / 0.4)
        const env = Math.max(0, Math.min(att, rel))
        let v = 0
        for (let k = 1; k <= 7; k += 1) v += Math.sin(TAU * ph * k) / k
        ph += f / SR; if (ph >= 1) ph -= 1
        const bright = t < 4 ? 0.95 : t < 20 ? 0.8 : 0.7
        const x = v * env * 0.018 * bright
        duckable.L[s] += x * (1 - pan); duckable.R[s] += x * pan
        SL[s] += x * 0.35 * (1 - pan); SR_[s] += x * 0.35 * pan
      }
    }
  }
  void lpState
}

// ── Sub bass (4–20 s) follows the roots, ducked by the kick ─────────────────
for (let s = idx(4.0); s < idx(20.0); s += 1) {
  const t = s / SR
  const f = hz(chordAt(t).root - 12)
  const env = Math.min(1, (t - 4.0) / 0.05) * Math.min(1, (20.0 - t) / 0.08)
  const x = Math.sin(TAU * f * t) * 0.085 * env
  duckable.L[s] += x; duckable.R[s] += x
}

// ── Hook drone (0–4 s): soft A1/A2 swell so the hook is not silent ────────
for (let s = 0; s < idx(4.02); s += 1) {
  const t = s / SR
  const env = Math.min(1, t / 1.2) * Math.min(1, (4.02 - t) / 0.06)
  const x = (Math.sin(TAU * hz(33) * t) * 0.05 + Math.sin(TAU * hz(45) * t) * 0.03) * env
  L[s] += x; R[s] += x
}

// ── Arp pluck (1.4–20 s): chord tones an octave up, 8th notes ──────────────
const ARP = [0, 1, 2, 3, 2, 1, 2, 3]
for (let n = 0; ; n += 1) {
  const t0 = 1.5 + n * 0.25
  if (t0 >= 20.0) break
  const { pad } = chordAt(t0)
  const m = pad[ARP[n % ARP.length]] + 12
  const f = hz(m)
  const lvl = t0 < 4 ? 0.06 * Math.min(1, (t0 - 1.4) / 1.2) : 0.06
  const s0 = idx(t0), s1 = idx(Math.min(DUR, t0 + 0.6))
  const pan = n % 2 ? 0.35 : 0.65
  for (let s = s0; s < s1; s += 1) {
    const tt = s / SR - t0
    const env = Math.exp(-tt * 9) * Math.min(1, tt / 0.004)
    const x = (Math.sin(TAU * f * tt) + 0.28 * Math.sin(TAU * f * 3 * tt) * Math.exp(-tt * 20)) * env * lvl
    duckable.L[s] += x * (1 - pan); duckable.R[s] += x * pan
    DL[s] += x * 0.5; DR[s] += x * 0.5
    SL[s] += x * 0.25; SR_[s] += x * 0.25
  }
}

// ── Kick (4–20 s on every beat) + impact at 20.0 ───────────────────────────
function kick(t0, lvl, decay = 9) {
  const s0 = idx(t0), s1 = idx(Math.min(DUR, t0 + 0.6))
  let ph = 0
  for (let s = s0; s < s1; s += 1) {
    const tt = s / SR - t0
    const f = 46 + 105 * Math.exp(-tt * 32)
    ph += f / SR
    const env = Math.exp(-tt * decay)
    const click = tt < 0.004 ? noise() * (1 - tt / 0.004) * 0.25 : 0
    const x = (Math.sin(TAU * ph) * env + click) * lvl
    L[s] += x; R[s] += x
    duckSrc[s] = Math.max(duckSrc[s], Math.exp(-tt * 7))
  }
}
for (let t = 4.0; t < 19.99; t += 0.5) kick(t, 0.36)
kick(20.0, 0.46, 3.2)

// ── Clap on beats 2 & 4 (8–20 s), hats on off-beats (8–20 s) ───────────────
function burst(t0, lvl, dur, lo, hi, pan, send) {
  const s0 = idx(t0), s1 = idx(Math.min(DUR, t0 + dur * 6))
  let lp1 = 0, lp2 = 0
  const a1 = 1 - Math.exp(-TAU * hi / SR), a2 = 1 - Math.exp(-TAU * lo / SR)
  for (let s = s0; s < s1; s += 1) {
    const tt = s / SR - t0
    const n0 = noise()
    lp1 += a1 * (n0 - lp1); lp2 += a2 * (lp1 - lp2)
    const band = lp1 - lp2
    const env = Math.exp(-tt / dur) * Math.min(1, tt / 0.002)
    const x = band * env * lvl
    L[s] += x * (1 - pan); R[s] += x * pan
    SL[s] += x * send; SR_[s] += x * send
  }
}
for (let t = 8.0; t < 19.99; t += 1.0) burst(t + 0.5, 0.2, 0.05, 900, 4200, 0.5, 0.45)
for (let t = 8.0; t < 19.99; t += 0.5) burst(t + 0.25, 0.1, 0.012, 7000, 16000, (t * 2) % 2 ? 0.35 : 0.65, 0.05)

// ── Riser into the reveal, whooshes on each cut ────────────────────────────
function sweep(tStart, tPeak, tEnd, fLo, fHi, lvl, send) {
  const s0 = idx(tStart), s1 = idx(tEnd)
  let y1 = 0, y2 = 0, x1 = 0, x2 = 0
  for (let s = s0; s < s1; s += 1) {
    const t = s / SR
    const up = t <= tPeak ? (t - tStart) / (tPeak - tStart) : 1 - (t - tPeak) / (tEnd - tPeak)
    const env = Math.pow(Math.max(0, up), 2)
    const f = fLo * Math.pow(fHi / fLo, Math.min(1, (t - tStart) / (tEnd - tStart)))
    const w0 = TAU * f / SR, q = 1.4, al = Math.sin(w0) / (2 * q), cs = Math.cos(w0)
    const b0 = al, b2 = -al, a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al
    const x0 = noise()
    const y0 = (b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2) / a0
    x2 = x1; x1 = x0; y2 = y1; y1 = y0
    const x = y0 * env * lvl
    L[s] += x * 0.55; R[s] += x * 0.45
    SL[s] += x * send; SR_[s] += x * send
  }
}
sweep(2.9, 3.98, 4.08, 300, 5200, 0.34, 0.25)
for (const cut of [7.5, 11.0, 15.0, 18.0]) sweep(cut - 0.3, cut, cut + 0.3, 500, 2600, 0.2, 0.3)
sweep(19.35, 19.98, 20.06, 400, 6000, 0.26, 0.3)

// ── Counter ticks (1.5–2.3 s): A-minor pentatonic, rising ──────────────────
function blip(t0, m, lvl, decay, pan = 0.5, send = 0.3) {
  const f = hz(m)
  const s0 = idx(t0), s1 = idx(Math.min(DUR, t0 + 5 / decay))
  for (let s = s0; s < s1; s += 1) {
    const tt = s / SR - t0
    const env = Math.exp(-tt * decay) * Math.min(1, tt / 0.003)
    const x = (Math.sin(TAU * f * tt) + 0.35 * Math.sin(TAU * f * 2.76 * tt) * Math.exp(-tt * decay * 2)) * env * lvl
    L[s] += x * (1 - pan); R[s] += x * pan
    SL[s] += x * send; SR_[s] += x * send
  }
}
const PENTA = [81, 84, 86, 88, 91, 93, 96, 98, 100]
for (let i = 0; i < 12; i += 1) {
  const p = i / 11
  const t = 1.5 + 0.8 * (1 - Math.pow(1 - p, 2.2))
  blip(t, PENTA[Math.min(PENTA.length - 1, Math.floor(p * PENTA.length))], 0.028, 38, 0.3 + 0.4 * p)
}

// ── Typing (11.6–13.2 s): soft ticks, very quiet ──────────────────────────
for (let t = 11.62; t < 13.2; t += 0.055 + rnd() * 0.05) burst(t, 0.05, 0.004, 1800, 6500, 0.45 + rnd() * 0.1, 0.05)

// ── "Correct" bell (14.3 s) and outro chime (20.05 s) ──────────────────────
blip(14.32, 76, 0.07, 5, 0.45, 0.5)
blip(14.36, 81, 0.06, 5, 0.55, 0.5)
blip(14.40, 84, 0.05, 5, 0.5, 0.5)
;[72, 76, 79, 86].forEach((m, i) => blip(20.08 + i * 0.075, m, 0.075, 2.6, 0.35 + i * 0.1, 0.6))

// ── Sidechain the pad, bass and arp under the kick ─────────────────────────
for (let s = 0; s < N; s += 1) {
  const g = 1 - 0.38 * duckSrc[s]
  L[s] += duckable.L[s] * g; R[s] += duckable.R[s] * g
}

// ── Ping-pong delay (dotted 8th) for the arp ───────────────────────────────
{
  const d = Math.round(SR * 0.375), fb = 0.34
  const bl = new Float32Array(N), br = new Float32Array(N)
  for (let s = 0; s < N; s += 1) {
    const inL = DL[s], inR = DR[s]
    const outL = s >= d ? br[s - d] : 0
    const outR = s >= d ? bl[s - d] : 0
    bl[s] = inL + outR * fb; br[s] = inR + outL * fb
    L[s] += outL * 0.5; R[s] += outR * 0.5
    SL[s] += outL * 0.15; SR_[s] += outR * 0.15
  }
}

// ── Schroeder reverb on the send bus ───────────────────────────────────────
function reverb(input, delaysMs) {
  const out = new Float32Array(N)
  for (const ms of delaysMs.combs) {
    const d = Math.round(SR * ms / 1000), buf = new Float32Array(d)
    let p = 0, lp = 0
    for (let s = 0; s < N; s += 1) {
      const y = buf[p]
      lp += 0.45 * (y - lp)
      buf[p] = input[s] + lp * 0.84
      out[s] += y * 0.25
      p = (p + 1) % d
    }
  }
  for (const ms of delaysMs.allpass) {
    const d = Math.round(SR * ms / 1000), buf = new Float32Array(d)
    let p = 0
    for (let s = 0; s < N; s += 1) {
      const x = out[s], y = buf[p] - 0.6 * x
      buf[p] = x + 0.6 * y
      out[s] = y
      p = (p + 1) % d
    }
  }
  return out
}
const revL = reverb(SL, { combs: [29.7, 37.1, 41.1, 43.7], allpass: [5.0, 1.7] })
const revR = reverb(SR_, { combs: [30.9, 36.3, 40.7, 44.9], allpass: [5.3, 1.9] })
for (let s = 0; s < N; s += 1) { L[s] += revL[s] * 0.55; R[s] += revR[s] * 0.55 }

// ── Master: fade edges, soft limiter, normalise to −1.5 dBFS peak ──────────
let peak = 0
for (let s = 0; s < N; s += 1) {
  const t = s / SR
  const fade = Math.min(1, t / 0.02) * Math.min(1, (DUR - t) / 0.35)
  L[s] = Math.tanh(L[s] * 1.1 * fade); R[s] = Math.tanh(R[s] * 1.1 * fade)
  peak = Math.max(peak, Math.abs(L[s]), Math.abs(R[s]))
}
const gain = Math.pow(10, -1.5 / 20) / peak
const data = Buffer.alloc(44 + N * 4)
data.write('RIFF', 0); data.writeUInt32LE(36 + N * 4, 4); data.write('WAVE', 8)
data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22)
data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34)
data.write('data', 36); data.writeUInt32LE(N * 4, 40)
for (let s = 0; s < N; s += 1) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[s] * gain)) * 32767), 44 + s * 4)
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[s] * gain)) * 32767), 46 + s * 4)
}
writeFileSync(new URL('./audio.wav', import.meta.url), data)
console.log(`audio.wav · ${DUR}s · peak before gain ${peak.toFixed(3)} · gain ${gain.toFixed(3)}`)
