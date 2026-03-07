'use strict';

// Rule ID reserved for the Mistral WebSocket Authorization header injection.
const MISTRAL_RULE_ID = 1001;

/**
 * Installs (or removes) a declarativeNetRequest dynamic rule that adds
 * "Authorization: Bearer <apiKey>" to every WebSocket upgrade request going
 * to the Mistral Realtime transcription endpoint.
 *
 * Using declarativeNetRequest is the only reliable way for a Chrome extension
 * to add custom HTTP headers to WebSocket connections, because the browser's
 * WebSocket() constructor does not accept custom headers.
 */
function setMistralAuthRule(apiKey) {
    const addRules = apiKey ? [{
        id: MISTRAL_RULE_ID,
        priority: 1,
        action: {
            type: 'modifyHeaders',
            requestHeaders: [{
                header: 'Authorization',
                operation: 'set',
                value: `Bearer ${apiKey}`
            }]
        },
        condition: {
            urlFilter: '||api.mistral.ai/v1/audio/transcriptions/realtime',
            resourceTypes: ['websocket']
        }
    }] : [];

    chrome.declarativeNetRequest.updateDynamicRules(
        { removeRuleIds: [MISTRAL_RULE_ID], addRules },
        () => {
            if (chrome.runtime.lastError) {
                console.error('[background] declarativeNetRequest update failed:', chrome.runtime.lastError);
            }
        }
    );
}

// Restore the rule every time the service worker starts (MV3 workers can be
// terminated and restarted at any time by the browser).
chrome.storage.local.get(['MISTRAL_API_KEY'], (res) => {
    if (res.MISTRAL_API_KEY) setMistralAuthRule(res.MISTRAL_API_KEY);
});

// Content script sends this message whenever the user saves a new Mistral key.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'UPDATE_MISTRAL_AUTH') {
        setMistralAuthRule(msg.apiKey || '');
        sendResponse({ ok: true });
    }
});
