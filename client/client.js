const WebSocket = require('ws');
const path = require('path');

const wss = new WebSocket.Server({ port: 7000 });
const fs = require('fs');
let alreadyPlayed = false;
let response = false;
let inTranscription = false;


const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');

const clientSpeech = new speech.SpeechClient();
const clientTTS = new textToSpeech.TextToSpeechClient();

// WAV file configuration
const sampleRate = 8000; // Adjust to your audio source's sample rate
const numChannels = 1; // Adjust based on mono (1) or stereo (2)
const bitsPerSample = 16; // Adjust based on your audio source's bit depth
const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;


// Silence detection threshold
const SILENCE_THRESHOLD = 0.01; // Adjust based on your audio format
const SILENCE_TIMEOUT = 5000;  // 5000ms = 5 seconds

let asterikskAudioDataBuffer = Buffer.alloc(0);
let secondsWithoutAudio = 0;

let lastTranscription = "";
let lastTranscriptionFile = "";


// Function to transcribe audio
async function transcribeAudio(filePath) {
    
    inTranscription = true;
    

    const audio = fs.readFileSync(filePath);
    const audioBytes = audio.toString('base64');

    const request = {
        audio: { content: audioBytes },
        config: {
            encoding: 'LINEAR16', // Adjust according to your audio file format
            sampleRateHertz: 8000,
            languageCode: 'es-MX',
        },
    };

    const [response] = await clientSpeech.recognize(request);
    const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    console.log(`Transcription: ${transcription}`);
    if(transcription != ""){
        lastTranscription = transcription;
        lastTranscriptionFile = filePath;
        alreadyPlayed = false;
    }
    inTranscription =  false;
    return transcription;
}

// Function to generate audio
async function generateAudio(text, outputFile) {
    const request = {
        input: { text: text },
        voice: { languageCode: 'es-MX', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 8000 },
    };

    const [response] = await clientTTS.synthesizeSpeech(request);
    fs.writeFileSync(outputFile, response.audioContent, 'binary');
    console.log(`Audio content written to file: ${outputFile}`);
}


wss.on('connection', (ws) => {

    let lastAudioTimestamp = Date.now();

    const checkSilence = setInterval(() => {
        secondsWithoutAudio = (Date.now() - lastAudioTimestamp);
        if (secondsWithoutAudio> SILENCE_TIMEOUT) {
            console.log('No audio detected for', SILENCE_TIMEOUT / 1000, 'seconds.');
            // Handle silence (e.g., notify the client, close the connection, etc.)
            if(inTranscription == false){
                if (asterikskAudioDataBuffer.length > 0) {
                    const fileName = 'transcript-audio-'+ Date.now();
                    saveAsWav(asterikskAudioDataBuffer, fileName);
                    asterikskAudioDataBuffer = Buffer.alloc(0);
                    const wavFilePath = path.join(__dirname, fileName + '.wav');
                    handleTranscription(wss,wavFilePath)
                }
            }
        }
    }, 1000);

    ws.on('open', () => {
    console.log('Connected to audio server');
    });

    ws.on('message', async (data) => {
        
        console.log('Data lenght: ',data.length)

        //const audioBuffer = new Int16Array(data);
        const audioBuffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

        // Normalize samples to a range of -1 to 1 by subtracting the offset
        //const normalizedBuffer = Array.from(audioBuffer).map(sample => (sample - 128) / 128);

        const normalizedBuffer = Array.from(audioBuffer).map(sample => sample / 255);

        /*console.log('audioBuffer:', audioBuffer);
        console.log('normalizedBuffer:', normalizedBuffer);
        console.log('Silence Threshold:', SILENCE_THRESHOLD);*/

        

        // Calculate the maximum amplitude
        //const maxAmplitude = Math.max(...audioBuffer.map(sample => Math.abs(sample / 32768))); // Normalize to 0-1 range

        // Calculate the maximum absolute amplitude
        const maxAmplitude = Math.max(...normalizedBuffer.map(Math.abs));

        console.log('maxAmplitude:', maxAmplitude);

        asterikskAudioDataBuffer = Buffer.concat([asterikskAudioDataBuffer, data]);
        
        console.log('secondsWithoutAudio:',secondsWithoutAudio);

        if (maxAmplitude != 0) {
            console.log('Audio detected');
            lastAudioTimestamp = Date.now();
            console.log('Received audio frame:', data);
            //clearInterval(checkSilence);
            
        } else {
            response = true;
            console.log('NO AUDIO DETECTED');
        }

        // Process or play the audio frame here
        //const audioPath = '/opt/audios/test.wav'; 

        //if(response){
        //    if(!alreadyPlayed){
        if(lastTranscription!= ""){
            if(!alreadyPlayed){
                const wavFilePath = path.join(__dirname, 'generated-audio-'+ Date.now()+'.wav');
                try {
                    await generateAudio("Escuche lo siguiente, " + lastTranscription,wavFilePath);
                    fs.access(wavFilePath, fs.constants.F_OK, (err) => {
                        if (err) {
                            console.error('Audio file not found:', wavFilePath);
                            ws.send('Error: Audio file not found');
                            return;
                        }

                        // Read and send the audio file
                        fs.readFile(wavFilePath, (err, generatedAudioData) => {
                            if (err) {
                                console.error('Error reading audio file:', err);
                                ws.send('Error: Unable to read audio file');
                                return;
                            }

                            // Send the audio data
                            ws.send(generatedAudioData, { binary: true }, (err) => {
                                if (err) {
                                    console.error('Error sending audio data:', err);
                                } else {
                                    console.log('Audio sent successfully', wavFilePath);
                                    ws.send('playRemoteAudio');
                                }
                            });
                        });
                    });
                    alreadyPlayed = true;
                    
                } catch (err) {
                    console.error('Error generating audio:', err);
                    ws.send('Error: Audio generation failed');
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('Disconnected from audio server');
        clearInterval(checkSilence);
    });
});

function saveAsWav(audioBuffer,name) {
    const wavFilePath = path.join(__dirname, name+'.wav');
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

async function handleTranscription(ws, wavFilePath) {
    try {
        const transcription = await transcribeAudio(wavFilePath);
        
        ws.close();
        //console.log('Transcription:', transcription);
        //ws.send(`Transcription: ${transcription}`);
    } catch (error) {
        console.error('Error during transcription:', error);
        ws.send('Error during transcription');
    }
}

/*const wavFilePath = path.join(__dirname,'transcript-audio-1732750881164.wav')
transcribeAudio(wavFilePath)*/

//generateAudio("Prueba 123", '/opt/starlight/client/generated-audio-1732750881164.wav') 