const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 5000 });

const fs = require('fs');
const path = require('path');


// WAV file configuration
const sampleRate = 8000; // Adjust to your audio source's sample rate
const numChannels = 1; // Adjust based on mono (1) or stereo (2)
const bitsPerSample = 16; // Adjust based on your audio source's bit depth
const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;

let audioDataBuffer = Buffer.alloc(0); // Buffer to hold raw audio data

// Path to the file where audio will be stored
const audioFilePath = path.join(__dirname, 'received_audio.raw');
const writeStream = fs.createWriteStream(audioFilePath, { flags: 'a' });

wss.on('connection', (ws) => {

    //let audioDataBuffer = Buffer.alloc(0); // Buffer to hold raw audio data

    console.log('WebSocket client connected');

    ws.on('message', (message) => {
        // `message` is an ArrayBuffer or Buffer
        console.log('Received audio data', message);
        // Process or store the audio data
	// Write the audio data to the file
        writeStream.write(message);
        audioDataBuffer = Buffer.concat([audioDataBuffer, message]);
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
	writeStream.end(); // Close the write stream
	if (audioDataBuffer.length > 0) {
        saveAsWav(audioDataBuffer);
        audioDataBuffer = Buffer.alloc(0);
    }
    });
});

function saveAsWav(audioBuffer) {
    const wavFilePath = path.join(__dirname, 'received_audio.wav');
    const header = createWavHeader(audioBuffer.length, sampleRate, numChannels, bitsPerSample);

    const wavData = Buffer.concat([header, audioBuffer]);

    fs.writeFileSync(wavFilePath, wavData);
    console.log(`Saved audio data to ${wavFilePath}`);
}

function createWavHeader(dataLength, sampleRate, numChannels, bitsPerSample) {
    const header = Buffer.alloc(44);

    // Chunk ID ("RIFF")
    header.write('RIFF', 0);
    // Chunk size (36 + data length)
    header.writeUInt32LE(36 + dataLength, 4);
    // Format ("WAVE")
    header.write('WAVE', 8);
    // Subchunk1 ID ("fmt ")
    header.write('fmt ', 12);
    // Subchunk1 size (16 for PCM)
    header.writeUInt32LE(16, 16);
    // Audio format (1 for PCM)
    header.writeUInt16LE(1, 20);
    // Number of channels
    header.writeUInt16LE(numChannels, 22);
    // Sample rate
    header.writeUInt32LE(sampleRate, 24);
    // Byte rate (sampleRate * numChannels * bitsPerSample / 8)
    header.writeUInt32LE(byteRate, 28);
    // Block align (numChannels * bitsPerSample / 8)
    header.writeUInt16LE((numChannels * bitsPerSample) / 8, 32);
    // Bits per sample
    header.writeUInt16LE(bitsPerSample, 34);
    // Subchunk2 ID ("data")
    header.write('data', 36);
    // Subchunk2 size (data length)
    header.writeUInt32LE(dataLength, 40);

    return header;
}
