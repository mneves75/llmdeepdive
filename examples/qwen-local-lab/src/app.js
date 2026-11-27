const $ = (id) => document.getElementById(id);
const ORIGINAL_HTML = '<!doctype html>\n' + document.documentElement.outerHTML;
const STORAGE_KEY = 'qwen-local-lab.chat.v1';
const DEFAULT_SYSTEM = 'You are a helpful assistant. Answer clearly and concisely in the same language as the user.';
const state = {
  phase: 'idle', worker: null, assets: null, request: 0, activeId: null,
  backend: null, gpu: false, history: [], current: null, stopTimer: null,
  urls: [], pending: new Map(), loadSource: null,
};
let toastTimer;

function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
}

function showError(text) {
  $('errorText').textContent = text;
  $('errorBanner').hidden = false;
}

function hideError() { $('errorBanner').hidden = true; }

function setPhase(phase, label) {
  state.phase = phase;
  document.documentElement.dataset.phase = phase;
  document.querySelector('.session-status').dataset.state = phase;
  $('appStatus').textContent = label || ({idle:'Model not loaded',loading:'Loading model',ready:'Ready · on device',generating:'Generating locally',stopping:'Stopping',error:'Needs attention'}[phase]);
  const busy = ['loading','generating','stopping','resetting','clearing'].includes(phase);
  $('loadBtn').disabled = busy || phase === 'ready';
  $('loadBtn').textContent = phase === 'ready' ? 'Model loaded' : phase === 'loading' ? 'Loading…' : 'Load model';
  $('unloadBtn').disabled = !state.worker || busy;
  $('backend').disabled = busy || phase === 'ready';
  $('importBtn').disabled = busy || phase === 'ready';
  $('newChatBtn').disabled = busy;
  $('clearCacheBtn').disabled = busy;
  $('temperature').disabled = busy;
  $('maxTokens').disabled = busy;
  $('systemPrompt').disabled = busy;
  $('sendBtn').disabled = phase !== 'ready' || !$('prompt').value.trim();
  $('stopBtn').hidden = !['loading','generating','stopping'].includes(phase);
  $('stopBtn').disabled = phase === 'stopping';
  $('stopBtn').textContent = phase === 'loading' ? 'Cancel loading' : phase === 'stopping' ? 'Stopping…' : 'Stop';
  $('exportBtn').disabled = !state.history.length && !state.current?.text;
}

function remember() {
  try {
    if (!$('rememberChat').checked) { localStorage.removeItem(STORAGE_KEY); return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({version:1,system:$('systemPrompt').value,history:state.history.slice(-100)}));
  } catch {
    $('rememberChat').checked = false;
    toast('This browser could not save chat locally. Export the chat to keep it.');
  }
}

function restore() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || stored.version !== 1 || !Array.isArray(stored.history)) return;
    state.history = stored.history.filter(m => ['user','assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 100000).slice(-100);
    $('rememberChat').checked = true;
    if (typeof stored.system === 'string') $('systemPrompt').value = stored.system.slice(0,8000);
    for (const m of state.history) addMessage(m.role, m.content, m.role === 'assistant' ? 'Restored from this browser' : '');
  } catch { /* Storage may be unavailable in private or file contexts. */ }
}

function scrollChat(force = false) {
  const el = $('messages');
  if (force || el.scrollHeight - el.scrollTop - el.clientHeight < 180) el.scrollTop = el.scrollHeight;
}

function addMessage(role, text = '', meta = '') {
  $('welcome').hidden = true;
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'YOU' : 'QWEN · LOCAL';
  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;
  const footer = document.createElement('div');
  footer.className = 'message-meta';
  footer.textContent = meta;
  article.append(label, content, footer);
  $('messages').append(article);
  scrollChat(true);
  return {article,content,footer};
}

function setMetrics(m = {}) {
  $('tokenCount').textContent = Number.isFinite(m.tokens) ? String(m.tokens) : '—';
  $('speed').textContent = Number.isFinite(m.decodeTps) ? m.decodeTps.toFixed(1) : '—';
  $('ttft').textContent = Number.isFinite(m.ttftMs) ? `${(m.ttftMs/1000).toFixed(2)} s` : '—';
}

