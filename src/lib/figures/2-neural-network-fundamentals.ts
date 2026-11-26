/**
 * Figures for track 2 — Neural Network Fundamentals.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 */
import { formatNumber } from '~/lib/i18n'
import { QWEN } from '~/lib/model-facts'
import type { Figure, Localised } from './types'

const both = (value: number): Localised => ({
  en: formatNumber('en', value),
  'pt-br': formatNumber('pt-br', value),
})

const HIDDEN = both(QWEN.hiddenSize.value)
const FFN = both(QWEN.ffnIntermediate.value)
const LAYERS = QWEN.layers.value
const VOCAB = both(QWEN.vocabSize.value)
const UNIFORM_NATS = Number(Math.log(QWEN.vocabSize.value).toFixed(4))

/** 2.1: shared axes and baseline line for the museum-bag linear boundary. */
const bagAxes = {
  xAxis: {
    label: { en: 'Metal objects (x₁)', 'pt-br': 'Objetos metálicos (x₁)' },
    scale: 'linear',
    min: 0,
    max: 6,
  },
  yAxis: {
    label: { en: 'Equipment tag (x₂)', 'pt-br': 'Crachá de equipamento (x₂)' },
    scale: 'linear',
    min: -0.5,
    max: 1.5,
  },
} as const

/** Boundary 0.6 x₁ − 1.5 x₂ − 1.2 = 0 over x₂ ∈ [−0.5, 1.5]. */
const bagBaselineLine = [
  [0.75, -0.5],
  [5.75, 1.5],
] as const

/** 2.6: shared axes for gradient-descent iterates on L(x, y) = ½(10x² + 0.1y²). */
const ravineAxes = {
  xAxis: {
    label: { en: 'Update step', 'pt-br': 'Passo de atualização' },
    scale: 'linear',
    min: 0,
    max: 4,
  },
  yAxis: {
    label: { en: 'Coordinate value', 'pt-br': 'Valor da coordenada' },
    scale: 'linear',
    min: -4,
    max: 6,
  },
} as const

