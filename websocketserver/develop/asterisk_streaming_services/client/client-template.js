const WebSocket = require("ws");
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });
const fs = require('fs');

process.env.GOOGLE_APPLICATION_CREDENTIALS = '/opt/starlight/client/resolute-loop-443023-u8-53dab37d5445.json';

const path = require("path");

//require("dotenv").config();

//Include Google Speech to Text
const speech = require("@google-cloud/speech");
const textToSpeech = require('@google-cloud/text-to-speech');

const client = new speech.SpeechClient();
const clientTTS = new textToSpeech.TextToSpeechClient();

let currentWs;
let lastTranscription;
let asterikskAudioDataBuffer = Buffer.alloc(0);
let transcription;

async function sendAudio(data){
  const wavFilePath = path.join(__dirname, 'generated-audio-'+ Date.now()+'.wav');
  try {
      await generateAudio( data,wavFilePath);
      fs.access(wavFilePath, fs.constants.F_OK, (err) => {
          if (err) {
              console.error('Audio file not found:', wavFilePath);
              return;
          }

          // Read and send the audio file
          fs.readFile(wavFilePath, (err, generatedAudioData) => {
              if (err) {
                  console.error('Error reading audio file:', err);
                  return;
              }

              // Send the audio data
              const base64Data = generatedAudioData.toString('base64');

              const data = {
                  event: "media",
                  streamSid: "MZXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                  media: {
                    track: "outbound",  // "outbound" indica que es el audio de salida
                    chunk: 1,
                    timestamp: 1234567890,
                    payload: base64Data
                  }
              };
              //currentWs.send(generatedAudioData, { binary: true }, (err) => {
                currentWs.send(JSON.stringify(data), { binary: true }, (err) => {
                  if (err) {
                      console.error('Error sending audio data:', err);
                  } else {
                      console.log('Audio sent successfully', wavFilePath);
                        const playRemoteAction = {
                          event: "playRemoteAudio",
                          streamSid: "MZXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
                          media: {
                            track: "outbound",  // "outbound" indica que es el audio de salida
                            chunk: 1,
                            timestamp: 1234567890
                          }
                      };
                      currentWs.send(JSON.stringify(playRemoteAction));
                  }
              });
          });
      });
      
  } catch (err) {
      console.error('Error generating audio:', err);
      //ws.send('Error: Audio generation failed');
  }
  
}

//Configure Transcription Request
const request = {
  config: {
    encoding: "LINEAR16",
    sampleRateHertz: 8000,
    languageCode: "es-MX",
  },
  interimResults: true, // If you want interim results, set this to true
};

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

wss.on("connection", function connection(ws) {
  console.log("New Connection Initiated");

  currentWs = ws;

  let recognizeStream = null;

  ws.on("message", function incoming(message) {
    const msg = JSON.parse(message);
    switch (msg.event) {
      case "connected":
        console.log(`A new call has connected.`);
        break;
      case "start":
        console.log(`Starting Media Stream`);
        // Create Stream to the Google Speech to Text API
        recognizeStream = client
          .streamingRecognize(request)
          .on("data", (data) => {

            //console.log("Data:", data);
            transcription = data.results[0]?.alternatives[0]?.transcript;
            if (transcription) {
                /*if (audioBuffer.length > 0) {
                    const fileName = 'transcript-audio-'+ Date.now();
                    saveAsWav(asterikskAudioDataBuffer, fileName);
                    asterikskAudioDataBuffer = Buffer.alloc(0);
                    const wavFilePath = path.join(__dirname, fileName + '.wav');
                    handleTranscription(wss,wavFilePath)
                }*/

                console.log('Transcription:', transcription);
                lastTranscription = transcription;
                
            }
            //console.log(data.results[0].alternatives[0].transcript);
            /*wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    event: "interim-transcription",
                    text: data.results[0].alternatives[0].transcript,
                  })
                );
              }
            });*/
            /*const transcription = data.results[0]?.alternatives[0]?.transcript;
            if (transcription) {
                console.log('Transcription:', transcription);
            }*/
          })
          .on('error', (err) => {
            console.error('Error:', err);
            ws.close();
          });
        break;
      case "media":
        // Write Media Packets to the recognize stream
        const audioBuffer = Buffer.from(msg.media.payload, 'base64');
        asterikskAudioDataBuffer = Buffer.concat([asterikskAudioDataBuffer, audioBuffer]);
        recognizeStream.write(audioBuffer)
       // recognizeStream.write(msg.media.payload);
        //console.log('Received audio data');
        //console.log('Received audio data', audioBuffer);
        //console.log(`Receiving audio`);
        break;
      case "stop":
        console.log(`Call Has Ended`);
        recognizeStream.destroy();
        break;
    }
  });
});

app.use(express.static("public"));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "/index.html")));

app.get('/sendaudio', async (req, res) => {
  console.log("sendAudio:",lastTranscription);
  sendAudio(lastTranscription);
  // Send the response
  res.json(lastTranscription);
  lastTranscription = "";
  transcription = "";
});

app.get('/testaudio', async (req, res) => {
  console.log("Test audio");
  sendAudio("Testing audio");
});

app.post("/", (req, res) => {
  res.set("Content-Type", "text/xml");

  res.send(`
    <Response>
      <Start>
        <Stream url="wss://${req.headers.host}/"/>
      </Start>
      <Dial>+15550123456</Dial>
    </Response>
  `);
});

console.log("Listening on Port 8080");
server.listen(8080);
