/**
 * Figures for track 17 — Sandboxed Execution.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 *
 * Pigments: accent is the untrusted guest code, caution a layer that acts as the
 * boundary, danger a host component the guest reaches directly, muted a host
 * component behind the boundary. The lifecycle mirrors
 * `examples/agent-engineering/src/agentlab/sandbox/interpreter.py`.
 */
import type { Figure, FigureStep } from './types'

const hardware: FigureStep = { label: { en: 'Hardware', 'pt-br': 'Máquina física' }, pigment: 'muted' }
const script: FigureStep = {
  label: { en: 'Untrusted script', 'pt-br': 'Script não confiável' },
  detail: { en: 'written by the model', 'pt-br': 'escrito pelo modelo' },
  pigment: 'accent',
}

export const TRACK_17_FIGURES = {
  'isolation-layers': {
    lesson: '17.1-what-isolation-protects',
    title: { en: 'What sits between the script and the host kernel', 'pt-br': 'O que fica entre o script e o kernel do host' },
    caption: {
      en: 'Each step moves the boundary further from the host. Only the last two give the script a kernel that is not the host kernel.',
      'pt-br': 'Cada passo afasta o limite do host. Só os dois últimos dão ao script um kernel que não é o kernel do host.',
    },
    steps: [
      {
        label: { en: 'Process with limits', 'pt-br': 'Processo com limites' },
        caption: {
          en: 'Same user, same files, same network. The rlimits cap how much it uses, not what it can reach.',
          'pt-br': 'Mesmo usuário, mesmos arquivos, mesma rede. Os rlimits limitam quanto ele usa, não o que ele alcança.',
        },
        body: {
          kind: 'stack',
          direction: 'up',
          steps: [
            hardware,
            { label: { en: 'Host kernel', 'pt-br': 'Kernel do host' }, detail: { en: 'receives every system call', 'pt-br': 'recebe toda chamada de sistema' }, pigment: 'danger' },
            { label: { en: 'Python process, your user', 'pt-br': 'Processo Python, seu usuário' }, detail: { en: 'CPU, file and process limits', 'pt-br': 'limites de CPU, arquivos e processos' }, pigment: 'caution' },
            script,
          ],
        },
      },
      {
        label: { en: 'Container', 'pt-br': 'Contêiner' },
        caption: {
          en: 'Namespaces give the script its own view of files, processes and network, but its system calls still reach the shared host kernel.',
          'pt-br': 'Namespaces dão ao script sua própria visão de arquivos, processos e rede, mas suas chamadas de sistema ainda chegam ao kernel do host, que é compartilhado.',
        },
        body: {
          kind: 'stack',
          direction: 'up',
          steps: [
            hardware,
            { label: { en: 'Host kernel', 'pt-br': 'Kernel do host' }, detail: { en: 'shared, filtered by seccomp', 'pt-br': 'compartilhado, filtrado por seccomp' }, pigment: 'danger' },
            { label: { en: 'Namespaces and cgroups', 'pt-br': 'Namespaces e cgroups' }, detail: { en: 'own view, own quotas', 'pt-br': 'visão própria, cotas próprias' }, pigment: 'caution' },
            script,
          ],
        },
      },
      {
        label: { en: 'gVisor', 'pt-br': 'Com gVisor' },
        caption: {
          en: 'The Sentry answers the script’s system calls itself. It runs in user space and is not a virtual machine.',
          'pt-br': 'O Sentry responde ele mesmo às chamadas de sistema do script. Ele roda em espaço de usuário e não é uma máquina virtual.',
        },
        body: {
          kind: 'stack',
          direction: 'up',
          steps: [
            hardware,
            { label: { en: 'Host kernel', 'pt-br': 'Kernel do host' }, detail: { en: 'sees only the Sentry’s own calls', 'pt-br': 'vê só as chamadas do próprio Sentry' }, pigment: 'muted' },
            { label: { en: 'gVisor Sentry', 'pt-br': 'Sentry do gVisor' }, detail: { en: 'an application kernel in Go', 'pt-br': 'um kernel de aplicação em Go' }, pigment: 'caution' },
            script,
          ],
        },
      },
      {
        label: { en: 'MicroVM', 'pt-br': 'Numa microVM' },
        caption: {
          en: 'The script talks to a guest kernel. The guest kernel reaches the host only through Firecracker’s emulated devices and KVM.',
          'pt-br': 'O script conversa com um kernel convidado. Esse kernel só chega ao host pelos dispositivos emulados do Firecracker e pelo KVM.',
        },
        body: {
          kind: 'stack',
          direction: 'up',
          steps: [
            { label: { en: 'Hardware virtualization', 'pt-br': 'Virtualização em hardware' }, pigment: 'muted' },
            { label: { en: 'Host kernel with KVM', 'pt-br': 'Kernel do host com KVM' }, pigment: 'muted' },
            { label: { en: 'Firecracker, jailed', 'pt-br': 'Firecracker, enjaulado' }, detail: { en: 'a few emulated devices', 'pt-br': 'poucos dispositivos emulados' }, pigment: 'caution' },
            { label: { en: 'Guest kernel', 'pt-br': 'Kernel convidado' }, detail: { en: 'the microVM’s own', 'pt-br': 'o da própria microVM' }, pigment: 'caution' },
            script,
          ],
        },
      },
    ],
  },
  'interpreter-lifecycle': {
    lesson: '17.4-a-python-interpreter-in-a-microvm',
    title: { en: 'One request, from a new sandbox to its removal', 'pt-br': 'Um pedido, da sandbox nova até sua remoção' },
    caption: {
      en: 'Both backends follow the same five steps. Destroy runs whatever happened in the middle, and it removes only what create made.',
      'pt-br': 'Os dois backends seguem os mesmos cinco passos. Destruir roda aconteça o que acontecer no meio, e remove só o que criar fez.',
    },
    body: {
      kind: 'flow',
      steps: [
        { label: { en: 'Create', 'pt-br': 'Criar' }, detail: { en: 'new workspace or microVM', 'pt-br': 'workspace ou microVM nova' }, pigment: 'accent' },
        { label: { en: 'Upload', 'pt-br': 'Enviar' }, detail: { en: 'validated CSV names only', 'pt-br': 'só nomes de CSV validados' }, pigment: 'accent' },
        { label: { en: 'Execute', 'pt-br': 'Executar' }, detail: { en: 'limits on, no network', 'pt-br': 'limites ligados, sem rede' }, pigment: 'caution' },
        { label: { en: 'Collect', 'pt-br': 'Coletar' }, detail: { en: 'regular files, capped', 'pt-br': 'arquivos comuns, com teto' }, pigment: 'caution' },
        { label: { en: 'Destroy', 'pt-br': 'Destruir' }, detail: { en: 'exactly what create made', 'pt-br': 'exatamente o que criar fez' }, pigment: 'success' },
      ],
    },
  },
} as const satisfies Record<string, Figure>