function blobFromBase64(id, type) {
  const raw = atob($(id).textContent.trim());
  const chunks = [];
  for (let offset=0; offset<raw.length; offset+=65536) {
    const chunk = raw.slice(offset,offset+65536);
    const bytes = new Uint8Array(chunk.length);
    for (let i=0;i<chunk.length;i++) bytes[i]=chunk.charCodeAt(i);
    chunks.push(bytes);
  }
  const url = URL.createObjectURL(new Blob(chunks,{type}));
  state.urls.push(url);
  return url;
}

function embeddedAssets() {
  if (state.assets) return state.assets;
  state.assets = {
    wllama:blobFromBase64('asset-wllama','text/javascript'),
    webllm:blobFromBase64('asset-webllm','text/javascript'),
    singleWasm:blobFromBase64('asset-single-wasm','application/wasm'),
    multiWasm:blobFromBase64('asset-multi-wasm','application/wasm'),
    hashwasm:blobFromBase64('asset-hashwasm','text/javascript'),
  };
  return state.assets;
}

function ensureWorker() {
  if (state.worker) return state.worker;
  const workerURL = blobFromBase64('asset-worker','text/javascript');
  const worker = new Worker(workerURL,{type:'module',name:'qwen-local-inference'});
  worker.onmessage = event => { if (state.worker === worker) onWorkerMessage(event.data); };
  worker.onerror = event => {
    if (state.worker !== worker) return;
    event.preventDefault();
    const message = event.message || 'The inference worker stopped unexpectedly. Reload the model to retry.';
    if (state.current) finishGeneration(null, message);
    for (const pending of state.pending.values()) pending.reject(new Error(message));
    state.pending.clear();
    destroyWorker();
    showError(message);
    setPhase('error');
  };
  state.worker = worker;
  return worker;
}

function rpc(type, payload = {}) {
  const id = ++state.request;
  const worker = ensureWorker();
  return new Promise((resolve,reject) => {
    state.pending.set(id,{resolve,reject,type});
    worker.postMessage({type,id,...payload});
  });
}

function destroyWorker() {
  state.worker?.terminate();
  state.worker = null;
  state.backend = null;
  state.activeId = null;
  clearTimeout(state.stopTimer);
  state.stopTimer = null;
  for (const pending of state.pending.values()) pending.reject(new DOMException('Operation cancelled','AbortError'));
  state.pending.clear();
}

function onWorkerMessage(data) {
  if (data.type === 'progress') {
    if (data.id !== state.activeId && !state.pending.has(data.id)) return;
    if (Number.isFinite(data.progress)) $('downloadProgress').value = Math.max(0,Math.min(1,data.progress));
    else $('downloadProgress').removeAttribute('value');
    $('downloadStatus').textContent = data.text;
    return;
  }
  if (data.type === 'context' && state.current?.id === data.id) {
    const estimate = Number.isFinite(data.promptTokenUpperBound);
    const bound = estimate ? '≤ ' : '';
    $('contextStatus').textContent = `${bound}${estimate ? data.promptTokenUpperBound : data.promptTokens} prompt tokens · 2,048 context` + (data.droppedTurns ? ` · ${data.droppedTurns} older turn(s) omitted` : '');
    if (data.droppedTurns) toast(`Context is full. ${data.droppedTurns} older turn(s) were left out of this reply; the transcript is still here.`);
    return;
  }
  if (data.type === 'token' && state.current?.id === data.id) {
    state.current.text = data.text;
    state.current.view.content.textContent = data.text;
    state.current.view.footer.textContent = state.phase === 'stopping' ? 'Stopping…' : 'Generating on your device…';
    setMetrics({tokens:data.tokenCount,ttftMs:data.firstTokenMs,decodeTps:data.decodeTps});
    scrollChat();
    return;
  }
  if (data.type === 'done' && state.current?.id === data.id) { finishGeneration(data); return; }
  if (data.type === 'error') {
    if (data.unloaded) state.backend = null;
    if (state.current?.id === data.id) { finishGeneration(null,data.message); return; }
    const pending = state.pending.get(data.id);
    if (pending) { state.pending.delete(data.id); pending.reject(new Error(data.message)); }
    return;
  }
  if (['loaded','resetDone','cacheCleared','unloaded'].includes(data.type)) {
    const pending = state.pending.get(data.id);
    if (pending) { state.pending.delete(data.id); pending.resolve(data); }
  }
}

