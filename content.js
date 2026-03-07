// content.js - Version Native Integration (Extension)
(function() {
    'use strict';

    // Protection Iframe
    if (window.top !== window.self) return;

    console.log("🦾 Gemini Voice : Mode Intégration Natif");

    const DEFAULT_MODEL = "mistralai/voxtral-small-24b-2507";
    // Mistral Voxtral Realtime model (fixed — no user-selectable model for this mode)
    const MISTRAL_REALTIME_MODEL = "voxtral-mini-transcribe-realtime-2602";

    // Configuration globale (chargée en async)
    let config = { apiKey: "", modelId: DEFAULT_MODEL, mistralApiKey: "", voiceMode: "openrouter" };

    chrome.storage.local.get(['OPENROUTER_API_KEY', 'OPENROUTER_MODEL_ID', 'MISTRAL_API_KEY', 'VOICE_MODE'], (res) => {
        if(res.OPENROUTER_API_KEY) config.apiKey = res.OPENROUTER_API_KEY;
        if(res.OPENROUTER_MODEL_ID) config.modelId = res.OPENROUTER_MODEL_ID;
        if(res.MISTRAL_API_KEY) config.mistralApiKey = res.MISTRAL_API_KEY;
        if(res.VOICE_MODE) config.voiceMode = res.VOICE_MODE;
        updateButtonMode();
    });

    // --- 1. STYLES CSS (Natif Google) ---
    const style = document.createElement('style');
    style.textContent = `
        /* On cache le bouton micro original de Google pour éviter la confusion */
        .mic-button-container, speech-dictation-mic-button {
            display: none !important;
        }

        /* Notre bouton intégré */
        #voxtral-btn {
            background-color: transparent;
            border: none;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #c4c7c5; /* Gris Google Dark */
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); /* Snappy transition */
            margin-right: 8px;
            box-sizing: border-box;
            position: relative;
        }

        #voxtral-btn:hover {
            background-color: rgba(255, 255, 255, 0.1);
            color: #f0f0f0;
            transform: scale(1.05);
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.1);
        }

        #voxtral-btn:active {
            transform: scale(0.92); /* Click feedback */
            background-color: rgba(255, 255, 255, 0.15);
        }

        /* État Enregistrement */
        #voxtral-btn.recording {
            color: white;
            background-color: rgba(220, 50, 50, 0.9);
            box-shadow: 0 0 0 4px rgba(220, 50, 50, 0.3);
            animation: pulse-recording 2s infinite;
        }
        #voxtral-btn.recording svg { fill: white; }

        @keyframes pulse-recording {
            0% { box-shadow: 0 0 0 0 rgba(220, 50, 50, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(220, 50, 50, 0); }
            100% { box-shadow: 0 0 0 0 rgba(220, 50, 50, 0); }
        }

        /* État Loading */
        #voxtral-btn.loading {
            background-color: rgba(66, 133, 244, 0.15);
            cursor: wait;
        }
        #voxtral-btn.loading svg { fill: #a8c7fa; }

        .voxtral-spin { 
            animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; 
            opacity: 0.8;
            transform-origin: center;
        }
        @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }

        /* MODAL SETTINGS */
        #v-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2147483647; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); font-family: 'Google Sans', Roboto, sans-serif; }
        .v-box { background: #1e1f20; padding: 24px; border-radius: 20px; width: 400px; border: 1px solid #444; color: #e3e3e3; box-shadow: 0 20px 50px rgba(0,0,0,0.6); transform: scale(1); animation: modalPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes modalPop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        
        .v-label { display: block; margin-top: 15px; font-size: 13px; color: #aaa; font-weight: 500; margin-left: 4px; }
        .v-inp { width: 100%; padding: 12px 14px; margin-top: 6px; background: #0b0c0c; border: 1px solid #444; color: white; border-radius: 12px; box-sizing: border-box; font-family: monospace; transition: border-color 0.2s; }
        .v-inp:focus { border-color: #a8c7fa; outline: none; background: #131414; }
        
        .v-btns { text-align: right; margin-top: 24px; display: flex; justify-content: flex-end; gap: 10px; }
        .v-btn { 
            padding: 10px 20px; 
            border-radius: 12px; 
            border: none; 
            cursor: pointer; 
            font-weight: 600; 
            transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1); 
            font-size: 14px; 
        }
        
        .v-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .v-btn:active { transform: translateY(0) scale(0.96); }

        .v-save { 
            background: #a8c7fa; 
            color: #001d35; 
        }
        .v-save:hover { background: #b3d1ff; box-shadow: 0 4px 12px rgba(168, 199, 250, 0.3); }

        .v-cancel { 
            background: transparent; 
            color: #a8c7fa; 
            border: 1px solid rgba(168, 199, 250, 0.3); 
        }
        .v-cancel:hover { background: rgba(168, 199, 250, 0.08); border-color: #a8c7fa; }

        /* Mode indicator badge on button */
        #voxtral-btn.mistral-mode::after {
            content: 'M';
            position: absolute;
            bottom: 5px;
            right: 5px;
            width: 13px;
            height: 13px;
            font-size: 8px;
            font-weight: 700;
            background: #ff6b35;
            color: white;
            border-radius: 50%;
            line-height: 13px;
            text-align: center;
        }

        /* Mode toggle in settings */
        .v-mode-toggle { display: flex; gap: 6px; margin-bottom: 8px; background: #0b0c0c; padding: 4px; border-radius: 12px; }
        .v-mode-btn { flex: 1; padding: 8px 0; border: none; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600; background: transparent; color: #888; transition: all 0.15s; }
        .v-mode-btn.active { background: #2a2b2c; color: #e3e3e3; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
        .v-mode-btn[data-mode="mistral"].active { color: #ff9a72; }
        .v-hint { font-size: 12px; color: #666; margin: 8px 0 0 4px; font-family: monospace; }
    `;
    document.head.appendChild(style);

    // --- 2. LOGIQUE AUDIO ---
    let isRecording = false;

    // OpenRouter mode state
    let audioContext, mediaStream, processor, audioInput;
    let leftchannel = [], recordingLength = 0;

    // Mistral Realtime mode state
    let mistralWs = null;
    let mistralAudioCtx = null;
    let mistralStream = null;
    let mistralProcessor = null;
    let mistralAudioInput = null;

    // --- 3. ICONS SVG ---
    const ICONS = {
        equalizer: "M4 9h4v6H4V9zm5-4h4v14H9V5zm5 4h4v6h-4V9z",
        stop: "M8 8h8v8H8z",
        loader: "M12,4V2A10,10,0,0,0,2,12H4A8,8,0,0,1,12,4ZM22,12A10,10,0,0,0,12,2V4A8,8,0,0,1,20,12Z"
    };

    function setIcon(state) {
        const btn = document.getElementById('voxtral-btn');
        if (!btn) return;
        btn.innerHTML = '';
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.style.fill = "currentColor";
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        
        if (state === 'idle') path.setAttribute("d", ICONS.equalizer);
        else if (state === 'recording') {
            path.setAttribute("d", ICONS.stop);
            svg.setAttribute("viewBox", "0 0 24 24");
            path.setAttribute("transform", "scale(1.2) translate(-2 -2)");
        } else if (state === 'loading') {
            path.setAttribute("d", ICONS.loader);
            path.style.opacity = "0.7";
            svg.classList.add('voxtral-spin');
        }
        svg.appendChild(path);
        btn.appendChild(svg);
    }

    // --- 4. INJECTION (MutationObserver) ---
    const btn = document.createElement('button');
    btn.id = 'voxtral-btn';
    btn.title = "Clic Gauche: Parler / Clic Droit: Config";

    function updateButtonMode() {
        if (config.voiceMode === 'mistral') {
            btn.classList.add('mistral-mode');
            btn.title = "Mistral Realtime | Clic Gauche: Parler / Clic Droit: Config";
        } else {
            btn.classList.remove('mistral-mode');
            btn.title = "OpenRouter | Clic Gauche: Parler / Clic Droit: Config";
        }
    }

    // Clic gauche : Enregistrement
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (config.voiceMode === 'mistral') {
            if (!isRecording) startRecordingMistral(); else stopRecordingMistral();
        } else {
            if (!isRecording) startRecording(); else stopRecording();
        }
    };

    // Clic droit : Configuration
    btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showSettings();
    });

    // Observer pour trouver la barre d'outils
    const observer = new MutationObserver((mutations) => {
        // Sélecteurs possibles pour la barre d'input de Gemini
        const selectors = [
            '.input-buttons-wrapper-bottom', 
            '.input-area-buttons-wrapper',
            '.ql-toolbar'
        ];
        
        let wrapper = null;
        for(let s of selectors) {
            wrapper = document.querySelector(s);
            if(wrapper) break;
        }

        // Si on trouve la barre et que notre bouton n'est pas encore là
        if (wrapper && !document.getElementById('voxtral-btn')) {
            wrapper.insertBefore(btn, wrapper.firstChild);
            setIcon('idle');
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });


    // --- 5. SETTINGS UI ---
    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function showSettings() {
        if(document.getElementById('v-modal')) return;

        const isOR = config.voiceMode !== 'mistral';
        const modal = document.createElement('div');
        modal.id = 'v-modal';
        modal.innerHTML = `
            <div class="v-box">
                <h3 style="margin:0 0 16px 0">Paramètres Voix</h3>
                <div class="v-mode-toggle">
                    <button class="v-mode-btn ${isOR ? 'active' : ''}" data-mode="openrouter">OpenRouter</button>
                    <button class="v-mode-btn ${!isOR ? 'active' : ''}" data-mode="mistral">Mistral Realtime</button>
                </div>
                <div id="v-section-or" style="display:${isOR ? 'block' : 'none'}">
                    <label class="v-label">Clé API OpenRouter :</label>
                    <input type="password" id="v-key" class="v-inp" placeholder="sk-or-..." value="${escHtml(config.apiKey)}">
                    <label class="v-label">Modèle ID :</label>
                    <input type="text" id="v-model" class="v-inp" value="${escHtml(config.modelId)}">
                </div>
                <div id="v-section-m" style="display:${!isOR ? 'block' : 'none'}">
                    <label class="v-label">Clé API Mistral :</label>
                    <input type="password" id="v-mistral-key" class="v-inp" placeholder="..." value="${escHtml(config.mistralApiKey)}">
                    <p class="v-hint">Modèle fixe : voxtral-mini-transcribe-realtime-2602</p>
                </div>
                <div class="v-btns">
                    <button id="v-cancel" class="v-btn v-cancel">Annuler</button>
                    <button id="v-save" class="v-btn v-save">Sauvegarder</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Mode toggle logic
        modal.querySelectorAll('.v-mode-btn').forEach(mBtn => {
            mBtn.addEventListener('click', () => {
                modal.querySelectorAll('.v-mode-btn').forEach(b => b.classList.remove('active'));
                mBtn.classList.add('active');
                const m = mBtn.dataset.mode;
                document.getElementById('v-section-or').style.display = m === 'openrouter' ? 'block' : 'none';
                document.getElementById('v-section-m').style.display = m === 'mistral' ? 'block' : 'none';
            });
        });

        document.getElementById('v-save').onclick = () => {
            const k   = document.getElementById('v-key').value.trim();
            const m   = document.getElementById('v-model').value.trim();
            const mk  = document.getElementById('v-mistral-key').value.trim();
            const mode = modal.querySelector('.v-mode-btn.active')?.dataset.mode || 'openrouter';
            chrome.storage.local.set({
                'OPENROUTER_API_KEY': k,
                'OPENROUTER_MODEL_ID': m,
                'MISTRAL_API_KEY': mk,
                'VOICE_MODE': mode
            }, () => {
                config.apiKey = k;
                config.modelId = m;
                config.mistralApiKey = mk;
                config.voiceMode = mode;
                // Keep the background worker's declarativeNetRequest rule in sync.
                chrome.runtime.sendMessage({ type: 'UPDATE_MISTRAL_AUTH', apiKey: mk });
                updateButtonMode();
                modal.remove();
            });
        };
        document.getElementById('v-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
    }

    // --- 6. MISTRAL REALTIME ENGINE ---

    /**
     * Converts a Float32Array (range -1..1) to base64-encoded PCM signed 16-bit LE bytes.
     * This is the pcm_s16le format expected by the Mistral Realtime API.
     */
    function float32ToPcm16Base64(float32Array) {
        const int16 = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const bytes = new Uint8Array(int16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }

    async function startRecordingMistral() {
        if (!config.mistralApiKey) { showSettings(); return; }

        try {
            mistralStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch(e) {
            alert("Microphone bloqué.");
            return;
        }

        // The browser WebSocket API cannot set custom HTTP headers.
        // Instead, the background service worker uses declarativeNetRequest to
        // inject "Authorization: Bearer <key>" on every upgrade request to this
        // endpoint automatically — so no credentials appear in the URL.
        const wsUrl = `wss://api.mistral.ai/v1/audio/transcriptions/realtime` +
                      `?model=${encodeURIComponent(MISTRAL_REALTIME_MODEL)}`;

        try {
            mistralWs = new WebSocket(wsUrl);
        } catch(e) {
            console.error("Failed to create Mistral WebSocket", e);
            alert("Erreur WebSocket Mistral");
            if (mistralStream) { mistralStream.getTracks().forEach(t => t.stop()); mistralStream = null; }
            return;
        }

        // Track whether the close was expected (transcription done or user stopped)
        // so onclose knows whether to show a diagnostic message.
        let expectedClose = false;

        // Pre-load the audio worklet while waiting for the WS handshake.
        // We create the AudioContext first (only thing needed for addModule).
        mistralAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = mistralAudioCtx.sampleRate;
        let workletReady = false;
        mistralAudioCtx.audioWorklet.addModule(chrome.runtime.getURL('processor.js'))
            .then(() => { workletReady = true; })
            .catch(e => console.error("Failed to load audio processor", e));

        mistralWs.onopen = () => {
            // Send session config only after the WebSocket handshake succeeds.
            // session.update is sent here; we wait for session.created from the server
            // before starting audio (handled in onmessage) to follow the correct protocol order.
            console.debug('[Mistral] WS open, waiting for session.created');
        };

        mistralWs.onmessage = async (event) => {
            let msg;
            try { msg = JSON.parse(event.data); } catch { return; }

            if (msg.type === 'session.created') {
                // Server is ready — now send format config and begin audio capture.
                // Wait for the worklet module if it is still loading (should be done by now).
                if (!workletReady) {
                    const deadline = Date.now() + 3000;
                    while (!workletReady && Date.now() < deadline) {
                        await new Promise(r => setTimeout(r, 20));
                    }
                    if (!workletReady) {
                        alert("Erreur chargement audio worklet.");
                        if (mistralWs) mistralWs.close(1000, 'worklet failed');
                        return;
                    }
                }

                // Safety check: WS might have closed while we were awaiting.
                if (!mistralWs || mistralWs.readyState !== WebSocket.OPEN) return;

                mistralWs.send(JSON.stringify({
                    type: 'session.update',
                    session: { audio_format: { encoding: 'pcm_s16le', sample_rate: sampleRate } }
                }));

                mistralAudioInput = mistralAudioCtx.createMediaStreamSource(mistralStream);
                mistralProcessor = new AudioWorkletNode(mistralAudioCtx, 'voice-processor');
                mistralProcessor.port.onmessage = (evt) => {
                    if (!isRecording || !mistralWs || mistralWs.readyState !== WebSocket.OPEN) return;
                    const audio = float32ToPcm16Base64(new Float32Array(evt.data));
                    mistralWs.send(JSON.stringify({ type: 'input_audio.append', audio }));
                };
                mistralAudioInput.connect(mistralProcessor);
                mistralProcessor.connect(mistralAudioCtx.destination);

                isRecording = true;
                btn.classList.add('recording');
                setIcon('recording');

            } else if (msg.type === 'transcription.text.delta') {
                // Insert each chunk as it arrives — the cursor advances naturally
                // with each execCommand call, producing a live typewriter effect.
                // trimText=false preserves the inter-word spaces that the API embeds
                // at the start/end of each delta chunk.
                if (msg.text) insertText(msg.text, false);

            } else if (msg.type === 'transcription.done') {
                // All text has already been streamed via deltas; nothing to insert.
                // Just close the connection cleanly.
                expectedClose = true;
                if (mistralWs) mistralWs.close(1000, 'transcription complete');

            } else if (msg.type === 'error') {
                console.error('Mistral Realtime error:', msg);
                const errMsg = msg.error?.message || msg.message || JSON.stringify(msg);
                alert('Erreur Mistral Realtime:\n' + errMsg);
                expectedClose = true;
                if (mistralWs) mistralWs.close(1000, 'api error');
            }
        };

        mistralWs.onerror = (e) => {
            console.error('Mistral WebSocket error', e);
        };

        // onclose is the single cleanup point for all paths (normal, error, unexpected).
        mistralWs.onclose = (evt) => {
            isRecording = false;
            btn.classList.remove('recording', 'loading');
            setIcon('idle');

            if (mistralProcessor) { try { mistralProcessor.disconnect(); } catch(_) {} mistralProcessor = null; }
            if (mistralAudioInput) { try { mistralAudioInput.disconnect(); } catch(_) {} mistralAudioInput = null; }
            if (mistralAudioCtx) { mistralAudioCtx.close(); mistralAudioCtx = null; }
            if (mistralStream) { mistralStream.getTracks().forEach(t => t.stop()); mistralStream = null; }
            mistralWs = null;

            if (!expectedClose) {
                const code = evt.code || '?';
                const reason = evt.reason ? `\n"${evt.reason}"` : '';
                alert(`Connexion Mistral fermée inopinément (code ${code})${reason}\n\nVérifiez votre clé API Mistral et rechargez l'extension.`);
            }
        };
    }

    async function stopRecordingMistral() {
        if (!isRecording) return;
        isRecording = false;
        btn.classList.remove('recording');
        btn.classList.add('loading');
        setIcon('loading');

        // Freeze the audio graph so no further chunks are sent.
        if (mistralProcessor) { try { mistralProcessor.disconnect(); } catch(_) {} mistralProcessor = null; }
        if (mistralAudioInput) { try { mistralAudioInput.disconnect(); } catch(_) {} mistralAudioInput = null; }
        if (mistralStream) { mistralStream.getTracks().forEach(t => t.stop()); mistralStream = null; }
        if (mistralAudioCtx) { await mistralAudioCtx.close(); mistralAudioCtx = null; }

        // Signal end of audio — server replies with transcription.done, then onclose fires.
        if (mistralWs && mistralWs.readyState === WebSocket.OPEN) {
            mistralWs.send(JSON.stringify({ type: 'input_audio.flush' }));
            mistralWs.send(JSON.stringify({ type: 'input_audio.end' }));
        } else {
            btn.classList.remove('loading');
            setIcon('idle');
        }
    }

    // --- 7. AUDIO ENGINE (WAV) ---
    async function startRecording() {
        if(!config.apiKey) { showSettings(); return; }
        
        leftchannel = []; recordingLength = 0;
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch(e) { alert("Microphone bloqué."); return; }

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Load AudioWorklet
        try {
            await audioContext.audioWorklet.addModule(chrome.runtime.getURL('processor.js'));
        } catch(e) {
            console.error("Failed to load processor", e);
            alert("Erreur chargement audio");
            return;
        }

        audioInput = audioContext.createMediaStreamSource(mediaStream);
        processor = new AudioWorkletNode(audioContext, 'voice-processor');
        
        processor.port.onmessage = (e) => {
            if (!isRecording) return;
            const chunk = e.data;
            leftchannel.push(new Float32Array(chunk));
            recordingLength += chunk.length;
        };

        audioInput.connect(processor);
        processor.connect(audioContext.destination);

        isRecording = true;
        btn.classList.add('recording');
        setIcon('recording');
    }

    async function stopRecording() {
        isRecording = false;
        setIcon('loading');
        btn.classList.remove('recording');
        btn.classList.add('loading');

        if(mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        
        // Disconnect nodes
        if(processor) processor.disconnect();
        if(audioInput) audioInput.disconnect();
        if(audioContext) await audioContext.close();

        const wavBlob = encodeWAV();
        try {
            const base64 = await blobToBase64(wavBlob);
            await sendAPI(base64);
        } catch(e) { 
            console.error(e); 
            alert("Erreur réseau"); 
        } finally {
            setIcon('idle');
            btn.classList.remove('loading');
        }
    }

    // --- 7. API CALL ---
    async function sendAPI(base64) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
                "X-Title": "Gemini Extension"
            },
            body: JSON.stringify({
                model: config.modelId,
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: "Transcribe the audio exactly as spoken. Detect the language automatically and transcribe in that language. Do NOT translate. Output ONLY the text." },
                        { type: "input_audio", input_audio: { data: base64, format: "wav" } }
                    ]
                }]
            })
        });

        if(response.ok) {
            const json = await response.json();
            insertText(json.choices[0].message.content);
        } else {
            alert("Erreur API : " + response.status);
        }
    }

    function insertText(text, trimText = true) {
        const editor = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
        if (editor) {
            editor.focus();
            const clean = trimText ? text.trim() : text;
            // Insertion native
            const success = document.execCommand('insertText', false, clean);
            if (!success) {
                // Fallback
                if(editor.value !== undefined) editor.value += clean;
                else editor.innerText += clean;
            }
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // --- 8. UTILS ---
    function encodeWAV() {
        // Use actual sample rate or default to 44100 if undefined
        const sampleRate = audioContext ? audioContext.sampleRate : 44100;

        let buffer = new ArrayBuffer(44 + recordingLength * 2);
        let view = new DataView(buffer);
        
        writeString(view, 0, 'RIFF'); 
        view.setUint32(4, 36 + recordingLength * 2, true); 
        writeString(view, 8, 'WAVE'); 
        writeString(view, 12, 'fmt '); 
        view.setUint32(16, 16, true); 
        view.setUint16(20, 1, true); 
        view.setUint16(22, 1, true); 
        view.setUint32(24, sampleRate, true); 
        view.setUint32(28, sampleRate * 2, true); 
        view.setUint16(32, 2, true); 
        view.setUint16(34, 16, true); 
        writeString(view, 36, 'data'); 
        view.setUint32(40, recordingLength * 2, true);
        
        let offset = 44;
        for (let i = 0; i < leftchannel.length; i++) {
            let chunk = leftchannel[i];
            for(let j=0; j<chunk.length; j++) {
                let s = Math.max(-1, Math.min(1, chunk[j]));
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                offset += 2;
            }
        }
        return new Blob([view], { type: 'audio/wav' });
    }
    function writeString(v, o, s) { for (let i=0; i<s.length; i++) v.setUint8(o+i, s.charCodeAt(i)); }
    const blobToBase64 = (b) => new Promise(r => { const rd = new FileReader(); rd.onloadend = () => r(rd.result.split(',')[1]); rd.readAsDataURL(b); });

})();