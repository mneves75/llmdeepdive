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
  't17-rlimit-enforcement': {
    lesson: '17.2-resource-and-filesystem-limits',
    title: { en: 'How one run is bounded from setup to cleanup', 'pt-br': 'Como uma execução é limitada da configuração à limpeza' },
    caption: {
      en: 'Kernel resource limits stop runaway CPU, output and fork loops inside the child, while the parent’s wall-clock timer catches sleeping scripts and kills the whole process group.',
      'pt-br': 'Limites de recursos do kernel param laços de CPU, saída e fork dentro do filho, enquanto o timer de relógio do pai pega scripts dormindo e mata o grupo de processos inteiro.',
    },
    steps: [
      {
        label: { en: 'Setup fails closed', 'pt-br': 'Configuração falha fechada' },
        caption: {
          en: 'Before guest code runs, the bootstrap applies required limits inside the child. If the OS refuses one, it writes the error to the pipe and exits 125 without starting the script.',
          'pt-br': 'Antes de o código convidado rodar, o bootstrap aplica os limites obrigatórios dentro do filho. Se o sistema recusar um deles, ele escreve o erro no pipe e sai com 125 sem iniciar o script.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Parent starts child', 'pt-br': 'Pai inicia o filho' }, detail: { en: 'new process group, empty env, temp output files', 'pt-br': 'novo grupo de processos, env vazio, arquivos temporários' }, pigment: 'muted' },
            { label: { en: 'Bootstrap sets rlimits', 'pt-br': 'Bootstrap aplica rlimits' }, detail: { en: 'CPU 2/3 s, file 1 MiB, 64 FDs, 0 forks; memory best effort', 'pt-br': 'CPU 2/3 s, arquivo 1 MiB, 64 FDs, 0 forks; memória se aceita' }, pigment: 'caution' },
            { label: { en: 'Write report or fail closed', 'pt-br': 'Reportar ou falhar fechado' }, detail: { en: 'ok → sends memory_limited; refused → writes error, exits 125', 'pt-br': 'ok → envia memory_limited; recusado → erro no pipe e sai 125' }, pigment: 'danger' },
            { label: { en: 'Close pipe, run or abort', 'pt-br': 'Fechar pipe, rodar ou abortar' }, detail: { en: 'guest cannot forge report; refusal raises SandboxSetupError', 'pt-br': 'convidado não falsifica o pipe; recusa gera SandboxSetupError' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Busy or noisy script', 'pt-br': 'Script ocupado ou ruidoso' },
        caption: {
          en: 'An unprivileged child cannot raise a lowered hard limit. Runaway CPU loops hit SIGXCPU at the soft limit and SIGKILL if the process reaches the hard limit; output floods stop at max_file_bytes, and the parent still kills the group at exit.',
          'pt-br': 'Um filho sem privilégios não sobe um limite rígido já reduzido. Laços de CPU atingem SIGXCPU no limite flexível e SIGKILL se o processo alcançar o limite rígido; enxurradas param em max_file_bytes, e o pai ainda mata o grupo na saída.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Guest script runs', 'pt-br': 'Script convidado roda' }, detail: { en: 'runs under lowered hard limits', 'pt-br': 'roda sob limites rígidos reduzidos' }, pigment: 'accent' },
            { label: { en: 'CPU loop hits RLIMIT_CPU', 'pt-br': 'Laço atinge RLIMIT_CPU' }, detail: { en: 'SIGXCPU at 2 s soft, SIGKILL at 3 s hard', 'pt-br': 'SIGXCPU em 2 s flexível, SIGKILL em 3 s rígido' }, pigment: 'caution' },
            { label: { en: 'Output hits RLIMIT_FSIZE', 'pt-br': 'Saída atinge RLIMIT_FSIZE' }, detail: { en: 'temp file stops at cap; parent reads bounded bytes', 'pt-br': 'arquivo temporário para no teto; pai lê bytes limitados' }, pigment: 'caution' },
            { label: { en: 'Parent calls killpg', 'pt-br': 'Pai chama killpg' }, detail: { en: 'stops any remaining process in the child’s group', 'pt-br': 'encerra qualquer processo restante no grupo do filho' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Sleeping script', 'pt-br': 'Script dormindo' },
        caption: {
          en: 'Sleeping uses almost no CPU, so RLIMIT_CPU never fires. The parent’s wall-clock timer stops waiting and kills the child’s process group — unless a child called setsid() to leave it.',
          'pt-br': 'Dormir quase não usa CPU, então o RLIMIT_CPU nunca dispara. O timer de relógio do pai encerra a espera e mata o grupo de processos do filho — salvo se um filho chamou setsid() para sair dele.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Guest script sleeps', 'pt-br': 'Script convidado dorme' }, detail: { en: 'near-zero CPU; RLIMIT_CPU never fires', 'pt-br': 'CPU quase zero; RLIMIT_CPU nunca dispara' }, pigment: 'accent' },
            { label: { en: 'Wall-clock timer expires', 'pt-br': 'Timer de relógio vence' }, detail: { en: 'parent times out after wall_seconds (default 10 s)', 'pt-br': 'pai encerra a espera após wall_seconds (padrão 10 s)' }, pigment: 'caution' },
            { label: { en: 'Parent calls killpg', 'pt-br': 'Pai chama killpg' }, detail: { en: 'SIGKILL targets only this run’s process group', 'pt-br': 'SIGKILL mira apenas o grupo de processos desta execução' }, pigment: 'success' },
            { label: { en: 'Gap: setsid() escapes', 'pt-br': 'Brecha: setsid() escapa' }, detail: { en: 'leaves the group; needs a cgroup or VM teardown', 'pt-br': 'sai do grupo; exige cgroup ou destruição de VM' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
  't17-egress-defense': {
    lesson: '17.3-network-egress-and-secrets',
    title: { en: 'Why checking names fails, and where egress blocking lives', 'pt-br': 'Por que checar nomes falha e onde vive o bloqueio de saída' },
    caption: {
      en: 'DNS rebinding abuses a second lookup; check_egress resolves once, unwraps NAT64 and pins one public IP; real enforcement still sits outside the guest.',
      'pt-br': 'O DNS rebinding abusa de uma segunda consulta; check_egress resolve uma vez, desembrulha NAT64 e fixa um IP público; a imposição real continua fora do convidado.',
    },
    steps: [
      {
        label: { en: 'DNS rebinding attack', 'pt-br': 'Ataque de DNS rebinding' },
        caption: {
          en: 'When policy checks the name in one DNS lookup and the client resolves again to connect, an attacker’s DNS server can swap a public IP for the cloud metadata address.',
          'pt-br': 'Quando a política checa o nome numa consulta DNS e o cliente resolve de novo para conectar, o servidor DNS do atacante pode trocar um IP público pelo endereço de metadados da nuvem.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Name on allowlist', 'pt-br': 'Nome na lista' }, detail: { en: 'api.supplier-alpha.example:443 matches rule', 'pt-br': 'api.supplier-alpha.example:443 casa com a regra' }, pigment: 'muted' },
            { label: { en: 'Lookup 1 (policy check)', 'pt-br': 'Consulta 1 (política)' }, detail: { en: 'attacker DNS returns a public IP; check passes', 'pt-br': 'DNS do atacante devolve IP público; checagem passa' }, pigment: 'caution' },
            { label: { en: 'Lookup 2 (connect)', 'pt-br': 'Consulta 2 (conexão)' }, detail: { en: 'attacker DNS swaps answer to 169.254.169.254', 'pt-br': 'DNS do atacante troca a resposta para 169.254.169.254' }, pigment: 'danger' },
            { label: { en: 'Metadata reached', 'pt-br': 'Metadados alcançados' }, detail: { en: 'guest fetches the host’s cloud credentials', 'pt-br': 'convidado obtém as credenciais de nuvem do host' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Resolve once and pin', 'pt-br': 'Resolver uma vez e fixar' },
        caption: {
          en: 'check_egress denies unlisted names before any DNS query, resolves once, unwraps NAT64 (64:ff9b::/96), rejects if any returned IP is non-public, and returns the exact IP to connect to.',
          'pt-br': 'check_egress nega nomes fora da lista antes de qualquer consulta DNS, resolve uma vez, desembrulha NAT64 (64:ff9b::/96), recusa se qualquer IP não for público e devolve o IP exato para conectar.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Normalize and match', 'pt-br': 'Normalizar e conferir' }, detail: { en: 'lowercase, strip trailing dot; unlisted denied before DNS', 'pt-br': 'minúsculas, sem ponto final; fora da lista negado antes do DNS' }, pigment: 'accent' },
            { label: { en: 'Resolve DNS once', 'pt-br': 'Resolver DNS uma vez' }, detail: { en: 'single lookup; empty answer is denied', 'pt-br': 'consulta única; resposta vazia é negada' }, pigment: 'accent' },
            { label: { en: 'Check every IP', 'pt-br': 'Checar cada IP' }, detail: { en: 'unwrap NAT64; any private or metadata IP denies', 'pt-br': 'desembrulhar NAT64; qualquer IP privado ou de metadados nega' }, pigment: 'caution' },
            { label: { en: 'Pin one public IP', 'pt-br': 'Fixar um IP público' }, detail: { en: 'caller connects to that IP, never re-resolves', 'pt-br': 'chamador conecta nesse IP, sem resolver de novo' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Enforce outside guest', 'pt-br': 'Impor fora do convidado' },
        caption: {
          en: 'Untrusted code can bypass check_egress by opening its own socket. Real blocking sits on the host (dual-stack firewall or no network device), paired with an empty environment and prebuilt images.',
          'pt-br': 'Código não confiável pode ignorar check_egress e abrir o próprio socket. O bloqueio real fica no host (firewall IPv4 e IPv6 ou sem interface de rede), somado a ambiente vazio e imagens pré-construídas.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Guest has no secrets', 'pt-br': 'Convidado sem segredos' }, detail: { en: 'env={} and no credential files mounted', 'pt-br': 'env={} e nenhum arquivo de credencial montado' }, pigment: 'accent' },
            { label: { en: 'Outside-guest block', 'pt-br': 'Bloqueio fora do convidado' }, detail: { en: 'host firewall (IPv4 + IPv6) or VM with no NIC', 'pt-br': 'firewall no host (IPv4 + IPv6) ou VM sem rede' }, pigment: 'caution' },
            { label: { en: 'Build-time packages', 'pt-br': 'Pacotes na imagem' }, detail: { en: 'pinned before run time so guest needs no network', 'pt-br': 'fixados antes da execução para o convidado não usar rede' }, pigment: 'success' },
            { label: { en: 'Probe real reply', 'pt-br': 'Sondar resposta real' }, detail: { en: 'check application response, not only TCP connect()', 'pt-br': 'checar resposta de aplicação, não só connect() TCP' }, pigment: 'success' },
          ],
        },
      },
    ],
  },
  't17-boundary-probes': {
    lesson: '17.5-choose-and-test-the-boundary',
    title: { en: 'Measuring a configured boundary and cleaning up by ID', 'pt-br': 'Medir um limite configurado e limpar por ID' },
    caption: {
      en: 'probe_boundary replaces vendor claims with four measured booleans, a positive control proves the probes detect weaker settings, and cleanup deletes only the exact resources a run created.',
      'pt-br': 'probe_boundary troca promessas de fornecedor por quatro booleanos medidos, um controle positivo prova que as sondas detectam ajustes mais frouxos, e a limpeza remove só os recursos exatos que a execução criou.',
    },
    steps: [
      {
        label: { en: 'Subprocess (measured)', 'pt-br': 'Subprocesso (medido)' },
        caption: {
          en: 'As an ordinary user, SubprocessBackend holds three controls and exposes one missing boundary: the guest still reads host-secret.txt outside its workspace.',
          'pt-br': 'Como usuário comum, o SubprocessBackend mantém três controles e expõe um limite ausente: o convidado ainda lê host-secret.txt fora da workspace.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Reads host file: True', 'pt-br': 'Lê arquivo do host: True' }, detail: { en: 'reads_host_file — no filesystem boundary', 'pt-br': 'reads_host_file — sem isolamento de arquivos' }, pigment: 'danger' },
            { label: { en: 'Inherits env: False', 'pt-br': 'Herda ambiente: False' }, detail: { en: 'inherits_environment — env={} hid PATH and HOME', 'pt-br': 'inherits_environment — env={} ocultou PATH e HOME' }, pigment: 'success' },
            { label: { en: 'Starts processes: False', 'pt-br': 'Inicia processos: False' }, detail: { en: 'starts_processes — RLIMIT_NPROC blocked fork', 'pt-br': 'starts_processes — RLIMIT_NPROC bloqueou o fork' }, pigment: 'success' },
            { label: { en: 'Output bounded: True', 'pt-br': 'Saída limitada: True' }, detail: { en: 'output_bounded — 32 MiB flood cut by RLIMIT_FSIZE', 'pt-br': 'output_bounded — enxurrada de 32 MiB cortada por RLIMIT_FSIZE' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Looser positive control', 'pt-br': 'Controle positivo mais frouxo' },
        caption: {
          en: 'Setting allow_processes=True and max_file_bytes=64 MiB flips starts_processes and output_bounded, proving the probes tell configurations apart.',
          'pt-br': 'Ajustar allow_processes=True e max_file_bytes=64 MiB inverte starts_processes e output_bounded, provando que as sondas diferenciam configurações.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Reads host file: True', 'pt-br': 'Lê arquivo do host: True' }, detail: { en: 'still no filesystem isolation', 'pt-br': 'ainda sem isolamento de arquivos' }, pigment: 'danger' },
            { label: { en: 'Inherits env: False', 'pt-br': 'Herda ambiente: False' }, detail: { en: 'run_python still starts with env={}', 'pt-br': 'run_python ainda inicia com env={}' }, pigment: 'success' },
            { label: { en: 'Starts processes: True', 'pt-br': 'Inicia processos: True' }, detail: { en: 'allow_processes=True lets fork succeed', 'pt-br': 'allow_processes=True deixa o fork passar' }, pigment: 'danger' },
            { label: { en: 'Output bounded: False', 'pt-br': 'Saída limitada: False' }, detail: { en: '64 MiB cap lets the 32 MiB flood pass', 'pt-br': 'teto de 64 MiB deixa a enxurrada de 32 MiB passar' }, pigment: 'danger' },
          ],
        },
      },
      {
        label: { en: 'Scoped cleanup by ID', 'pt-br': 'Limpeza precisa por ID' },
        caption: {
          en: 'SubprocessBackend removes only the workspace path and process group recorded for this run — on normal exit, timeout or chmod 0 — never by wildcard. A microVM backend must apply the same rule to its jail directory and cgroup.',
          'pt-br': 'O SubprocessBackend remove só o caminho da workspace e o grupo de processos registrados para esta execução — na saída normal, no timeout ou após chmod 0 — nunca por curinga. Um backend de microVM precisa aplicar a mesma regra ao diretório de jail e ao cgroup.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Record exact IDs', 'pt-br': 'Registrar IDs exatos' }, detail: { en: 'workspace path and process group (or VM jailer id)', 'pt-br': 'caminho da workspace e grupo de processos (ou id do jailer)' }, pigment: 'accent' },
            { label: { en: 'Clean on every exit', 'pt-br': 'Limpar em toda saída' }, detail: { en: 'normal exit, timeout, or guest chmod 0', 'pt-br': 'saída normal, timeout ou chmod 0 do convidado' }, pigment: 'caution' },
            { label: { en: 'Neighbour untouched', 'pt-br': 'Vizinho intacto' }, detail: { en: 'agentlab-sandbox-neighbour survives beside it', 'pt-br': 'agentlab-sandbox-neighbour sobrevive ao lado' }, pigment: 'success' },
            { label: { en: 'Never wildcards', 'pt-br': 'Nunca curingas' }, detail: { en: 'rm -rf *-sandbox-* or pkill python hits other runs', 'pt-br': 'rm -rf *-sandbox-* ou pkill python atinge outras execuções' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