async function loadModel(file = null) {
  if (!['idle','error'].includes(state.phase)) return;
  hideError();
  if (file && (file.size < 1024 || file.size > 1500*1024*1024 || !file.name.toLowerCase().endsWith('.gguf'))) {
    showError('Choose a Qwen3-0.6B GGUF model file between 1 KB and 1.5 GB. The original .asmbin weights use a different format.'); return;
  }
  const backend = file ? 'wasm' : $('backend').value === 'auto' ? (state.gpu ? 'webgpu' : 'wasm') : $('backend').value;
  if (backend === 'webgpu' && !state.gpu) {
    showError('A WebGPU adapter with shader-f16 support is not available here. Select WebAssembly · CPU, or try a browser with hardware acceleration enabled.'); return;
  }
  state.loadSource = file ? file.name : null;
  const loadAttempt = ++state.request;
  setPhase('loading');
  $('downloadProgress').value = 0;
  $('downloadStatus').textContent = file ? `Opening ${file.name} locally…` : backend === 'webgpu' ? 'Preparing GPU runtime · first model download ≈350 MB…' : 'Preparing CPU runtime · first model download 639 MB…';
  try {
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (state.phase !== 'loading' || state.request !== loadAttempt) return;
    const result = await rpc('load',{backend,assets:embeddedAssets(),file,threads:crossOriginIsolated ? Math.min(navigator.hardwareConcurrency||2,4) : 1});
    state.backend = result.backend;
    $('downloadProgress').value = 1;
    $('downloadStatus').textContent = file ? 'Local file loaded. Inference is ready without a network connection.' : result.cacheWarning || (result.cacheStatus === 'hit' ? 'Model loaded from this browser’s cache.' : result.cacheStatus === 'saved' ? 'Model loaded and cached in this browser.' : 'Model loaded. Responses run on this device.');
    $('modelBadge').textContent = result.label || `Qwen3-0.6B · ${backend.toUpperCase()}`;
    $('modelInfo').textContent = result.backend === 'wasm' ? `${result.threads} CPU thread${result.threads===1?'':'s'} · 2,048-token context` : 'WebGPU · Q4 · 2,048-token context';
    setPhase('ready');
    $('prompt').focus();
    toast('Model ready. Your prompt is processed on this device.');
  } catch (error) {
    destroyWorker();
    if (error.name === 'AbortError') { setPhase('idle','Loading cancelled'); return; }
    setPhase('error');
    $('downloadStatus').textContent = 'Model did not finish loading.';
    showError(`${error.message}${backend === 'webgpu' ? ' You can switch to WebAssembly · CPU and load again.' : ''}`);
  }
}

function finishGeneration(result, error = null) {
  const current = state.current;
  if (!current) return;
  clearTimeout(state.stopTimer);
  state.stopTimer = null;
  const text = result?.text ?? current.text;
  current.view.content.textContent = text || (error ? 'No answer generated.' : result?.stopped ? 'Stopped before an answer was generated.' : 'Generation ended without an answer. Try a shorter question.');
  if (text) {
    state.history.push({role:'user',content:current.prompt},{role:'assistant',content:text});
    remember();
  } else {
    $('prompt').value = current.prompt;
    current.userView.footer.textContent = 'Not added to model context';
  }
  if (error) {
    current.view.footer.textContent = text ? 'Interrupted · partial response kept' : 'Generation failed';
    showError(error);
  } else {
    const m = result?.metrics || {};
    setMetrics(m);
    current.view.footer.textContent = [result?.stopped ? 'Stopped · partial response' : result?.finishReason === 'length' ? 'Output limit reached' : 'Generated locally', Number.isFinite(m.tokens)?`${m.tokens} tokens`:null,Number.isFinite(m.decodeTps)?`${m.decodeTps.toFixed(1)} tok/s decode`:null].filter(Boolean).join(' · ');
  }
  state.current = null;
  state.activeId = null;
  setPhase(state.backend ? 'ready' : 'idle');
  scrollChat();
}

