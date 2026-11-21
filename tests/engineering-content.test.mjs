/**
 * Acceptance & numerical-integrity checks for Part 3 (AI Engineering in
 * Production, tracks 26–33), its two interactive labs (`rag-eval`,
 * `ai-system-budget`), and the bilingual `/roadmap/` route.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { objectArrayField, objectField, scalarField, splitFrontmatter, stringArrayField, stringField } from '../scripts/content-utils.mjs'
import { aiSystemBudget, bm25TermScore, hnswMemory, judgeCalibration, retrievalMetrics, rrfScore, voiceTurnLatencyMs } from '../src/lib/engineering-math.ts'

const LOCALES = ['en', 'pt-br']
const DIST = process.env.LLMDEEPDIVE_DIST_ROOT ?? 'dist'
const inventory = JSON.parse(readFileSync('docs/plans/ai-engineering-roadmap/inventory.json', 'utf8'))
const NEW_TRACKS = new Set(inventory.tracks.map((track) => track.id))
const NEW_LESSONS = new Map(inventory.lessons.map((lesson) => [lesson.id, lesson]))

function readLesson(locale, trackId, id) {
  const file = join('src/content/lessons', locale, trackId, `${id}.mdx`)
  assert.ok(existsSync(file), `${file} missing`)
  return { file, ...splitFrontmatter(file) }
}

for (const locale of LOCALES) {
  test(`${locale}: every Part 3 inventory lesson matches frozen frontmatter, titles and quiz pattern`, () => {
    const seenTitles = new Set()
    for (const planned of inventory.lessons) {
      const { file, frontmatter, body } = readLesson(locale, planned.track, planned.id)
      assert.equal(stringField(frontmatter, 'id', file), planned.id, `${file}: id`)
      assert.equal(stringField(frontmatter, 'track', file), planned.track, `${file}: track`)
      assert.equal(scalarField(frontmatter, 'order', file), planned.order, `${file}: order`)
      assert.equal(stringField(frontmatter, 'tier', file), planned.tier, `${file}: tier`)
      assert.equal(stringField(frontmatter, 'locale', file), locale, `${file}: locale`)
      assert.deepEqual([...stringArrayField(frontmatter, 'prerequisites', file)].sort(), [...planned.prerequisites].sort(), `${file}: prerequisites`)
      assert.deepEqual([...stringArrayField(frontmatter, 'unlocks', file)].sort(), [...planned.unlocks].sort(), `${file}: unlocks`)

      const title = stringField(frontmatter, 'title', file)
      assert.equal(title, locale === 'en' ? planned.titleEn : planned.titlePt, `${file}: title`)
      assert.ok(title.length <= 60, `${file}: title over 60 chars`)
      assert.ok(!seenTitles.has(title), `${file}: duplicate title "${title}"`)
      seenTitles.add(title)

      const quiz = objectArrayField(frontmatter, 'quiz', file)
      assert.equal(quiz.length, 3, `${file}: 3 quiz items`)
      quiz.forEach((item, index) => {
        assert.equal(item.options.length, 4, `${file}: quiz ${index + 1} options`)
        assert.equal(item.correctIndex, planned.correctIndexPattern[index], `${file}: quiz ${index + 1} correctIndex`)
      })

      const lab = objectField(frontmatter, 'lab', file)
      if (planned.lab) assert.deepEqual(lab, planned.lab, `${file}: lab`)
      else assert.equal(lab, undefined, `${file}: unexpected lab`)

      if (planned.figure) {
        assert.ok(body.includes(`<Figure id="${planned.figure}"`), `${file}: missing <Figure id="${planned.figure}" />`)
      }
    }
  })
}

test('Part 3 unlocks are the exact inverse of Part 3 prerequisites', () => {
  for (const planned of inventory.lessons) {
    for (const prereq of planned.prerequisites) {
      const upstream = NEW_LESSONS.get(prereq)
      if (upstream) assert.ok(upstream.unlocks.includes(planned.id), `${prereq} must unlock ${planned.id}`)
    }
    for (const unlocked of planned.unlocks) {
      const downstream = NEW_LESSONS.get(unlocked)
      assert.ok(downstream, `${planned.id} unlocks unknown lesson ${unlocked}`)
      assert.ok(downstream.prerequisites.includes(planned.id), `${unlocked} must require ${planned.id}`)
    }
  }
})

// Pin derived numbers from `src/lib/engineering-math.ts` across both locales
// so prose and code cannot drift apart.
test('derived arithmetic in Part 3 lessons matches src/lib/engineering-math.ts in both locales', () => {
  const fp32 = hnswMemory({ vectors: 1_000_000, dims: 1536, bytesPerDim: 4, m: 16 })
  const int8 = hnswMemory({ vectors: 1_000_000, dims: 1536, bytesPerDim: 1, m: 16 })
  const bin = hnswMemory({ vectors: 1_000_000, dims: 1536, bytesPerDim: 0.125, m: 16 })
  const bm25 = bm25TermScore({ tf: 3, df: 250, docLen: 400, avgDocLen: 250, corpusSize: 10000 })
  const rrfB = rrfScore([3, 2])
  const ir = retrievalMetrics({ hits: [false, true, false, true, true, false, false, true], totalRelevant: 5, k: 5 })
  const bal = judgeCalibration({ tp: 42, fp: 8, fn: 6, tn: 44 })
  const imb = judgeCalibration({ tp: 90, fp: 5, fn: 4, tn: 1 })
  const sys = aiSystemBudget({
    retrievalMs: 85, guardrailMs: 45, ttftMs: 240, outputTokens: 250, decodeTps: 60,
    cacheHitRate: 0.35, cacheLookupMs: 18, falseHitRate: 0.02,
    monthlyRequestsK: 1000, costPer1kUncachedUsd: 4.5, provisionedMonthlyUsd: 2600,
  })
  const voiceCascaded = voiceTurnLatencyMs({ vadEndpointMs: 300, sttFinalMs: 220, llmTtftMs: 380, ttsFirstAudioMs: 180, networkRttMs: 90 })
  const voiceStreaming = voiceTurnLatencyMs({ vadEndpointMs: 180, sttFinalMs: 0, llmTtftMs: 210, ttsFirstAudioMs: 0, networkRttMs: 70 })

  const fmt = (locale, num, digits) => {
    const raw = num.toFixed(digits)
    return locale === 'pt-br' ? raw.replace('.', ',') : raw
  }

  for (const locale of LOCALES) {
    const l274 = readLesson(locale, '27-retrieval-and-hybrid-search', '27.4-ann-vector-indexes-and-hnsw').body
    assert.ok(l274.includes(fmt(locale, fp32.totalGiB, 2)), `${locale} 27.4 missing fp32 GiB`)
    assert.ok(l274.includes(fmt(locale, int8.totalGiB, 2)), `${locale} 27.4 missing int8 GiB`)
    assert.ok(l274.includes(fmt(locale, bin.totalGiB, 2)), `${locale} 27.4 missing binary GiB`)

    const l275 = readLesson(locale, '27-retrieval-and-hybrid-search', '27.5-bm25-hybrid-search-and-rrf').body
    assert.ok(l275.includes(fmt(locale, bm25.score, 3)), `${locale} 27.5 missing BM25 score`)
    assert.ok(l275.includes(fmt(locale, rrfB, 5)), `${locale} 27.5 missing RRF Doc B score`)

    const l292 = readLesson(locale, '29-llm-and-rag-evaluations', '29.2-retrieval-and-generation-metrics').body
    assert.ok(l292.includes(fmt(locale, ir.recallAtK * 100, 1)), `${locale} 29.2 missing Recall@5`)
    assert.ok(l292.includes(fmt(locale, ir.ndcgAtK, 3)), `${locale} 29.2 missing NDCG@5`)

    const l293 = readLesson(locale, '29-llm-and-rag-evaluations', '29.3-llm-as-a-judge-and-calibration').body
    assert.ok(l293.includes(fmt(locale, bal.kappa, 3)), `${locale} 29.3 missing balanced kappa`)
    assert.ok(l293.includes(fmt(locale, imb.kappa, 3)), `${locale} 29.3 missing imbalanced kappa`)

    const l311 = readLesson(locale, '31-ai-system-design-and-caching', '31.1-end-to-end-latency-budgets').body
    const uncachedStr = locale === 'pt-br' ? '4.520' : '4,520'
    const effectiveStr = locale === 'pt-br' ? '2.944' : '2,944'
    assert.ok(l311.includes(uncachedStr) || l311.includes(String(Math.round(sys.uncachedLatencyMs))), `${locale} 31.1 missing uncached latency`)
    assert.ok(l311.includes(effectiveStr) || l311.includes(String(Math.round(sys.effectiveLatencyMs))), `${locale} 31.1 missing effective latency`)

    const l334 = readLesson(locale, '33-multimodal-voice-and-system-defense', '33.4-realtime-voice-agents-and-barge-in').body
    const cascStr = locale === 'pt-br' ? '1.170' : '1,170'
    assert.ok(l334.includes(cascStr) || l334.includes(String(voiceCascaded)), `${locale} 33.4 missing cascaded voice latency`)
    assert.ok(l334.includes(String(voiceStreaming)), `${locale} 33.4 missing streaming voice latency`)
  }
})

function extractLabOut(html, labId, outKey) {
  const formMatch = html.match(new RegExp(`<form[^>]*data-lab="${labId}"[\\s\\S]*?<\\/form>`, 'u'))
  assert.ok(formMatch, `missing form[data-lab="${labId}"]`)
  const outMatch = formMatch[0].match(new RegExp(`<b[^>]*data-out="${outKey}"[^>]*>([^<]+)<\\/b>`, 'u'))
  assert.ok(outMatch, `missing [data-out="${outKey}"] inside [data-lab="${labId}"]`)
  return outMatch[1].trim()
}

for (const locale of LOCALES) {
  test(`${locale}: built /roadmap/ links all 34 tracks and both new labs render exact [data-out] defaults`, () => {
    const prefix = locale === 'en' ? '' : 'pt-br'
    const roadmapHtml = readFileSync(join(DIST, prefix, 'roadmap', 'index.html'), 'utf8')
    assert.ok(roadmapHtml.includes('roadmap-view-full'), `${locale} roadmap missing full view radio`)
    assert.ok(roadmapHtml.includes('roadmap-view-100'), `${locale} roadmap missing 100-day radio`)
    assert.ok(roadmapHtml.includes('L15'), `${locale} roadmap missing level L15`)
    assert.ok(existsSync(join(DIST, 'og', ...(prefix ? [prefix] : []), 'roadmap.png')), `${locale} roadmap OG card missing`)
    const linkedTracks = new Set([...roadmapHtml.matchAll(/\/lessons\/(\d+)-[^/"']+\//gu)].map((m) => Number(m[1])))
    assert.equal(linkedTracks.size, 34, `${locale} roadmap should link all 34 tracks (got ${linkedTracks.size})`)

    const ragLabHtml = readFileSync(join(DIST, prefix, 'lessons', '29-llm-and-rag-evaluations', '29.2-retrieval-and-generation-metrics', 'index.html'), 'utf8')
    assert.equal(extractLabOut(ragLabHtml, 'rag-eval', 'recall'), locale === 'pt-br' ? '60,0%' : '60.0%')
    assert.equal(extractLabOut(ragLabHtml, 'rag-eval', 'precision'), locale === 'pt-br' ? '60,0%' : '60.0%')
    assert.equal(extractLabOut(ragLabHtml, 'rag-eval', 'rr'), locale === 'pt-br' ? '0,500' : '0.500')
    assert.equal(extractLabOut(ragLabHtml, 'rag-eval', 'ndcg'), locale === 'pt-br' ? '0,491' : '0.491')

    const sysLabHtml = readFileSync(join(DIST, prefix, 'lessons', '31-ai-system-design-and-caching', '31.1-end-to-end-latency-budgets', 'index.html'), 'utf8')
    assert.equal(extractLabOut(sysLabHtml, 'ai-system-budget', 'uncached'), locale === 'pt-br' ? '4.520 ms' : '4,520 ms')
    assert.equal(extractLabOut(sysLabHtml, 'ai-system-budget', 'effective'), locale === 'pt-br' ? '2.944 ms' : '2,944 ms')
    assert.equal(extractLabOut(sysLabHtml, 'ai-system-budget', 'falseHits'), locale === 'pt-br' ? '70,0' : '70.0')
    assert.equal(extractLabOut(sysLabHtml, 'ai-system-budget', 'monthlyPayg'), locale === 'pt-br' ? 'USD 2.925' : 'USD 2,925')
    assert.equal(extractLabOut(sysLabHtml, 'ai-system-budget', 'monthlySaved'), locale === 'pt-br' ? 'USD 1.575' : 'USD 1,575')
  })
}
