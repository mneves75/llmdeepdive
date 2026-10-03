/**
 * The one ambient clock every moving thing on the site reads.
 *
 * CSS publishes it as `--sky-period: 180s` (src/styles/tokens.css); scenes
 * mirror the same number here so a turning sky, an autorotating instrument and
 * a travelling token never drift out of phase with each other. Every loop runs
 * at the period itself or at a whole-number fraction of it.
 */
export const SKY_PERIOD_S = 180
