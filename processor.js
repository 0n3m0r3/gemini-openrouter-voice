class VoiceProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            // Get the first channel (mono)
            const channelData = input[0];
            // Send to main thread
            this.port.postMessage(channelData);
        }
        return true; // Keep processor alive
    }
}

registerProcessor('voice-processor', VoiceProcessor);
