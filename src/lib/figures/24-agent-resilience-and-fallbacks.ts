/**
 * Figures for track 24 — Resilience & Graceful Degradation.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The breaker mirrors `examples/agent-engineering/src/agentlab/resilience/retry.py`
 * (threshold 5, 30-second pause, as in `test_resilience_retry.py`); the gate mirrors
 * `resilience/fallback.py` and `test_resilience_fallback.py`.
 */
import type { Figure } from './types'

export const TRACK_24_FIGURES = {
  'circuit-breaker-states': {
    lesson: '24.2-retries-and-circuit-breakers',
    title: { en: 'A circuit breaker through one outage', 'pt-br': 'Um circuit breaker ao longo de uma queda' },
    caption: {
      en: 'Only a recorded success closes the breaker. The end of the pause lets exactly one trial call through, and a failed trial starts the pause again.',
      'pt-br': 'Só um sucesso registrado fecha o breaker. O fim da pausa deixa passar exatamente uma chamada de teste, e um teste que falha recomeça a pausa.',
    },
    steps: [
      {
        label: { en: 'The trial fails', 'pt-br': 'O teste falha' },
        caption: {
          en: 'The provider is still down: the single trial fails, the breaker opens again and the next 30 seconds cost the provider nothing.',
          'pt-br': 'O provedor continua fora: o único teste falha, o breaker abre de novo e os próximos 30 segundos não custam nada ao provedor.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Closed', 'pt-br': 'Fechado (closed)' }, detail: { en: 'calls go through · consecutive failures counted', 'pt-br': 'chamadas passam · falhas seguidas são contadas' }, pigment: 'success' },
            { label: { en: 'Fifth failure in a row', 'pt-br': 'Quinta falha seguida' }, detail: { en: 'retry or reconcile verdicts only; a 403 counts as healthy', 'pt-br': 'só veredictos retry ou reconcile; um 403 conta como saudável' }, pigment: 'caution' },
            { label: { en: 'Open', 'pt-br': 'Aberto (open)' }, detail: { en: 'calls fail at once · nothing reaches the provider', 'pt-br': 'chamadas falham na hora · nada chega ao provedor' }, pigment: 'danger' },
            { label: { en: '30 s later: half open', 'pt-br': '30 s depois: meio aberto (half open)' }, detail: { en: 'one trial call allowed, every other caller refused', 'pt-br': 'uma chamada de teste permitida, todas as outras recusadas' }, pigment: 'accent' },
            { label: { en: 'Trial fails → open again', 'pt-br': 'Teste falha → aberto de novo' }, detail: { en: 'the pause restarts from now', 'pt-br': 'a pausa recomeça a partir de agora' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'The trial succeeds', 'pt-br': 'O teste dá certo' },
        caption: {
          en: 'The provider is back: the trial succeeds, the failure count resets to zero and every caller goes through again.',
          'pt-br': 'O provedor voltou: o teste dá certo, a contagem de falhas volta a zero e todas as chamadas passam de novo.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Open', 'pt-br': 'Aberto (open)' }, detail: { en: 'calls fail at once', 'pt-br': 'chamadas falham na hora' }, pigment: 'danger' },
            { label: { en: '30 s later: half open', 'pt-br': '30 s depois: meio aberto (half open)' }, detail: { en: 'one trial call allowed', 'pt-br': 'uma chamada de teste permitida' }, pigment: 'accent' },
            { label: { en: 'Trial succeeds', 'pt-br': 'O teste dá certo' }, detail: { en: 'the run calls record(ok=True)', 'pt-br': 'a execução chama record(ok=True)' }, pigment: 'success' },
            { label: { en: 'Closed', 'pt-br': 'Fechado (closed)' }, detail: { en: 'failure count back to 0 · all calls go through', 'pt-br': 'contagem de falhas volta a 0 · todas as chamadas passam' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
  'fallback-gate': {
    lesson: '24.3-api-to-browser-fallback',
    title: { en: 'Every check a browser fallback must pass', 'pt-br': 'Cada checagem que um fallback pelo navegador precisa passar' },
    caption: {
      en: 'The checks run in this order and the first one that fails ends the attempt with its reason. The browser is reached only after all four identity and permission checks, and its result counts only after the file passes.',
      'pt-br': 'As checagens rodam nesta ordem, e a primeira que falha encerra a tentativa com o seu motivo. O navegador só é acionado depois das quatro checagens de identidade e permissão, e o resultado só conta depois que o arquivo passa.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'The API call fails', 'pt-br': 'A chamada à API falha' }, detail: { en: 'a Failure with its error, route and effect', 'pt-br': 'um Failure com error, route e effect' }, pigment: 'muted' },
        { label: { en: '24.1 says fallback', 'pt-br': 'A 24.1 diz fallback' }, detail: { en: 'a retired route, not a 401, 403 or live 404', 'pt-br': 'rota aposentada, não um 401, 403 ou 404 de rota viva' }, pigment: 'caution' },
        { label: { en: 'A reviewed read equivalent', 'pt-br': 'Um equivalente de leitura revisado' }, detail: { en: 'registered for this exact route · never a write', 'pt-br': 'registrado para esta rota exata · nunca uma escrita' }, pigment: 'caution' },
        { label: { en: 'Same principal', 'pt-br': 'O mesmo principal' }, detail: { en: 'portal account → same user, tenant and roles', 'pt-br': 'conta do portal → mesmo usuário, tenant e papéis' }, pigment: 'caution' },
        { label: { en: 'Same permission', 'pt-br': 'A mesma permissão' }, detail: { en: 'the role the API route required', 'pt-br': 'o papel que a rota da API exigia' }, pigment: 'caution' },
        { label: { en: 'Fixed button pressed', 'pt-br': 'Botão fixo pressionado' }, detail: { en: 'chosen by code, not by a model', 'pt-br': 'escolhido pelo código, não por um modelo' }, pigment: 'accent' },
        { label: { en: 'The file passes track 18’s checks', 'pt-br': 'O arquivo passa nas checagens da trilha 18' }, detail: { en: 'origin, name, columns, period · else no result', 'pt-br': 'origem, nome, colunas, período · senão, nenhum resultado' }, pigment: 'success' },
      ],
    },
  },
} as const satisfies Record<string, Figure>
