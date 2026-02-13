// content.js - Version Native Integration (Extension)
(function() {
    'use strict';

    // Protection Iframe
    if (window.top !== window.self) return;

    console.log("🦾 Gemini Voice : Mode Intégration Natif");

    const DEFAULT_MODEL = "mistralai/voxtral-small-24b-2507";
    
    // Configuration globale (chargée en async)
    let config = { apiKey: "", modelId: DEFAULT_MODEL };
    
    chrome.storage.local.get(['OPENROUTER_API_KEY', 'OPENROUTER_MODEL_ID'], (res) => {
        if(res.OPENROUTER_API_KEY) config.apiKey = res.OPENROUTER_API_KEY;
        if(res.OPENROUTER_MODEL_ID) config.modelId = res.OPENROUTER_MODEL_ID;
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
    `;
    document.head.appendChild(style);

    // --- 2. LOGIQUE AUDIO ---
    let isRecording = false;
    let audioContext, mediaStream, processor, audioInput;
    let leftchannel = [], recordingLength = 0;

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
    
    // Clic gauche : Enregistrement
    btn.onclick = (e) => { 
        e.preventDefault();
        e.stopPropagation();
        if (!isRecording) startRecording(); else stopRecording(); 
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
    function showSettings() {
        if(document.getElementById('v-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'v-modal';
        modal.innerHTML = `
            <div class="v-box">
                <h3 style="margin:0 0 10px 0">Paramètres Voix</h3>
                <label class="v-label">Clé API OpenRouter :</label>
                <input type="password" id="v-key" class="v-inp" placeholder="sk-or-..." value="${config.apiKey}">
                <label class="v-label">Modèle ID :</label>
                <input type="text" id="v-model" class="v-inp" value="${config.modelId}">
                <div class="v-btns">
                    <button id="v-cancel" class="v-btn v-cancel">Annuler</button>
                    <button id="v-save" class="v-btn v-save">Sauvegarder</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('v-save').onclick = () => {
            const k = document.getElementById('v-key').value.trim();
            const m = document.getElementById('v-model').value.trim();
            chrome.storage.local.set({ 'OPENROUTER_API_KEY': k, 'OPENROUTER_MODEL_ID': m }, () => {
                config.apiKey = k;
                config.modelId = m;
                modal.remove();
            });
        };
        document.getElementById('v-cancel').onclick = () => modal.remove();
        modal.onclick = (e) => { if(e.target === modal) modal.remove(); }
    }

    // --- 6. AUDIO ENGINE (WAV) ---
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

    function insertText(text) {
        const editor = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
        if (editor) {
            editor.focus();
            const clean = text.trim();
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