async function send(event) {
  event.preventDefault();
  if (state.phase !== 'ready') return;
  const prompt = $('prompt').value.trim();
  if (!prompt) return;
  if (prompt.length > 20000) { showError('This model has a 2,048-token context. Shorten the prompt before sending.'); return; }
  hideError();
  const system = $('systemPrompt').value.trim() || DEFAULT_SYSTEM;
  const id = ++state.request;
  const userView = addMessage('user',prompt);
  const view = addMessage('assistant','','Processing your prompt locally…');
  state.current = {id,prompt,view,userView,text:''};
  state.activeId = id;
  $('prompt').value = '';
  $('prompt').style.height = '';
  setMetrics();
  setPhase('generating');
  state.worker.postMessage({type:'generate',id,messages:[{role:'system',content:system},...state.history.map(({role,content})=>({role,content})),{role:'user',content:prompt}],maxTokens:Number($('maxTokens').value),temperature:Number($('temperature').value)});
}

function stop() {
  if (state.phase === 'loading') {
    destroyWorker();
    $('downloadStatus').textContent = 'Loading cancelled. You can retry when ready.';
    setPhase('idle','Loading cancelled');
    return;
  }
  if (state.phase !== 'generating') return;
  setPhase('stopping');
  state.worker.postMessage({type:'stop',id:state.activeId});
  // A blocked native prefill may not process an abort promptly. Terminating the
  // owning worker also terminates its nested WASM workers and frees the model.
  state.stopTimer = setTimeout(() => {
    destroyWorker();
    finishGeneration({text:state.current?.text || '',stopped:true,metrics:{}});
    $('downloadStatus').textContent = 'Stopped and released the model. Load it again to continue.';
    setPhase('idle','Stopped · model released');
  },3000);
}

async function resetChat() {
  if (!['ready','idle','error'].includes(state.phase)) return;
  hideError();
  const previous = state.phase;
  setPhase('resetting','Starting new chat');
  try { if (state.backend) await rpc('reset'); }
  catch { destroyWorker(); }
  state.history = [];
  $('messages').querySelectorAll('.message').forEach(el=>el.remove());
  $('welcome').hidden = false;
  $('contextStatus').textContent = '2,048-token context · older turns may be omitted';
  setMetrics();
  remember();
  setPhase(state.backend ? 'ready' : 'idle');
  $('prompt').focus();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}

function exportChat() {
  const messages = [...state.history];
  if (state.current?.text) messages.push({role:'user',content:state.current.prompt},{role:'assistant',content:state.current.text});
  const markdown = '# Qwen Local Lab\n\nExported '+new Date().toISOString()+'\n\n'+messages.map(m=>`## ${m.role === 'user'?'You':'Qwen'}\n\n${m.content}`).join('\n\n');
  downloadBlob(new Blob([markdown],{type:'text/markdown;charset=utf-8'}),'qwen-local-chat.md');
}

async function clearCache() {
  if (!['ready','idle','error'].includes(state.phase)) return;
  const phase = state.phase;
  setPhase('clearing','Clearing model cache');
  try {
    const result = await rpc('clearCache');
    toast(result.message || 'Downloaded model caches cleared. Any loaded model stays in memory until released.');
    $('downloadStatus').textContent = 'Model cache cleared. The next load needs a download or a local file.';
  } catch (error) { showError(`Could not clear the model cache: ${error.message}`); }
  finally { if (state.phase === 'clearing') setPhase(phase === 'ready' && !state.backend ? 'idle' : phase); }
}

