/**
 * Figures for track 18 — Computer Use & GUI Automation.
 *
 * One file per track, matching the disjoint-directory rule content lanes already
 * follow: a single large registry would collide on every concurrent lane.
 */
import type { Figure } from './types'

export const TRACK_18_FIGURES = {
  /**
   * 18.1 contrasts three targeting strategies (CSS path, positional `.first`,
   * and role + accessible name through `resolve`) across the portal's three
   * layouts (`reports_a.html`, `reports_b.html`, `reports_c.html`). Replaces
   * the prose walkthrough of both failure modes and tightens the layout-c
   * ambiguity passage.
   */
  't18-locators-across-layouts': {
    lesson: '18.1-observe-before-acting',
    title: { en: 'Three locators across three portal layouts', 'pt-br': 'Três locators em três layouts do portal' },
    caption: {
      en: 'Step through the three portal layouts from the exercise. Structural and positional selectors either break or download the wrong month; role plus accessible name through resolve accepts exactly one match and stops on ambiguity.',
      'pt-br': 'Percorra os três layouts do portal do exercício. Seletores estruturais e posicionais quebram ou baixam o mês errado; papel mais nome acessível via resolve aceita exatamente uma correspondência e para diante de ambiguidade.',
    },
    steps: [
      {
        label: { en: 'Layout a: table', 'pt-br': 'Layout a: tabela' },
        caption: {
          en: 'In the original table (#report-table, oldest row first), all three locators happen to hit March 2026. The fragile ones only look safe until the page changes.',
          'pt-br': 'Na tabela original (#report-table, linha mais antiga primeiro), os três locators acertam março de 2026. Os frágeis só parecem seguros até a página mudar.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'CSS path (#report-table … tr:nth-child(1) button)', 'pt-br': 'Caminho CSS (#report-table … tr:nth-child(1) button)' },
              detail: { en: '1 match: March 2026 (first table row)', 'pt-br': '1 correspondência: março de 2026 (primeira linha da tabela)' },
              pigment: 'success',
            },
            {
              label: { en: 'Positional (button[data-period].first)', 'pt-br': 'Posicional (button[data-period].first)' },
              detail: { en: '1 match: March 2026 (oldest month is at the top)', 'pt-br': '1 correspondência: março de 2026 (mês mais antigo está no topo)' },
              pigment: 'success',
            },
            {
              label: { en: 'Role + accessible name (resolve, exact=True)', 'pt-br': 'Papel + nome acessível (resolve, exact=True)' },
              detail: { en: '1 match: button "Download March 2026 CSV" via visible text', 'pt-br': '1 correspondência: botão "Download March 2026 CSV" pelo texto visível' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Layout b: redesigned cards', 'pt-br': 'Layout b: cartões redesenhados' },
        caption: {
          en: 'The table becomes a column of cards, newest first, with visible text "CSV" and aria-label="Download March 2026 CSV". The CSS path fails visibly, the positional selector downloads July without warning, and role + name still finds March.',
          'pt-br': 'A tabela vira uma coluna de cartões, do mais novo para o mais antigo, com texto visível "CSV" e aria-label="Download March 2026 CSV". O caminho CSS falha de forma visível, o posicional baixa julho sem aviso e papel + nome ainda encontra março.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'CSS path (#report-table … tr:nth-child(1) button)', 'pt-br': 'Caminho CSS (#report-table … tr:nth-child(1) button)' },
              detail: { en: '0 matches: table is gone (visible failure)', 'pt-br': '0 correspondências: a tabela sumiu (falha visível)' },
              pigment: 'caution',
            },
            {
              label: { en: 'Positional (button[data-period].first)', 'pt-br': 'Posicional (button[data-period].first)' },
              detail: { en: 'Downloads July 2026 (newest card first; wrong report)', 'pt-br': 'Baixa julho de 2026 (cartão mais novo primeiro; relatório errado)' },
              pigment: 'danger',
            },
            {
              label: { en: 'Role + accessible name (resolve, exact=True)', 'pt-br': 'Papel + nome acessível (resolve, exact=True)' },
              detail: { en: '1 match: button "Download March 2026 CSV" via aria-label', 'pt-br': '1 correspondência: botão "Download March 2026 CSV" via aria-label' },
              pigment: 'success',
            },
          ],
        },
      },
      {
        label: { en: 'Layout c: five "Export" buttons', 'pt-br': 'Layout c: cinco botões "Export"' },
        caption: {
          en: 'A list replaces the table and every export button is renamed to "Export". Both the old March name (0 matches) and the generic "Export" name (5 matches) make resolve return None, so the run stops and escalates instead of guessing.',
          'pt-br': 'Uma lista substitui a tabela e todo botão de exportação vira "Export". Tanto o nome antigo de março (0 correspondências) quanto "Export" (5 correspondências) fazem resolve devolver None, então a execução para e escala em vez de chutar.',
        },
        body: {
          kind: 'stack',
          direction: 'down',
          steps: [
            {
              label: { en: 'CSS path (#report-table … tr:nth-child(1) button)', 'pt-br': 'Caminho CSS (#report-table … tr:nth-child(1) button)' },
              detail: { en: '0 matches: table replaced by a list (visible failure)', 'pt-br': '0 correspondências: tabela trocada por lista (falha visível)' },
              pigment: 'caution',
            },
            {
              label: { en: 'Positional (button[data-period].first)', 'pt-br': 'Posicional (button[data-period].first)' },
              detail: { en: 'Picks the first button by document order alone (guess)', 'pt-br': 'Escolhe o primeiro botão só pela ordem no documento (chute)' },
              pigment: 'danger',
            },
            {
              label: { en: 'Role + accessible name (resolve, exact=True)', 'pt-br': 'Papel + nome acessível (resolve, exact=True)' },
              detail: { en: '0 matches for March, 5 for "Export" → returns None (escalate)', 'pt-br': '0 para março, 5 para "Export" → devolve None (escalar)' },
              pigment: 'caution',
            },
          ],
        },
      },
    ],
  },

  /**
   * 18.2 walks a vision model's pixel answer through scaling, scroll
   * compensation, and fresh-snapshot verification (`click_point`). Replaces the
   * prose step-by-step trace of the scale-2 case, the 60 px stale scroll, and
   * the re-observation refusal.
   */
  't18-coordinate-transform': {
    lesson: '18.2-pixels-coordinates-and-set-of-mark',
    title: { en: 'From screenshot pixel to verified click', 'pt-br': 'Do pixel da captura ao clique verificado' },
    caption: {
      en: 'click_point scales the model’s image pixel into CSS pixels, compensates for any scroll since capture, and checks a fresh snapshot before moving the mouse.',
      'pt-br': 'click_point converte o pixel da imagem devolvido pelo modelo para pixels CSS, compensa qualquer rolagem desde a captura e confere um snapshot novo antes de mover o mouse.',
    },
    steps: [
      {
        label: { en: 'Scale 2, no scroll', 'pt-br': 'Escala 2, sem rolagem' },
        caption: {
          en: 'Viewport 800 × 600 CSS px at device scale 2 produces a 1,600 × 1,200 screenshot (r = 0.5). Scaling halves (547, 422) to (273.5, 211), where pick_mark confirms March’s button.',
          'pt-br': 'Uma viewport de 800 × 600 pixels CSS com fator de escala 2 gera uma captura de 1.600 × 1.200 (r = 0,5). A escala reduz (547; 422) pela metade para (273,5; 211), onde pick_mark confirma o botão de março.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Image pixel', 'pt-br': 'Pixel da imagem' }, detail: { en: '(547, 422) on 1,600 × 1,200 image', 'pt-br': '(547; 422) na imagem 1.600 × 1.200' }, pigment: 'muted' },
            { label: { en: 'Scale by r', 'pt-br': 'Escalar por r' }, detail: { en: 'r = 800 / 1,600 = 0.5 → (273.5, 211)', 'pt-br': 'r = 800 / 1.600 = 0,5 → (273,5; 211)' }, pigment: 'accent' },
            { label: { en: 'Adjust scroll', 'pt-br': 'Ajustar rolagem' }, detail: { en: 'capture 0, now 0 → (273.5, 211)', 'pt-br': 'captura 0, agora 0 → (273,5; 211)' }, pigment: 'accent' },
            { label: { en: 'Check under point', 'pt-br': 'Conferir sob o ponto' }, detail: { en: 'pick_mark finds 1 button: March', 'pt-br': 'pick_mark acha 1 botão: março' }, pigment: 'success' },
            { label: { en: 'Click', 'pt-br': 'Clicar' }, detail: { en: 'runs mouse.click at (273.5, 211)', 'pt-br': 'executa mouse.click em (273,5; 211)' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Page scrolls 60 px', 'pt-br': 'Página rola 60 px' },
        caption: {
          en: 'In the 320 px-tall viewport, March was centred at y = 211 at scrollY 0, then the page scrolled 60 CSS px down. Subtracting the new scroll shifts the click to y = 151 instead of hitting April.',
          'pt-br': 'Na viewport de 320 px de altura, março estava em y = 211 com scrollY 0, e a página rolou 60 pixels CSS para baixo. Subtrair a nova rolagem leva o clique a y = 151 em vez de acertar abril.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Image pixel', 'pt-br': 'Pixel da imagem' }, detail: { en: 'March centre at capture (scrollY 0)', 'pt-br': 'centro de março na captura (scrollY 0)' }, pigment: 'muted' },
            { label: { en: 'Scale by r', 'pt-br': 'Escalar por r' }, detail: { en: 'page point at y = 211 CSS px', 'pt-br': 'ponto na página em y = 211 pixels CSS' }, pigment: 'accent' },
            { label: { en: 'Adjust scroll', 'pt-br': 'Ajustar rolagem' }, detail: { en: '0 + 211 − 60 = 151 (raw 211 hits April)', 'pt-br': '0 + 211 − 60 = 151 (211 cru acerta abril)' }, pigment: 'caution' },
            { label: { en: 'Check under point', 'pt-br': 'Conferir sob o ponto' }, detail: { en: 'fresh snapshot confirms 1 button: March', 'pt-br': 'novo snapshot confirma 1 botão: março' }, pigment: 'success' },
            { label: { en: 'Click', 'pt-br': 'Clicar' }, detail: { en: 'clicks March at y = 151', 'pt-br': 'clica em março em y = 151' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Offscreen or ambiguous', 'pt-br': 'Fora da tela ou ambíguo' },
        caption: {
          en: 'When scrolling pushes the point outside the viewport (OffscreenTarget) or pick_mark finds zero or several marks under it, click_point logs gui.reobserve and never touches the mouse.',
          'pt-br': 'Quando a rolagem empurra o ponto para fora da viewport (OffscreenTarget) ou pick_mark acha zero ou várias marcas sob ele, click_point registra gui.reobserve e nunca toca no mouse.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Image pixel', 'pt-br': 'Pixel da imagem' }, detail: { en: 'point from screenshot', 'pt-br': 'ponto da captura de tela' }, pigment: 'muted' },
            { label: { en: 'Scale by r', 'pt-br': 'Escalar por r' }, detail: { en: 'axes checked within 1% tolerance', 'pt-br': 'eixos conferidos com tolerância de 1%' }, pigment: 'accent' },
            { label: { en: 'Adjust scroll', 'pt-br': 'Ajustar rolagem' }, detail: { en: 'outside viewport → OffscreenTarget', 'pt-br': 'fora da viewport → OffscreenTarget' }, pigment: 'danger' },
            { label: { en: 'Check under point', 'pt-br': 'Conferir sob o ponto' }, detail: { en: '0 or ≥ 2 marks → pick_mark returns None', 'pt-br': '0 ou ≥ 2 marcas → pick_mark devolve None' }, pigment: 'danger' },
            { label: { en: 'Re-observe', 'pt-br': 'Reobservar' }, detail: { en: 'logs gui.reobserve; 0 clicks spent', 'pt-br': 'grava gui.reobserve; 0 cliques gastos' }, pigment: 'caution' },
          ],
        },
      },
    ],
  },

  /**
   * 18.3 separates credential handling from the model and classifies every
   * page before clicking. Stepping across the three cases (real portal,
   * lookalike origin, and expired session / challenge) shows how the vault,
   * trace scrubber, HttpOnly cookie and classify_page work together.
   */
  't18-session-and-vault-flow': {
    lesson: '18.3-login-and-session-state',
    title: { en: 'Credentials stay in the controller; page state gates every turn', 'pt-br': 'Credenciais ficam no controlador; o estado da página controla cada passo' },
    caption: {
      en: 'Step through the three situations in this lesson: normal sign-in on the portal, a lookalike login page, and an expired session or human challenge.',
      'pt-br': 'Percorra as três situações desta aula: login normal no portal, uma página de login imitadora e uma sessão expirada ou desafio humano.',
    },
    steps: [
      {
        label: { en: 'Portal sign-in', 'pt-br': 'Login no portal' },
        caption: {
          en: 'The controller releases the credential only for the exact origin, fills the fields directly, scrubs every trace event and lets the browser hold the HttpOnly session cookie.',
          'pt-br': 'O controlador libera a credencial só para a origem exata, preenche os campos diretamente, limpa cada evento do trace e deixa o navegador guardar o cookie de sessão HttpOnly.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Origin check', 'pt-br': 'Checar origem' }, detail: { en: 'CredentialVault.release matches scheme, host, port', 'pt-br': 'CredentialVault.release confere esquema, host e porta' }, pigment: 'accent' },
            { label: { en: 'Controller fills form', 'pt-br': 'Controlador preenche' }, detail: { en: 'fills Username and Password; model sees no secret', 'pt-br': 'preenche usuário e senha; modelo não vê segredo' }, pigment: 'accent' },
            { label: { en: 'Scrubbed trace', 'pt-br': 'Trace limpo' }, detail: { en: 'logs "[secret]" and scrubs raw secrets', 'pt-br': 'grava "[secret]" e remove segredos crus' }, pigment: 'caution' },
            { label: { en: 'Session ready', 'pt-br': 'Sessão pronta' }, detail: { en: 'HttpOnly cookie saved; classify_page returns ready', 'pt-br': 'cookie HttpOnly salvo; classify_page devolve ready' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Lookalike page', 'pt-br': 'Página imitadora' },
        caption: {
          en: 'A different scheme, host or port — even localhost instead of 127.0.0.1 — is a different origin. The vault raises PermissionError before a single field is filled.',
          'pt-br': 'Esquema, host ou porta diferente — mesmo localhost no lugar de 127.0.0.1 — é outra origem. O cofre lança PermissionError antes de preencher qualquer campo.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Lookalike URL', 'pt-br': 'URL imitadora' }, detail: { en: 'scheme, host or port differs from vault', 'pt-br': 'esquema, host ou porta difere do cofre' }, pigment: 'muted' },
            { label: { en: 'Origin check', 'pt-br': 'Checar origem' }, detail: { en: 'CredentialVault.release finds no match', 'pt-br': 'CredentialVault.release não acha correspondência' }, pigment: 'danger' },
            { label: { en: 'Refused', 'pt-br': 'Recusado' }, detail: { en: 'raises PermissionError before filling', 'pt-br': 'lança PermissionError antes de preencher' }, pigment: 'danger' },
            { label: { en: 'Nothing leaked', 'pt-br': 'Nada vazou' }, detail: { en: 'password field stays empty; no session opened', 'pt-br': 'campo de senha fica vazio; nenhuma sessão aberta' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Expired or challenge', 'pt-br': 'Expirada ou desafio' },
        caption: {
          en: 'After 15 minutes the portal redirects to /login?expired=1. Before any click, classify_page routes /login to needs_login and foreign origins, CAPTCHAs or one-time codes to needs_human.',
          'pt-br': 'Depois de 15 minutos o portal redireciona para /login?expired=1. Antes de clicar, classify_page envia /login para needs_login e origens externas, CAPTCHAs ou códigos de uso único para needs_human.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Observe page', 'pt-br': 'Observar página' }, detail: { en: 'spends 1 observe action', 'pt-br': 'gasta 1 ação observe' }, pigment: 'accent' },
            { label: { en: 'Classify page', 'pt-br': 'Classificar página' }, detail: { en: 'checks origin, challenge phrases, /login path', 'pt-br': 'confere origem, frases de desafio e caminho /login' }, pigment: 'accent' },
            { label: { en: 'Pause state', 'pt-br': 'Estado de pausa' }, detail: { en: 'needs_login on /login; needs_human on challenge', 'pt-br': 'needs_login em /login; needs_human em desafio' }, pigment: 'caution' },
            { label: { en: 'Stop before clicking', 'pt-br': 'Parar antes de clicar' }, detail: { en: '0 clicks spent; controller or person decides', 'pt-br': '0 cliques gastos; controlador ou pessoa decide' }, pigment: 'success' },
          ],
        },
      },
    ],
  },

  /**
   * 18.4 turns "the download worked" into six ordered gates. Replaces the
   * 6-item numbered list and the month-by-month prose summary of April–July's
   * planted defects.
   */
  't18-download-gates': {
    lesson: '18.4-download-a-csv-from-a-legacy-portal',
    title: { en: 'Six gates between a click and a done download', 'pt-br': 'Seis portões entre um clique e um download concluído' },
    caption: {
      en: 'A download is accepted only after passing every gate in order. Step to the second frame to see which gate stops each of the portal’s four planted defects.',
      'pt-br': 'Um download só é aceito depois de passar por todos os portões em ordem. Avance para o segundo quadro para ver qual portão barra cada um dos quatro defeitos plantados no portal.',
    },
    steps: [
      {
        label: { en: 'Good export (March)', 'pt-br': 'Exportação boa (março)' },
        caption: {
          en: 'March arrives 400 ms after the status banner and clears all six gates, leaving four verified rows saved in the run’s folder.',
          'pt-br': 'Março chega 400 ms depois do aviso de status e passa pelos seis portões, deixando quatro linhas verificadas salvas na pasta da execução.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Download event', 'pt-br': 'Evento de download' }, detail: { en: 'starts within deadline (expect_download)', 'pt-br': 'começa dentro do prazo (expect_download)' }, pigment: 'success' },
            { label: { en: 'Transfer status', 'pt-br': 'Status da transferência' }, detail: { en: 'download.failure() returns None', 'pt-br': 'download.failure() devolve None' }, pigment: 'success' },
            { label: { en: 'Origin', 'pt-br': 'Origem' }, detail: { en: 'same scheme, host and port as portal', 'pt-br': 'mesmo esquema, host e porta do portal' }, pigment: 'success' },
            { label: { en: 'Destination', 'pt-br': 'Destino' }, detail: { en: 'plain .csv inside run folder, no overwrite', 'pt-br': '.csv simples na pasta da execução, sem sobrescrever' }, pigment: 'success' },
            { label: { en: 'Format & columns', 'pt-br': 'Formato e colunas' }, detail: { en: '≤ 1 MiB, not HTML, UTF-8, exact 8 columns', 'pt-br': '≤ 1 MiB, não é HTML, UTF-8, 8 colunas exatas' }, pigment: 'success' },
            { label: { en: 'Rows & period', 'pt-br': 'Linhas e período' }, detail: { en: '4 rows for 2026-03, valid PO ids and amounts → done', 'pt-br': '4 linhas de 2026-03, PO ids e valores válidos → done' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Planted failures (April–July)', 'pt-br': 'Falhas plantadas (abril–julho)' },
        caption: {
          en: 'Four bad months stop at four different gates. May’s HTML page clears failure() and origin because the transfer succeeded, and any file rejected after saving is deleted.',
          'pt-br': 'Quatro meses ruins param em quatro portões diferentes. A página HTML de maio passa por failure() e origem porque a transferência terminou, e todo arquivo recusado após salvo é apagado.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Download event', 'pt-br': 'Evento de download' }, detail: { en: 'April: HTTP 500, no file despite banner → failed', 'pt-br': 'Abril: HTTP 500, sem arquivo apesar do aviso → failed' }, pigment: 'danger' },
            { label: { en: 'Transfer status', 'pt-br': 'Status da transferência' }, detail: { en: 'May–July finish transferring; failure() sees no error', 'pt-br': 'Maio–julho terminam a transferência; failure() não vê erro' }, pigment: 'muted' },
            { label: { en: 'Origin', 'pt-br': 'Origem' }, detail: { en: 'blocks downloads served from another origin', 'pt-br': 'bloqueia downloads servidos de outra origem' }, pigment: 'accent' },
            { label: { en: 'Destination', 'pt-br': 'Destino' }, detail: { en: 'July: ../../report-2026-07.csv refused → failed', 'pt-br': 'Julho: ../../report-2026-07.csv recusado → failed' }, pigment: 'danger' },
            { label: { en: 'Format & columns', 'pt-br': 'Formato e colunas' }, detail: { en: 'May: HTML error page named .csv deleted → failed', 'pt-br': 'Maio: página HTML chamada .csv apagada → failed' }, pigment: 'danger' },
            { label: { en: 'Rows & period', 'pt-br': 'Linhas e período' }, detail: { en: 'June: rows carry 2026-03 instead of 2026-06; deleted → failed', 'pt-br': 'Junho: linhas trazem 2026-03 em vez de 2026-06; apagado → failed' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },

  /**
   * 18.5 traces the four mornings through `fetch_report`'s bounded loop.
   * Replaces the prose walkthrough of every branch after the code block.
   */
  't18-recovery-loop': {
    lesson: '18.5-recover-and-verify',
    title: { en: 'Four mornings through the recovery loop', 'pt-br': 'Quatro manhãs pelo laço de recuperação' },
    caption: {
      en: 'Step through Monday to Thursday. Every pass spends from ActionBudget, re-observes after any page change, escalates anything unknown, and calls the run done only after file validation.',
      'pt-br': 'Avance de segunda a quinta-feira. Cada volta gasta do ActionBudget, observa de novo depois de qualquer mudança na página, escala o desconhecido e só declara done após validar o arquivo.',
    },
    steps: [
      {
        label: { en: 'Monday: known dialog', 'pt-br': 'Segunda: diálogo conhecido' },
        caption: {
          en: 'The maintenance overlay blocks a plain click. fetch_report closes the single Dismiss button, restarts the loop to re-observe the changed page, then clicks March. Spent: observe, dismiss, observe, click.',
          'pt-br': 'A camada de manutenção bloqueia um clique direto. fetch_report fecha o único botão Dismiss, reinicia o laço para reobservar a página mudada e clica em março. Gasto: observe, dismiss, observe, click.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Observe', 'pt-br': 'Observar' }, detail: { en: 'state ready; dialog visible', 'pt-br': 'estado ready; diálogo visível' }, pigment: 'accent' },
            { label: { en: 'Dismiss dialog', 'pt-br': 'Fechar diálogo' }, detail: { en: '1 Dismiss button found; clicks it', 'pt-br': '1 botão Dismiss achado; clica nele' }, pigment: 'caution' },
            { label: { en: 'Observe again', 'pt-br': 'Observar de novo' }, detail: { en: 'continue restarts on updated page', 'pt-br': 'continue reinicia na página atualizada' }, pigment: 'accent' },
            { label: { en: 'Resolve target', 'pt-br': 'Resolver alvo' }, detail: { en: '1 match for March button', 'pt-br': '1 correspondência para o botão de março' }, pigment: 'accent' },
            { label: { en: 'Click & verify', 'pt-br': 'Clicar e verificar' }, detail: { en: 'CSV passes checks → done', 'pt-br': 'CSV passa nas verificações → done' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Tuesday: redesigned layout', 'pt-br': 'Terça: layout redesenhado' },
        caption: {
          en: 'The table became cards in reverse order, keeping roles and aria-label names. Role-and-name resolution handles the redesign with no extra branch. Spent: observe, click.',
          'pt-br': 'A tabela virou cartões em ordem invertida, mantendo papéis e nomes em aria-label. A resolução por papel e nome atravessa o redesenho sem ramo extra. Gasto: observe, click.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Observe', 'pt-br': 'Observar' }, detail: { en: 'state ready; no dialog', 'pt-br': 'estado ready; sem diálogo' }, pigment: 'accent' },
            { label: { en: 'Resolve target', 'pt-br': 'Resolver alvo' }, detail: { en: 'role + name still matches 1 button', 'pt-br': 'papel + nome ainda encontra 1 botão' }, pigment: 'success' },
            { label: { en: 'Click', 'pt-br': 'Clicar' }, detail: { en: 'clicks March card button', 'pt-br': 'clica no botão do cartão de março' }, pigment: 'accent' },
            { label: { en: 'Verify file', 'pt-br': 'Verificar arquivo' }, detail: { en: 'CSV passes checks → done', 'pt-br': 'CSV passa nas verificações → done' }, pigment: 'success' },
          ],
        },
      },
      {
        label: { en: 'Wednesday: unknown layout', 'pt-br': 'Quarta: layout desconhecido' },
        caption: {
          en: 'Every export button now reads "Export". resolve returns None and the loop escalates immediately without clicking or guessing. Spent: observe.',
          'pt-br': 'Todo botão de exportação agora diz "Export". resolve devolve None e o laço escala na hora sem clicar nem chutar. Gasto: observe.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Observe', 'pt-br': 'Observar' }, detail: { en: 'state ready; no dialog', 'pt-br': 'estado ready; sem diálogo' }, pigment: 'accent' },
            { label: { en: 'Resolve target', 'pt-br': 'Resolver alvo' }, detail: { en: '0 matches for March → returns None', 'pt-br': '0 correspondências para março → devolve None' }, pigment: 'danger' },
            { label: { en: 'Escalate', 'pt-br': 'Escalar' }, detail: { en: 'returns needs_human; 0 clicks spent', 'pt-br': 'devolve needs_human; 0 cliques gastos' }, pigment: 'caution' },
          ],
        },
      },
      {
        label: { en: 'Thursday: wrong CSV (June)', 'pt-br': 'Quinta: CSV errado (junho)' },
        caption: {
          en: 'The click works, the portal serves report-2026-06.csv and the banner celebrates, yet line 2 holds period 2026-03. Validation rejects and deletes the copy. Spent: observe, click.',
          'pt-br': 'O clique funciona, o portal serve report-2026-06.csv e o aviso comemora, mas a linha 2 traz o período 2026-03. A validação recusa e apaga a cópia. Gasto: observe, click.',
        },
        body: {
          kind: 'flow',
          steps: [
            { label: { en: 'Observe & resolve', 'pt-br': 'Observar e resolver' }, detail: { en: 'state ready; 1 match for June', 'pt-br': 'estado ready; 1 correspondência para junho' }, pigment: 'accent' },
            { label: { en: 'Click & download', 'pt-br': 'Clicar e baixar' }, detail: { en: 'portal serves report-2026-06.csv', 'pt-br': 'portal serve report-2026-06.csv' }, pigment: 'muted' },
            { label: { en: 'Verify file', 'pt-br': 'Verificar arquivo' }, detail: { en: 'line 2 has period 2026-03, not 2026-06', 'pt-br': 'linha 2 tem período 2026-03, não 2026-06' }, pigment: 'danger' },
            { label: { en: 'Reject & delete', 'pt-br': 'Recusar e apagar' }, detail: { en: 'deletes bad copy; returns failed', 'pt-br': 'apaga cópia ruim; devolve failed' }, pigment: 'danger' },
          ],
        },
      },
    ],
  },
} as const satisfies Record<string, Figure>
