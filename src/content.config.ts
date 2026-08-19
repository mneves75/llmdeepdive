import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const locale = z.enum(['en', 'pt-br'])
const tier = z.enum(['foundations', 'core', 'advanced', 'frontier'])

const tracks = defineCollection({
  loader: glob({ pattern: '**/*.{json,yaml,yml}', base: './src/content/tracks' }),
  schema: z.object({
    id: z.string().trim().min(1),
    order: z.number().int().nonnegative(),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    tier,
    locale,
  }),
})

const quizItem = z
  .object({
    question: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2),
    correctIndex: z.number().int().nonnegative(),
    explanation: z.string().trim().min(1),
  })
  .refine((item) => item.correctIndex < item.options.length, {
    message: 'correctIndex must point to an existing quiz option',
    path: ['correctIndex'],
  })

const citation = z.object({
  title: z.string().trim().min(1),
  authors: z.string().trim().min(1),
  year: z.number().int().min(1800),
  /**
   * http(s) only. `z.string().url()` alone accepts `javascript:`, `data:` and
   * `vbscript:` — verified against this repo's own zod — and the value is
   * rendered straight into an `<a href>` in Lesson.astro. The CSP would stop
   * such a URI from executing, but a schema that accepts a script URI at all is
   * one review lapse away from shipping one.
   */
  url: z
    .string()
    .url()
    .refine(
      (value) => {
        try {
          return /^https?:$/u.test(new URL(value).protocol)
        } catch {
          return false
        }
      },
      { message: 'citation URLs must use http or https' },
    ),
})

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lessons' }),
  schema: z
    .object({
      id: z.string().trim().regex(/^\d+\.\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/),
      track: z.string().trim().min(1),
      order: z.number().int().positive(),
      title: z.string().trim().min(1),
      summary: z.string().trim().min(1),
      tier,
      locale,
      prerequisites: z.array(z.string().trim().min(1)),
      unlocks: z.array(z.string().trim().min(1)),
      analogy: z.string().trim().min(1),
      teachBack: z.object({
        prompt: z.string().trim().min(1),
        modelAnswer: z.string().trim().min(1),
      }),
      quiz: z.array(quizItem).min(1),
      lab: z
        .object({
          id: z.string().trim().min(1),
          kind: z.enum(['canvas', 'webgl', 'calculator']),
          budgetKb: z.number().positive(),
        })
        .optional(),
      citations: z.array(citation).min(1).optional(),
      citationsNotRequired: z.string().trim().min(1).optional(),
      updated: z.coerce.date(),
    })
    .refine(
      (lesson) => (lesson.citations !== undefined) !== (lesson.citationsNotRequired !== undefined),
      {
        message: 'Provide exactly one of citations or citationsNotRequired',
        path: ['citations'],
      },
    ),
})

export const collections = { tracks, lessons }