async function detectDevice() {
  const threads = crossOriginIsolated ? Math.min(navigator.hardwareConcurrency||2,4) : 1;
  let adapter;
  try { adapter = await navigator.gpu?.requestAdapter(); state.gpu = !!adapter?.features.has('shader-f16'); }
  catch { state.gpu = false; }
  $('deviceInfo').textContent = `${state.gpu?'WebGPU available':'CPU mode available'} · ${threads} WASM thread${threads===1?'':'s'}`;
  updateBackendInfo();
}

function updateBackendInfo() {
  if (state.backend) return;
  const gpu = $('backend').value === 'webgpu' || ($('backend').value === 'auto' && state.gpu);
  $('modelInfo').textContent = gpu ? 'Q4 GPU weights · first download ≈350 MB' : 'Official Q8 CPU weights · first download 639 MB';
  $('modelBadge').textContent = gpu ? 'Qwen3-0.6B · Q4' : 'Qwen3-0.6B · Q8_0';
}

$('loadBtn').addEventListener('click',()=>loadModel());
$('unloadBtn').addEventListener('click',()=>{
  destroyWorker();
  setPhase('idle','Model released');
  $('downloadStatus').textContent = 'Model released from memory. The transcript stays in this tab.';
  updateBackendInfo();
});
$('importBtn').addEventListener('click',()=>$('modelFile').click());
$('modelFile').addEventListener('change',()=>{ const file=$('modelFile').files?.[0]; $('modelFile').value=''; if(file)loadModel(file); });
$('composer').addEventListener('submit',send);
$('stopBtn').addEventListener('click',stop);
$('newChatBtn').addEventListener('click',resetChat);
$('clearCacheBtn').addEventListener('click',clearCache);
$('exportBtn').addEventListener('click',exportChat);
$('saveHtmlBtn').addEventListener('click',()=>{
  downloadBlob(new Blob([ORIGINAL_HTML],{type:'text/html;charset=utf-8'}),'qwen-local-lab.html');
  toast('Saved the app with embedded runtimes. For offline CPU use, import a Qwen3-0.6B GGUF model.');
});
$('rememberChat').addEventListener('change',remember);
$('systemPrompt').addEventListener('change',remember);
$('backend').addEventListener('change',updateBackendInfo);
$('temperature').addEventListener('input',()=>{ $('temperatureValue').textContent=Number($('temperature').value).toFixed(1); });
$('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());
$('closeHelpBtn').addEventListener('click',()=>$('helpDialog').close());
$('helpDialog').addEventListener('click',event=>{ if(event.target===$('helpDialog'))$('helpDialog').close(); });
$('dismissErrorBtn').addEventListener('click',hideError);
$('prompt').addEventListener('input',()=>{
  $('prompt').style.height='auto';
  $('prompt').style.height=Math.min($('prompt').scrollHeight,160)+'px';
  $('sendBtn').disabled=state.phase!=='ready'||!$('prompt').value.trim();
});
$('prompt').addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){ event.preventDefault(); $('composer').requestSubmit(); }
});
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{
  $('prompt').value=button.dataset.prompt;
  $('prompt').dispatchEvent(new Event('input'));
  $('prompt').focus();
  if(state.phase!=='ready')toast('Load the model, then send your prompt.');
}));
window.addEventListener('pagehide',()=>{
  destroyWorker();
  if (state.current) finishGeneration({text:state.current.text,stopped:true,metrics:{}});
  for(const url of state.urls)URL.revokeObjectURL(url);
  state.urls=[];
  state.assets=null;
});
window.addEventListener('pageshow',event=>{ if(event.persisted){setPhase('idle','Model released · load to continue');updateBackendInfo();} });
restore();
setPhase('idle');
detectDevice();
const mobileLayout = matchMedia('(max-width: 800px)');
$('sidebarDisclosure').open = !mobileLayout.matches;
mobileLayout.addEventListener('change',event=>{ $('sidebarDisclosure').open=!event.matches; });
