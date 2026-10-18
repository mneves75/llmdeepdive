/**
 * Figures for track 21 — Bounded Self-Correction.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * The three paths mirror `examples/agent-engineering/src/agentlab/repair/loop.py`
 * and the cases in `tests/test_repair_patch.py` and `tests/test_repair_failure.py`.
 */
import type { Figure, FigureStep } from './types'

const proposed: FigureStep = {
  label: { en: 'The model proposes one patch', 'pt-br': 'O modelo propõe um patch' },
  detail: { en: 'hypothesis + one whole file', 'pt-br': 'hipótese + um arquivo inteiro' },
  pigment: 'muted',
}

export const TRACK_21_FIGURES = {
  'repair-attempt': {
    lesson: '21.3-repair-with-a-bounded-context',
    title: { en: 'Three ways one repair attempt can end', 'pt-br': 'Três jeitos de uma tentativa de reparo terminar' },
    caption: {
      en: 'Every attempt is charged, checked before anything runs, applied to a fresh copy of the original files and judged by the same tests. Only a full, unskipped pass counts.',
      'pt-br': 'Toda tentativa é cobrada, verificada antes de qualquer execução, aplicada a uma cópia nova dos arquivos originais e julgada pelos mesmos testes. Só uma aprovação completa, sem testes pulados, conta.',
    },
    steps: [
      {
        label: { en: 'The fix', 'pt-br': 'A correção' },
        caption: {
          en: 'The patch changes > to >= in pricing.py: two changed lines, inside the allowed file. The same three tests that failed now pass.',
          'pt-br': 'O patch troca > por >= em pricing.py: duas linhas alteradas, dentro do arquivo permitido. Os mesmos três testes que falhavam agora passam.',
        },
        body: {
          kind: 'flow',
          steps: [
            proposed,
            { label: { en: 'Policy check passes', 'pt-br': 'A verificação de política passa' }, detail: { en: 'allowed file · 2 changed lines', 'pt-br': 'arquivo permitido · 2 linhas alteradas' }, pigment: 'accent' },
            { label: { en: 'Applied to a clean copy', 'pt-br': 'Aplicado a uma cópia limpa' }, detail: { en: 'new directory, original files', 'pt-br': 'diretório novo, arquivos originais' }, pigment: 'accent' },
            { label: { en: 'Same tests run', 'pt-br': 'Os mesmos testes rodam' }, detail: { en: '3 ran · 0 failed · 0 skipped', 'pt-br': '3 rodaram · 0 falharam · 0 pulados' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'A test edit', 'pt-br': 'Uma edição de teste' },
        caption: {
          en: 'The patch rewrites test_pricing_quote.py, as a note in the log asked. It is refused before anything runs, and the attempt still counts against the budget.',
          'pt-br': 'O patch reescreve test_pricing_quote.py, como uma nota no log pedia. Ele é recusado antes de qualquer execução, e a tentativa conta no orçamento mesmo assim.',
        },
        body: {
          kind: 'flow',
          steps: [
            proposed,
            { label: { en: 'Refused: tests are read-only', 'pt-br': 'Recusado: testes são somente leitura' }, detail: { en: 'whatever the allowed list says', 'pt-br': 'diga o que disser a lista de permitidos' }, pigment: 'danger' },
            { label: { en: 'Nothing is applied', 'pt-br': 'Nada é aplicado' }, detail: { en: 'the original stays untouched', 'pt-br': 'o original fica intacto' }, pigment: 'muted' },
            { label: { en: 'No tests run', 'pt-br': 'Nenhum teste roda' }, detail: { en: 'one attempt used', 'pt-br': 'uma tentativa usada' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'An early exit', 'pt-br': 'Uma saída antecipada' },
        caption: {
          en: 'The patch makes pricing.py call sys.exit(0) on import. It passes the policy check and the process exits with code 0, but no test reports, so the run is incomplete.',
          'pt-br': 'O patch faz pricing.py chamar sys.exit(0) na importação. Ele passa na verificação de política e o processo sai com código 0, mas nenhum teste relata resultado, então a execução fica incompleta.',
        },
        body: {
          kind: 'flow',
          steps: [
            proposed,
            { label: { en: 'Policy check passes', 'pt-br': 'A verificação de política passa' }, detail: { en: 'allowed file · 2 changed lines', 'pt-br': 'arquivo permitido · 2 linhas alteradas' }, pigment: 'accent' },
            { label: { en: 'Applied to a clean copy', 'pt-br': 'Aplicado a uma cópia limpa' }, detail: { en: 'new directory, original files', 'pt-br': 'diretório novo, arquivos originais' }, pigment: 'accent' },
            { label: { en: 'Exit code 0, no summary', 'pt-br': 'Código de saída 0, sem resumo' }, detail: { en: 'classified incomplete', 'pt-br': 'classificada como incompleta' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