export const TRACK_2_FIGURES = {
  /**
   * 2.1 worked two museum bags by hand and stated that changing b slides the
   * boundary while changing the weight ratio rotates it. Each frame moves one
   * knob against the same two bags.
   */
  't2-perceptron-boundary': {
    lesson: '2.1-perceptron',
    title: { en: 'One straight boundary, two knobs', 'pt-br': 'Uma fronteira reta, dois controles' },
    caption: {
      en: 'Each bag sits at its (metal objects, tag) coordinates. Changing the bias b slides the boundary z = 0 without rotating it; changing the weight ratio rotates the boundary.',
      'pt-br': 'Cada bolsa fica em suas coordenadas (objetos metálicos, crachá). Mudar o bias b desliza a fronteira z = 0 sem girar; mudar a razão entre os pesos gira a fronteira.',
    },
    steps: [
      {
        label: { en: 'Learned boundary (b = −1.2)', 'pt-br': 'Fronteira aprendida (b = −1,2)' },
        caption: {
          en: 'With w = (0.6, −1.5) and b = −1.2, the untagged bag (4, 0) lands on the positive side (z = +1.2, inspect) while the tagged bag (4, 1) lands on the negative side (z = −0.3, pass).',
          'pt-br': 'Com w = (0,6; −1,5) e b = −1,2, a bolsa sem crachá (4, 0) cai no lado positivo (z = +1,2, inspecionar), enquanto a bolsa com crachá (4, 1) cai no lado negativo (z = −0,3, liberar).',
        },
        body: {
          kind: 'plot',
          ...bagAxes,
          series: [
            {
              label: { en: 'Boundary z = 0 (b = −1.2)', 'pt-br': 'Fronteira z = 0 (b = −1,2)' },
              pigment: 'accent',
              points: bagBaselineLine,
            },
            {
              label: { en: 'Untagged bag (inspect)', 'pt-br': 'Bolsa sem crachá (inspecionar)' },
              pigment: 'danger',
              points: [[4, 0]],
              marks: [{ at: [4, 0], label: { en: '(4, 0): z = +1.2', 'pt-br': '(4, 0): z = +1,2' } }],
            },
            {
              label: { en: 'Tagged bag (pass)', 'pt-br': 'Bolsa com crachá (liberar)' },
              pigment: 'success',
              points: [[4, 1]],
              marks: [{ at: [4, 1], label: { en: '(4, 1): z = −0.3', 'pt-br': '(4, 1): z = −0,3' } }],
            },
          ],
        },
      },
      {
        label: { en: 'Slide bias (b = −0.6)', 'pt-br': 'Deslizar bias (b = −0,6)' },
        caption: {
          en: 'Raising b from −1.2 to −0.6 shifts the line left while keeping the exact same slope. The tagged bag crosses to z = +0.3 and is now inspected too.',
          'pt-br': 'Subir b de −1,2 para −0,6 desloca a reta para a esquerda mantendo exatamente a mesma inclinação. A bolsa com crachá cruza para z = +0,3 e passa a ser inspecionada.',
        },
        body: {
          kind: 'plot',
          ...bagAxes,
          series: [
            {
              label: { en: 'Previous line (b = −1.2)', 'pt-br': 'Reta anterior (b = −1,2)' },
              pigment: 'muted',
              points: bagBaselineLine,
            },
            {
              label: { en: 'Shifted line (b = −0.6)', 'pt-br': 'Reta deslocada (b = −0,6)' },
              pigment: 'accent',
              points: [
                [0, -0.4],
                [4.75, 1.5],
              ],
            },
            {
              label: { en: 'Untagged bag (inspect)', 'pt-br': 'Bolsa sem crachá (inspecionar)' },
              pigment: 'danger',
              points: [[4, 0]],
              marks: [{ at: [4, 0], label: { en: '(4, 0): z = +1.8', 'pt-br': '(4, 0): z = +1,8' } }],
            },
            {
              label: { en: 'Tagged bag (now inspect)', 'pt-br': 'Bolsa com crachá (agora inspeciona)' },
              pigment: 'caution',
              points: [[4, 1]],
              marks: [{ at: [4, 1], label: { en: '(4, 1): z = +0.3', 'pt-br': '(4, 1): z = +0,3' } }],
            },
          ],
        },
      },
      {
        label: { en: 'Rotate weights (w₂ = −0.6)', 'pt-br': 'Girar pesos (w₂ = −0,6)' },
        caption: {
          en: 'Weakening the tag weight from −1.5 to −0.6 pivots the boundary around (2, 0). The angle changes because the ratio between w₁ and w₂ changed.',
          'pt-br': 'Enfraquecer o peso do crachá de −1,5 para −0,6 gira a fronteira em torno de (2, 0). O ângulo muda porque a razão entre w₁ e w₂ mudou.',
        },
        body: {
          kind: 'plot',
          ...bagAxes,
          series: [
            {
              label: { en: 'Previous line (w₂ = −1.5)', 'pt-br': 'Reta anterior (w₂ = −1,5)' },
              pigment: 'muted',
              points: bagBaselineLine,
            },
            {
              label: { en: 'Rotated line (w₂ = −0.6)', 'pt-br': 'Reta girada (w₂ = −0,6)' },
              pigment: 'accent',
              points: [
                [1.5, -0.5],
                [3.5, 1.5],
              ],
            },
            {
              label: { en: 'Untagged bag (inspect)', 'pt-br': 'Bolsa sem crachá (inspecionar)' },
              pigment: 'danger',
              points: [[4, 0]],
              marks: [{ at: [4, 0], label: { en: '(4, 0): z = +1.2', 'pt-br': '(4, 0): z = +1,2' } }],
            },
            {
              label: { en: 'Tagged bag (now inspect)', 'pt-br': 'Bolsa com crachá (agora inspeciona)' },
              pigment: 'caution',
              points: [[4, 1]],
              marks: [{ at: [4, 1], label: { en: '(4, 1): z = +0.6', 'pt-br': '(4, 1): z = +0,6' } }],
            },
          ],
        },
      },
    ],
  },

  /**
   * 2.2 solves XOR by hand with two ReLU hidden units and describes the
   * geometry in prose. Step 1 shows the unseparable checkerboard; step 2 shows
   * the warped hidden coordinates where one straight line separates the classes.
   */
  't2-mlp-xor-warp': {
    lesson: '2.2-multilayer-perceptrons-nonlinearity',
    title: { en: 'How a hidden layer makes XOR linearly separable', 'pt-br': 'Como uma camada oculta torna o XOR linearmente separável' },
    caption: {
      en: 'The output unit is still a single straight-line perceptron. The hidden layer with ReLU bends the coordinates so the two positive corners share one point and fall on the opposite side of the line.',
      'pt-br': 'A unidade de saída continua sendo um único perceptron de linha reta. A camada oculta com ReLU dobra as coordenadas para que os dois cantos positivos ocupem o mesmo ponto e fiquem do lado oposto da reta.',
    },
    steps: [
      {
        label: { en: 'Raw inputs (x₁, x₂)', 'pt-br': 'Entradas brutas (x₁, x₂)' },
        caption: {
          en: 'In raw input space, the positive corners (0, 1) and (1, 0) sit on one diagonal and the negative corners (0, 0) and (1, 1) sit on the other. No single straight cut separates them.',
          'pt-br': 'No espaço bruto de entrada, os cantos positivos (0, 1) e (1, 0) ficam numa diagonal e os negativos (0, 0) e (1, 1) na outra. Nenhum corte reto único os separa.',
        },
        body: {
          kind: 'grid',
          columns: [
            { en: 'x₂ = 0', 'pt-br': 'x₂ = 0' },
            { en: 'x₂ = 1', 'pt-br': 'x₂ = 1' },
          ],
          rows: [
            { en: 'x₁ = 0', 'pt-br': 'x₁ = 0' },
            { en: 'x₁ = 1', 'pt-br': 'x₁ = 1' },
          ],
          cells: [
            [0, 1],
            [1, 0],
          ],
          bins: 4,
        },
      },
      {
        label: { en: 'Hidden space (h₁, h₂)', 'pt-br': 'Espaço oculto (h₁, h₂)' },
        caption: {
          en: 'After h₁ = ReLU(x₁ + x₂) and h₂ = ReLU(x₁ + x₂ − 1), both positive corners collapse onto (1, 0) while the negative corners land at (0, 0) and (2, 1). The line y = h₁ − 2h₂ − 0.5 = 0 splits them cleanly.',
          'pt-br': 'Após h₁ = ReLU(x₁ + x₂) e h₂ = ReLU(x₁ + x₂ − 1), ambos os cantos positivos colapsam em (1, 0), enquanto os negativos caem em (0, 0) e (2, 1). A reta y = h₁ − 2h₂ − 0,5 = 0 os separa de forma limpa.',
        },
        body: {
          kind: 'plot',
          xAxis: {
            label: { en: 'Hidden unit h₁', 'pt-br': 'Unidade oculta h₁' },
            scale: 'linear',
            min: -0.5,
            max: 2.5,
          },
          yAxis: {
            label: { en: 'Hidden unit h₂', 'pt-br': 'Unidade oculta h₂' },
            scale: 'linear',
            min: -0.5,
            max: 1.5,
          },
          series: [
            {
              label: { en: 'Output boundary y = 0', 'pt-br': 'Fronteira de saída y = 0' },
              pigment: 'accent',
              points: [
                [-0.5, -0.5],
                [2.5, 1],
              ],
            },
            {
              label: { en: 'Same-input corners (y = −0.5)', 'pt-br': 'Cantos iguais (y = −0,5)' },
              pigment: 'muted',
              points: [
                [0, 0],
                [2, 1],
              ],
              marks: [
                { at: [0, 0], label: { en: '(0,0) → −0.5', 'pt-br': '(0,0) → −0,5' } },
                { at: [2, 1], label: { en: '(1,1) → −0.5', 'pt-br': '(1,1) → −0,5' } },
              ],
            },
            {
              label: { en: 'Different-input corners (y = +0.5)', 'pt-br': 'Cantos diferentes (y = +0,5)' },
              pigment: 'success',
              points: [[1, 0]],
              marks: [{ at: [1, 0], label: { en: '(0,1) & (1,0) → +0.5', 'pt-br': '(0,1) e (1,0) → +0,5' } }],
            },
          ],
        },
      },
    ],
  },

  /**
   * 2.3 contrasts fixed curves (ReLU's flat zero negative half vs SiLU's smooth
   * dip) and then walks one coordinate of SwiGLU with identical content (+8.0)
   * under two opposite gate values (−3.0 vs +3.0).
   */
  't2-relu-vs-swiglu': {
    lesson: '2.3-activation-functions',
    title: { en: 'From a fixed curve to a learned gate', 'pt-br': 'De uma curva fixa a um gate aprendido' },
    caption: {
      en: 'Fixed activations map each number on its own. SwiGLU projects the same input vector x in parallel through a gate branch (W_gate x) and an up branch (W_up x), then multiplies SiLU(gate) × up elementwise so the gate can suppress or amplify the exact same content value.',
      'pt-br': 'Ativações fixas mapeiam cada número isoladamente. O SwiGLU projeta o mesmo vetor de entrada x em paralelo por um ramo de gate (W_gate x) e um ramo up (W_up x), multiplicando SiLU(gate) × up elemento a elemento para que o gate suprima ou amplifique exatamente o mesmo valor de conteúdo.',
    },
    steps: [
      {
        label: { en: 'ReLU vs SiLU', 'pt-br': 'ReLU contra SiLU' },
        caption: {
          en: 'ReLU has a sharp corner at zero and zero slope on the entire negative side. SiLU(x) = x·σ(x) smooths the corner and dips slightly below zero before rising toward x.',
          'pt-br': 'A ReLU tem um canto brusco em zero e inclinação nula em todo o lado negativo. A SiLU(x) = x·σ(x) suaviza o canto e mergulha levemente abaixo de zero antes de subir rumo a x.',
        },
        body: {
          kind: 'plot',
          xAxis: {
            label: { en: 'Pre-activation x', 'pt-br': 'Pré-ativação x' },
            scale: 'linear',
            min: -4,
            max: 4,
          },
          yAxis: {
            label: { en: 'Activation output', 'pt-br': 'Saída da ativação' },
            scale: 'linear',
            min: -1,
            max: 4,
          },
          series: [
            {
              label: { en: 'ReLU(x) = max(0, x)', 'pt-br': 'ReLU(x) = max(0, x)' },
              pigment: 'muted',
              points: [
                [-4, 0],
                [-3, 0],
                [-2, 0],
                [-1, 0],
                [0, 0],
                [1, 1],
                [2, 2],
                [3, 3],
                [4, 4],
              ],
              marks: [{ at: [-2, 0], label: { en: 'Flat zero (slope 0)', 'pt-br': 'Zero plano (inclinação 0)' } }],
            },
            {
              label: { en: 'SiLU(x) = x · σ(x)', 'pt-br': 'SiLU(x) = x · σ(x)' },
              pigment: 'accent',
              points: [
                [-4, -0.072],
                [-3, -0.142],
                [-2, -0.238],
                [-1, -0.269],
                [0, 0],
                [1, 0.731],
                [2, 1.762],
                [3, 2.858],
                [4, 3.928],
              ],
              marks: [{ at: [3, 2.858], label: { en: 'SiLU(3) ≈ 2.86', 'pt-br': 'SiLU(3) ≈ 2,86' } }],
            },
          ],
        },
      },
      {
        label: { en: 'SwiGLU: gate = −3.0', 'pt-br': 'SwiGLU: gate = −3,0' },
        caption: {
          en: `In Qwen3.8-27B (${HIDDEN.en} → ${FFN.en} → ${HIDDEN.en}), W_gate x and W_up x project the same input vector x in parallel. Multiplying SiLU(−3.0) ≈ −0.14 elementwise with +8.0 from the up branch suppresses it to ≈ −1.1.`,
          'pt-br': `No Qwen3.8-27B (${HIDDEN['pt-br']} → ${FFN['pt-br']} → ${HIDDEN['pt-br']}), W_gate x e W_up x projetam o mesmo vetor de entrada x em paralelo. Multiplicar SiLU(−3,0) ≈ −0,14 elemento a elemento por +8,0 do ramo up o suprime para ≈ −1,1.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Hidden state x', 'pt-br': 'Hidden state (estado oculto) x' }, detail: { en: `${HIDDEN.en} numbers (shared input)`, 'pt-br': `${HIDDEN['pt-br']} números (entrada compartilhada)` }, pigment: 'muted' },
            { label: { en: 'Parallel: W_gate x ∥ W_up x', 'pt-br': 'Em paralelo: W_gate x ∥ W_up x' }, detail: { en: 'gate = −3.0 (SiLU ≈ −0.14) · up = +8.0', 'pt-br': 'gate = −3,0 (SiLU ≈ −0,14) · up = +8,0' }, pigment: 'danger' },
            { label: { en: 'Elementwise SiLU(gate) ⊙ up', 'pt-br': 'Elemento a elemento SiLU(gate) ⊙ up' }, detail: { en: '−0.14 × 8.0 ≈ −1.1 (suppressed)', 'pt-br': '−0,14 × 8,0 ≈ −1,1 (suprimido)' }, pigment: 'danger' },
            { label: { en: 'Down projection (W_down)', 'pt-br': 'Projeção down (W_down)' }, detail: { en: `back to ${HIDDEN.en}`, 'pt-br': `volta para ${HIDDEN['pt-br']}` }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'SwiGLU: gate = +3.0', 'pt-br': 'SwiGLU: gate = +3,0' },
        caption: {
          en: 'On another token, the same parallel projections produce gate = +3.0 and up = +8.0; multiplying SiLU(+3.0) ≈ +2.86 elementwise by +8.0 amplifies the value to about +22.9. A fixed curve on +8.0 alone cannot distinguish the two tokens.',
          'pt-br': 'Em outro token, as mesmas projeções paralelas produzem gate = +3,0 e up = +8,0; multiplicar SiLU(+3,0) ≈ +2,86 elemento a elemento por +8,0 amplifica o valor para cerca de +22,9. Uma curva fixa só sobre +8,0 não distingue os dois tokens.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Hidden state x', 'pt-br': 'Hidden state (estado oculto) x' }, detail: { en: `${HIDDEN.en} numbers (shared input)`, 'pt-br': `${HIDDEN['pt-br']} números (entrada compartilhada)` }, pigment: 'muted' },
            { label: { en: 'Parallel: W_gate x ∥ W_up x', 'pt-br': 'Em paralelo: W_gate x ∥ W_up x' }, detail: { en: 'gate = +3.0 (SiLU ≈ +2.86) · up = +8.0', 'pt-br': 'gate = +3,0 (SiLU ≈ +2,86) · up = +8,0' }, pigment: 'success' },
            { label: { en: 'Elementwise SiLU(gate) ⊙ up', 'pt-br': 'Elemento a elemento SiLU(gate) ⊙ up' }, detail: { en: '2.86 × 8.0 ≈ +22.9 (amplified)', 'pt-br': '2,86 × 8,0 ≈ +22,9 (amplificado)' }, pigment: 'success' },
            { label: { en: 'Down projection (W_down)', 'pt-br': 'Projeção down (W_down)' }, detail: { en: `back to ${HIDDEN.en}`, 'pt-br': `volta para ${HIDDEN['pt-br']}` }, pigment: 'muted' },
          ],
        },
      },
    ],
  },

  /**
   * 2.4 introduces the asymmetric −ln(p) penalty and then scales it to
   * Qwen3.8-27B's 248,320-entry vocabulary (12.42 nats uniform → 2.0 nats).
   */
  't2-cross-entropy-scale': {
    lesson: '2.4-loss-functions-cross-entropy',
    title: { en: 'How cross-entropy punishes errors and shrinks the choice', 'pt-br': 'Como a cross-entropy pune erros e reduz a escolha' },
    caption: {
      en: 'Cross-entropy is steep near zero probability and exponential when converted back to effective candidates (perplexity = e^L).',
      'pt-br': 'A cross-entropy é íngreme perto de probabilidade zero e exponencial ao ser convertida de volta em candidatos efetivos (perplexidade = e^L).',
    },
    steps: [
      {
        label: { en: 'Penalty L = −ln(p)', 'pt-br': 'Penalidade L = −ln(p)' },
        caption: {
          en: 'Giving the true token probability 0.5 costs 0.69 nats; giving it 0.01 costs 4.61 nats. Confident mistakes near zero drive the loss sharply upward.',
          'pt-br': 'Dar probabilidade 0,5 ao token real custa 0,69 nat; dar 0,01 custa 4,61 nats. Erros confiantes perto de zero jogam a loss bruscamente para cima.',
        },
        body: {
          kind: 'plot',
          xAxis: {
            label: { en: 'Probability on observed token (p)', 'pt-br': 'Probabilidade no token observado (p)' },
            scale: 'linear',
            min: 0,
            max: 1,
          },
          yAxis: {
            label: { en: 'Cross-entropy loss', 'pt-br': 'Loss de cross-entropy' },
            scale: 'linear',
            min: 0,
            max: 6,
            unit: 'nats',
          },
          series: [
            {
              label: { en: 'L = −ln(p)', 'pt-br': 'L = −ln(p)' },
              pigment: 'accent',
              points: [
                [0.005, 5.2983],
                [0.01, 4.6052],
                [0.02, 3.912],
                [0.05, 2.9957],
                [0.1, 2.3026],
                [0.2, 1.6094],
                [0.35, 1.0498],
                [0.5, 0.6931],
                [0.75, 0.2877],
                [1, 0],
              ],
              marks: [
                { at: [0.01, 4.6052], label: { en: 'p = 0.01 → 4.61', 'pt-br': 'p = 0,01 → 4,61' } },
                { at: [0.5, 0.6931], label: { en: 'p = 0.5 → 0.69', 'pt-br': 'p = 0,5 → 0,69' } },
              ],
            },
          ],
        },
      },
      {
        label: { en: 'Effective candidates (e^L)', 'pt-br': 'Candidatos efetivos (e^L)' },
        caption: {
          en: `On a log scale, every nat removed divides the effective candidates by e ≈ 2.72: from a uniform guess over ${VOCAB.en} entries (12.42 nats) down to about 7.4 candidates at 2.0 nats.`,
          'pt-br': `Em escala logarítmica, cada nat removido divide os candidatos efetivos por e ≈ 2,72: de um chute uniforme sobre ${VOCAB['pt-br']} entradas (12,42 nats) até cerca de 7,4 candidatos em 2,0 nats.`,
        },
        body: {
          kind: 'plot',
          xAxis: {
            label: { en: 'Average loss', 'pt-br': 'Loss média' },
            scale: 'linear',
            min: 0,
            max: 13,
            unit: 'nats',
          },
          yAxis: {
            label: { en: 'Perplexity (effective candidates)', 'pt-br': 'Perplexidade (candidatos efetivos)' },
            scale: 'log',
            min: 1,
            max: 1000000,
          },
          series: [
            {
              label: { en: 'Perplexity = e^L', 'pt-br': 'Perplexidade = e^L' },
              pigment: 'accent',
              points: [
                [0, 1],
                [1.9, 6.6859],
                [2, 7.3891],
                [4, 54.5982],
                [6, 403.4288],
                [8, 2980.958],
                [10, 22026.47],
                [UNIFORM_NATS, QWEN.vocabSize.value],
              ],
              marks: [
                { at: [2, 7.3891], label: { en: '2.0 nats → 7.4', 'pt-br': '2,0 nats → 7,4' } },
                {
                  at: [UNIFORM_NATS, QWEN.vocabSize.value],
                  label: { en: `Uniform (${VOCAB.en}): 12.42`, 'pt-br': `Uniforme (${VOCAB['pt-br']}): 12,42` },
                },
              ],
            },
          ],
        },
      },
    ],
  },

  /**
   * 2.5 is titled "Backpropagation, visualized" and works one three-class
   * softmax + cross-entropy step plus a branching accumulation rule.
   */
  't2-backprop-sweep': {
    lesson: '2.5-backpropagation',
    title: { en: 'Forward pass, backward sweep, and branching', 'pt-br': 'Forward pass, varredura reversa e ramificação' },
    caption: {
      en: 'One forward sweep computes the loss and saves intermediates; one reverse sweep multiplies each upstream gradient by each node’s local derivative to obtain every gradient at once.',
      'pt-br': 'Uma passagem direta calcula a loss e salva valores intermediários; uma varredura reversa multiplica cada gradiente de jusante pela derivada local de cada nó para obter todos os gradientes de uma vez.',
    },
    steps: [
      {
        label: { en: '1. Forward pass', 'pt-br': '1. Passagem direta (forward)' },
        caption: {
          en: 'Operations run left to right from hidden vector h to scalar loss L ≈ 0.417, saving h and p in memory because the reverse sweep needs them.',
          'pt-br': 'As operações correm da esquerda para a direita do vetor oculto h até a loss escalar L ≈ 0,417, salvando h e p na memória porque a varredura reversa precisa deles.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Hidden h', 'pt-br': 'Vetor oculto h' }, detail: { en: 'saved for ∂L/∂W', 'pt-br': 'salvo para ∂L/∂W' }, pigment: 'muted' },
            { label: { en: 'Linear Wh + b', 'pt-br': 'Camada linear Wh + b' }, detail: { en: 'logits z = (2.0, 1.0, 0.1)', 'pt-br': 'logits z = (2,0; 1,0; 0,1)' }, pigment: 'accent' },
            { label: { en: 'Softmax', 'pt-br': 'Softmax' }, detail: { en: 'p ≈ (0.659, 0.242, 0.099) saved', 'pt-br': 'p ≈ (0,659; 0,242; 0,099) salvo' }, pigment: 'accent' },
            { label: { en: 'Cross-entropy L', 'pt-br': 'Loss de cross-entropy L' }, detail: { en: '−ln(0.659) ≈ 0.417', 'pt-br': '−ln(0,659) ≈ 0,417' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: '2. Backward sweep', 'pt-br': '2. Varredura reversa' },
        caption: {
          en: 'Walking in reverse from ∂L/∂L = 1, the fused softmax + cross-entropy step gives p − y = (−0.341, 0.242, 0.099), which immediately produces gradients for b, W, and the layer below.',
          'pt-br': 'Caminhando ao contrário a partir de ∂L/∂L = 1, o passo fundido de softmax + cross-entropy dá p − y = (−0,341; 0,242; 0,099), que produz imediatamente gradientes para b, W e a camada abaixo.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Start at loss', 'pt-br': 'Começo na loss' }, detail: { en: '∂L/∂L = 1', 'pt-br': '∂L/∂L = 1' }, pigment: 'caution' },
            { label: { en: 'Logit gradient ∂L/∂z', 'pt-br': 'Gradiente dos logits ∂L/∂z' }, detail: { en: 'p − y = (−0.341, 0.242, 0.099)', 'pt-br': 'p − y = (−0,341; 0,242; 0,099)' }, pigment: 'accent' },
            { label: { en: 'Parameter gradients', 'pt-br': 'Gradientes dos parâmetros' }, detail: { en: '∂L/∂b = p − y; ∂L/∂W = (p − y)hᵀ', 'pt-br': '∂L/∂b = p − y; ∂L/∂W = (p − y)hᵀ' }, pigment: 'success' },
            { label: { en: 'Message down ∂L/∂h', 'pt-br': 'Mensagem para baixo ∂L/∂h' }, detail: { en: 'Wᵀ(p − y) sent to layer below', 'pt-br': 'Wᵀ(p − y) enviado à camada abaixo' }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: '3. Branching adds', 'pt-br': '3. Ramificação soma' },
        caption: {
          en: 'When one value feeds two downstream paths, the multivariable chain rule adds both returning gradients — which is why frameworks accumulate into gradient buffers and training loops clear them once per optimizer update (after any gradient accumulation across microbatches), not unconditionally every microbatch.',
          'pt-br': 'Quando um valor alimenta dois caminhos à frente, a regra da cadeia multivariada soma os dois gradientes que retornam — por isso frameworks acumulam nos buffers de gradiente e loops de treino os zeram uma vez por atualização do otimizador (após eventual acumulação entre microbatches), e não incondicionalmente a cada microbatch.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Shared value h', 'pt-br': 'Valor compartilhado h' }, detail: { en: 'feeds two downstream paths', 'pt-br': 'alimenta dois caminhos à frente' }, pigment: 'muted' },
            { label: { en: 'Path A returns g_A', 'pt-br': 'Caminho A devolve g_A' }, detail: { en: 'upstream × local on branch A', 'pt-br': 'jusante × local no ramo A' }, pigment: 'accent' },
            { label: { en: 'Path B returns g_B', 'pt-br': 'Caminho B devolve g_B' }, detail: { en: 'upstream × local on branch B', 'pt-br': 'jusante × local no ramo B' }, pigment: 'accent' },
            { label: { en: 'Total ∂L/∂h', 'pt-br': 'Total ∂L/∂h' }, detail: { en: 'g_A + g_B (summed in buffer)', 'pt-br': 'g_A + g_B (somados no buffer)' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 2.6 works gradient descent on L(x, y) = ½(10x² + 0.1y²) at η = 0.15 and
   * η = 0.25. Starting from (1, 1), plotting x and y side by side over 4 steps
   * shows the steep-axis bounce/explosion against the shallow-axis crawl.
   */
  't2-ravine-step-size': {
    lesson: '2.6-gradient-descent-loss-landscape',
    title: { en: 'One learning rate, two curvatures', 'pt-br': 'Um único learning rate, duas curvaturas' },
    caption: {
      en: 'Gradient descent on L(x, y) = ½(10x² + 0.1y²) from (1, 1). The steep axis x sets the stability ceiling at η = 0.2 while the shallow axis y barely moves.',
      'pt-br': 'Gradient descent em L(x, y) = ½(10x² + 0,1y²) a partir de (1, 1). O eixo íngreme x impõe o teto de estabilidade em η = 0,2 enquanto o eixo raso y quase não sai do lugar.',
    },
    steps: [
      {
        label: { en: 'Learning rate η = 0.15', 'pt-br': 'Taxa η = 0,15' },
        caption: {
          en: 'Each step multiplies x by −0.5 (bouncing across zero: 1, −0.5, 0.25, −0.125, 0.0625) and y by 0.985 (crawling from 1 to 0.9413 after four steps).',
          'pt-br': 'Cada passo multiplica x por −0,5 (quicando pelo zero: 1; −0,5; 0,25; −0,125; 0,0625) e y por 0,985 (arrastando-se de 1 para 0,9413 em quatro passos).',
        },
        body: {
          kind: 'plot',
          ...ravineAxes,
          series: [
            {
              label: { en: 'Steep axis x (factor −0.5)', 'pt-br': 'Eixo íngreme x (fator −0,5)' },
              pigment: 'accent',
              points: [
                [0, 1],
                [1, -0.5],
                [2, 0.25],
                [3, -0.125],
                [4, 0.0625],
              ],
              marks: [{ at: [4, 0.0625], label: { en: 'x = 0.0625', 'pt-br': 'x = 0,0625' } }],
            },
            {
              label: { en: 'Shallow axis y (factor 0.985)', 'pt-br': 'Eixo raso y (fator 0,985)' },
              pigment: 'caution',
              points: [
                [0, 1],
                [1, 0.985],
                [2, 0.9702],
                [3, 0.9557],
                [4, 0.9413],
              ],
              marks: [{ at: [2, 0.9702], label: { en: 'y crawls', 'pt-br': 'y se arrasta' } }],
            },
          ],
        },
      },
      {
        label: { en: 'Learning rate η = 0.25', 'pt-br': 'Taxa η = 0,25' },
        caption: {
          en: 'Raising η past 0.2 nudges y slightly faster (factor 0.975, to 0.9037), but flips x’s factor to −1.5 so x explodes: 1, −1.5, 2.25, −3.375, 5.0625.',
          'pt-br': 'Subir η acima de 0,2 acelera y só um pouco (fator 0,975, até 0,9037), mas leva o fator de x para −1,5 e x explode: 1; −1,5; 2,25; −3,375; 5,0625.',
        },
        body: {
          kind: 'plot',
          ...ravineAxes,
          series: [
            {
              label: { en: 'Steep axis x (factor −1.5, diverges)', 'pt-br': 'Eixo íngreme x (fator −1,5, diverge)' },
              pigment: 'danger',
              points: [
                [0, 1],
                [1, -1.5],
                [2, 2.25],
                [3, -3.375],
                [4, 5.0625],
              ],
              marks: [{ at: [4, 5.0625], label: { en: 'x = 5.0625 (diverges)', 'pt-br': 'x = 5,0625 (diverge)' } }],
            },
            {
              label: { en: 'Shallow axis y (factor 0.975)', 'pt-br': 'Eixo raso y (fator 0,975)' },
              pigment: 'caution',
              points: [
                [0, 1],
                [1, 0.975],
                [2, 0.9506],
                [3, 0.9269],
                [4, 0.9037],
              ],
              marks: [{ at: [4, 0.9037], label: { en: 'y = 0.90 at step 4', 'pt-br': 'y = 0,90 no passo 4' } }],
            },
          ],
        },
      },
    ],
  },

  /**
   * 2.7 progresses from SGD to Momentum to Adam + L2 (the wrong turn) to AdamW,
   * tracking both how each update handles curvature/decay and how much extra
   * state per parameter it carries.
   */
  't2-adam-vs-adamw': {
    lesson: '2.7-optimizers',
    title: { en: 'From plain SGD to decoupled AdamW', 'pt-br': 'Do SGD puro ao AdamW desacoplado' },
    caption: {
      en: 'Each rule adds state per parameter to tame the ravine. The decisive difference between Adam + L2 and AdamW is whether weight decay passes through the per-coordinate division by √v̂.',
      'pt-br': 'Cada regra acrescenta estado por parâmetro para domar a ravina. A diferença decisiva entre Adam + L2 e AdamW é se o weight decay passa pela divisão por coordenada por √v̂.',
    },
    steps: [
      {
        label: { en: 'Plain SGD', 'pt-br': 'SGD puro' },
        caption: {
          en: 'No extra optimizer state per parameter: one shared learning rate η scales each coordinate by its own gradient magnitude, so steep axes take huge steps while flat axes creep, leaving the ravine unsolved.',
          'pt-br': 'Nenhum estado extra de otimizador por parâmetro: um único learning rate compartilhado η escala cada coordenada pela magnitude do seu próprio gradiente, fazendo eixos íngremes darem passos enormes enquanto eixos rasos se arrastam, deixando a ravina sem solução.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Gradient g', 'pt-br': 'Gradiente g' }, detail: { en: 'noisy minibatch slope', 'pt-br': 'inclinação ruidosa do minibatch' }, pigment: 'muted' },
            { label: { en: 'Scale by −η', 'pt-br': 'Escalar por −η' }, detail: { en: 'shared η × g: steep axes leap, flat axes creep', 'pt-br': 'η compartilhado × g: eixos íngremes saltam, rasos se arrastam' }, pigment: 'caution' },
            { label: { en: 'Update θ', 'pt-br': 'Atualizar θ' }, detail: { en: '0 extra state tensors', 'pt-br': '0 tensores extras de estado' }, pigment: 'muted' },
          ],
        },
      },
      {
        label: { en: 'Momentum', 'pt-br': 'Momentum' },
        caption: {
          en: 'Keeps one running average (velocity) per parameter. Alternating ravine bounces cancel out while steady shallow pushes accumulate.',
          'pt-br': 'Mantém uma média móvel (velocidade) por parâmetro. Quiques alternados na ravina se cancelam enquanto empurrões constantes na direção rasa se acumulam.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Gradient g', 'pt-br': 'Gradiente g' }, detail: { en: 'current minibatch slope', 'pt-br': 'inclinação do minibatch atual' }, pigment: 'muted' },
            { label: { en: 'Velocity (EMA)', 'pt-br': 'Velocidade (MME)' }, detail: { en: 'cancels zig-zags, builds steady push', 'pt-br': 'cancela zigue-zagues, acumula avanço' }, pigment: 'accent' },
            { label: { en: 'Update θ', 'pt-br': 'Atualizar θ' }, detail: { en: '+1 state tensor per parameter', 'pt-br': '+1 tensor de estado por parâmetro' }, pigment: 'accent' },
          ],
        },
      },
      {
        label: { en: 'Adam + L2 (wrong turn)', 'pt-br': 'Adam + L2 (desvio errado)' },
        caption: {
          en: 'Adding L2 (λθ) to the gradient pushes regularization through m and v and divides it by √v̂ + ε. Relative to decoupled weight decay (Loshchilov & Hutter, 2019), weights with large historical gradients tend to be shrunk less strongly than they would under uniform decay.',
          'pt-br': 'Somar L2 (λθ) ao gradiente envia a regularização por m e v e a divide por √v̂ + ε. Em relação ao weight decay desacoplado (Loshchilov & Hutter, 2019), pesos com gradientes históricos grandes tendem a encolher com menos força do que sob decay uniforme.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Coupled g + λθ', 'pt-br': 'Acoplado g + λθ' }, detail: { en: 'L2 mixed into gradient', 'pt-br': 'L2 misturado ao gradiente' }, pigment: 'danger' },
            { label: { en: 'Moments m and v', 'pt-br': 'Momentos m e v' }, detail: { en: 'both absorb λθ (+2 tensors)', 'pt-br': 'ambos absorvem λθ (+2 tensores)' }, pigment: 'danger' },
            { label: { en: 'Divide by √v̂ + ε', 'pt-br': 'Dividir por √v̂ + ε' }, detail: { en: 'shrinkage warped by gradient scale', 'pt-br': 'encolhimento distorcido pela escala do gradiente' }, pigment: 'danger' },
            { label: { en: 'Update θ', 'pt-br': 'Atualizar θ' }, detail: { en: 'uneven decay across parameters', 'pt-br': 'decay desigual entre parâmetros' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'AdamW (decoupled)', 'pt-br': 'AdamW (desacoplado)' },
        caption: {
          en: 'AdamW keeps λθ out of m and v. The adaptive ratio normalizes each direction’s gradient while −ηλθ shrinks every decayed weight uniformly from its pre-step value.',
          'pt-br': 'O AdamW mantém λθ fora de m e v. A razão adaptativa normaliza o gradiente de cada direção enquanto −ηλθ encolhe uniformemente cada peso do grupo de decay a partir do valor anterior ao passo.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Pure gradient g', 'pt-br': 'Gradiente puro g' }, detail: { en: 'no L2 inside moments', 'pt-br': 'sem L2 dentro dos momentos' }, pigment: 'accent' },
            { label: { en: 'Moments m and v', 'pt-br': 'Momentos m e v' }, detail: { en: 'per-axis scale (+2 tensors)', 'pt-br': 'escala por eixo (+2 tensores)' }, pigment: 'accent' },
            { label: { en: 'Adaptive step', 'pt-br': 'Passo adaptativo' }, detail: { en: '−η · m̂ / (√v̂ + ε)', 'pt-br': '−η · m̂ / (√v̂ + ε)' }, pigment: 'success' },
            { label: { en: 'Direct decay', 'pt-br': 'Decay direto' }, detail: { en: '−ηλθ on pre-step θ (uniform)', 'pt-br': '−ηλθ no θ pré-passo (uniforme)' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 2.8 opens with 1.1^64 ≈ 446 vs 0.9^64 ≈ 0.0012 across Qwen3.8-27B's 64
   * layers, then contrasts post-norm (norm on the stream) against pre-norm
   * (RMSNorm on the branch, unobstructed residual stream).
   */
  't2-depth-and-prenorm': {
    lesson: '2.8-initialization-normalization-residuals',
    title: { en: 'Compounding across 64 layers, and how pre-norm survives it', 'pt-br': 'Composição em 64 camadas e como o pre-norm sobrevive a ela' },
    caption: {
      en: `Small per-layer scale errors grow exponentially across ${LAYERS} layers. Pre-norm keeps an unobstructed additive highway for the residual stream while handing each sublayer a rescaled copy.`,
      'pt-br': `Pequenos erros de escala por camada crescem exponencialmente ao longo de ${LAYERS} camadas. O pre-norm mantém uma rodovia aditiva desobstruída para o residual stream enquanto entrega a cada subcamada uma cópia reescalada.`,
    },
    steps: [
      {
        label: { en: 'Depth compounds', 'pt-br': 'A profundidade compõe' },
        caption: {
          en: `A 10% gain per layer (1.1×) reaches about ×446 by layer ${LAYERS}; a 10% drop (0.9×) shrinks to about ×0.0012. Both forward signals and backward gradients face the same compounding.`,
          'pt-br': `Um ganho de 10% por camada (1,1×) chega a cerca de ×446 na camada ${LAYERS}; uma queda de 10% (0,9×) encolhe para cerca de ×0,0012. Sinais do forward e gradientes do backward enfrentam a mesma composição.`,
        },
        body: {
          kind: 'plot',
          xAxis: {
            label: { en: 'Layer depth', 'pt-br': 'Profundidade da camada' },
            scale: 'linear',
            min: 0,
            max: LAYERS,
          },
          yAxis: {
            label: { en: 'Relative signal scale', 'pt-br': 'Escala relativa do sinal' },
            scale: 'log',
            min: 0.001,
            max: 1000,
          },
          series: [
            {
              label: { en: '1.1× per layer (explodes)', 'pt-br': '1,1× por camada (explode)' },
              pigment: 'danger',
              points: [
                [0, 1],
                [16, 4.595],
                [32, 21.1138],
                [48, 97.0172],
                [LAYERS, 445.7916],
              ],
              marks: [{ at: [48, 97.0172], label: { en: 'Layer 48: ×97', 'pt-br': 'Camada 48: ×97' } }],
            },
            {
              label: { en: '1.0× ideal reference', 'pt-br': '1,0× referência ideal' },
              pigment: 'muted',
              points: [
                [0, 1],
                [LAYERS, 1],
              ],
            },
            {
              label: { en: '0.9× per layer (vanishes)', 'pt-br': '0,9× por camada (desaparece)' },
              pigment: 'caution',
              points: [
                [0, 1],
                [16, 0.1853],
                [32, 0.0343],
                [48, 0.0064],
                [LAYERS, 0.0012],
              ],
              marks: [{ at: [48, 0.0064], label: { en: 'Layer 48: ×0.006', 'pt-br': 'Camada 48: ×0,006' } }],
            },
          ],
        },
      },
      {
        label: { en: 'Post-norm (wrong turn)', 'pt-br': 'Post-norm (desvio errado)' },
        caption: {
          en: `Putting normalization on the stream itself (y = Norm(x + F(x))) forces every backward gradient through ${LAYERS * 2} sublayer normalizations across ${LAYERS} two-sublayer blocks, breaking the clean identity highway.`,
          'pt-br': `Colocar a normalização no próprio stream (y = Norm(x + F(x))) força cada gradiente do backward a atravessar ${LAYERS * 2} normalizações de subcamada ao longo de ${LAYERS} blocos de duas subcamadas, quebrando a rodovia identidade limpa.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Stream x', 'pt-br': 'Stream x' }, detail: { en: 'enters block unnormalized', 'pt-br': 'entra no bloco sem normalização' }, pigment: 'muted' },
            { label: { en: 'Add x + F(x)', 'pt-br': 'Somar x + F(x)' }, detail: { en: 'sublayer reads raw x', 'pt-br': 'subcamada lê x bruto' }, pigment: 'caution' },
            { label: { en: 'Norm on stream', 'pt-br': 'Norm no stream' }, detail: { en: 'sits directly on shortcut', 'pt-br': 'fica direto sobre o atalho' }, pigment: 'danger' },
            { label: { en: 'Output y', 'pt-br': 'Saída y' }, detail: { en: 'fragile in deep stacks', 'pt-br': 'frágil em pilhas profundas' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Pre-norm (Qwen3.8-27B)', 'pt-br': 'Pre-norm no Qwen3.8-27B' },
        caption: {
          en: `Moving RMSNorm onto the branch (y = x + F(RMSNorm(x))) keeps the ${HIDDEN.en}-wide stream untouched while every sublayer sees a rescaled copy. A final RMSNorm rescales the stream before the output head.`,
          'pt-br': `Mover a RMSNorm para o ramo (y = x + F(RMSNorm(x))) mantém o stream de largura ${HIDDEN['pt-br']} intocado enquanto cada subcamada vê uma cópia reescalada. Uma RMSNorm final reescala o stream antes do output head.`,
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Residual stream x', 'pt-br': 'Fluxo residual (residual stream) x' }, detail: { en: `${HIDDEN.en}-wide identity highway`, 'pt-br': `rodovia identidade de ${HIDDEN['pt-br']}` }, pigment: 'success' },
            { label: { en: 'Branch RMSNorm(x)', 'pt-br': 'RMSNorm(x) no ramo' }, detail: { en: 'rescales copy only (ε = 10⁻⁶)', 'pt-br': 'reescala só a cópia (ε = 10⁻⁶)' }, pigment: 'accent' },
            { label: { en: 'Sublayer F(…)', 'pt-br': 'Subcamada F(…)' }, detail: { en: 'always sees familiar scale', 'pt-br': 'sempre vê escala familiar' }, pigment: 'accent' },
            { label: { en: 'Add x + F(…)', 'pt-br': 'Somar x + F(…)' }, detail: { en: 'unobstructed path across 64 layers', 'pt-br': 'caminho livre pelas 64 camadas' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 2.9 explains the roles of training, validation, and test splits and how
   * repeatedly peeking at the test set turns it into validation data.
   */
  't2-split-discipline': {
    lesson: '2.9-overfitting-regularization-bitter-lesson',
    title: { en: 'How a held-out test set stays honest — and how it leaks', 'pt-br': 'Como um conjunto de teste fica honesto — e como ele vaza' },
    caption: {
      en: 'Evaluation changes no weights; the leak travels through your own decisions whenever the test score guides tuning.',
      'pt-br': 'Avaliar não muda peso nenhum; o vazamento viaja pelas suas próprias decisões sempre que o score de teste guia o ajuste.',
    },
    steps: [
      {
        label: { en: 'Clean split', 'pt-br': 'Divisão limpa' },
        caption: {
          en: 'Training updates parameters, validation guides model and hyperparameter choices, and the test set is touched only after every choice is frozen.',
          'pt-br': 'O treino atualiza parâmetros, a validação guia escolhas de modelo e hiperparâmetros, e o teste só é tocado depois que todas as escolhas estão congeladas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Training set', 'pt-br': 'Conjunto de treino' }, detail: { en: 'updates model parameters', 'pt-br': 'atualiza parâmetros do modelo' }, pigment: 'accent' },
            { label: { en: 'Validation set', 'pt-br': 'Conjunto de validação' }, detail: { en: 'guides architecture, tuning & stopping', 'pt-br': 'guia arquitetura, ajuste e parada' }, pigment: 'caution' },
            { label: { en: 'Frozen system', 'pt-br': 'Sistema congelado' }, detail: { en: 'no further tuning allowed', 'pt-br': 'nenhum ajuste extra permitido' }, pigment: 'muted' },
            { label: { en: 'Test set (once)', 'pt-br': 'Conjunto de teste (uma vez)' }, detail: { en: 'honest estimate on unseen data', 'pt-br': 'estimativa honesta em dados novos' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Leaked test set', 'pt-br': 'Teste vazado' },
        caption: {
          en: 'Checking the test set repeatedly and adjusting to what you see turns it into a second validation set, inflating the reported score by an unknown amount.',
          'pt-br': 'Consultar o conjunto de teste repetidamente e ajustar o sistema ao que você vê o transforma num segundo conjunto de validação, inflando o score reportado por uma quantia desconhecida.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Training set', 'pt-br': 'Conjunto de treino' }, detail: { en: 'updates model parameters', 'pt-br': 'atualiza parâmetros do modelo' }, pigment: 'accent' },
            { label: { en: 'Validation set', 'pt-br': 'Conjunto de validação' }, detail: { en: 'first round of choices', 'pt-br': 'primeira rodada de escolhas' }, pigment: 'caution' },
            { label: { en: 'Test set (reused)', 'pt-br': 'Conjunto de teste (reusado)' }, detail: { en: 'choices react to test score', 'pt-br': 'escolhas reagem ao score de teste' }, pigment: 'danger' },
            { label: { en: 'Inflated score', 'pt-br': 'Score inflado' }, detail: { en: 'no longer estimates unseen data', 'pt-br': 'não estima mais dados não vistos' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
