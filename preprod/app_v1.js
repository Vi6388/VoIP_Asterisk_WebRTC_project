const WebSocket = require('ws');
const AriClient = require('ari-client');
const express = require('express');
const cors = require('cors');
let config = require('./config');
const sqlite3 = require('sqlite3').verbose();
let asteriskWss = new WebSocket.Server({ port: config.asteriskWss.port });
const { URL } = require('url');

var xmlparser = require('express-xml-bodyparser');

//const streamingWss = new WebSocket.Server({ port: 6000 });
const app = express();
const port = config.server.port;

app.use(cors());
app.use(xmlparser());

const fs = require('fs');
const path = require('path');

const ARI_URL = config.ari.url;
const ARI_USERNAME = config.ari.username;
const ARI_PASSWORD = config.ari.password;

const swaggerUI = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

require(path.join(__dirname, './routes/routes.js'))(app); 
const authenticate = require('./middleware/authMiddleware');

let activeChannel;
let caller;
let protocol;
let state;

// WAV file configuration
const sampleRate = config.wav.sampleRate; // Adjust to your audio source's sample rate
const numChannels = config.wav.numChannels; // Adjust based on mono (1) or stereo (2)
const bitsPerSample = config.wav.bitsPerSample; // Adjust based on your audio source's bit depth
const byteRate = config.wav.byteRate;

let audioDataBuffer = Buffer.alloc(0); // Buffer to hold raw audio data
let clientAudioDataBuffer = Buffer.alloc(0); 
let wsClient;

// Path to the file where audio will be stored
const audioFilePath = path.join(__dirname, 'received_audio.raw');
const writeStream = fs.createWriteStream(audioFilePath, { flags: 'a' });

const audioBuffer = generateSineWaveLinear16(440, 2); // 440 Hz, 2 seconds at 8000 Hz sample rate
const buffer = Buffer.from(audioBuffer.buffer); // Convert Int16Array to Buffer

// Simulate streaming audio in chunks
const chunkSize = config.streaming.chunkSize; // 4 KB chunks
let offset = config.streaming.offset;

// Generate a sine wave audio buffer in Linear16 format
function generateSineWaveLinear16(frequency, duration, sampleRate = config.wav.sampleRate) {
    const bufferLength = sampleRate * duration;
    const audioBuffer = new Int16Array(bufferLength);
    const angularFrequency = (2 * Math.PI * frequency) / sampleRate;

    for (let i = 0; i < bufferLength; i++) {
        // Scale to 16-bit signed integer range (-32768 to 32767)
        audioBuffer[i] = Math.sin(angularFrequency * i) * 32767;
    }

    return audioBuffer;
}

function connectToClientWebSocket(webSocketClientUrl){

    console.log(`Connecting ti client address : ${webSocketClientUrl}`);

    if(webSocketClientUrl == ''){
        webSocketClientUrl = config.clientWss.url;
    }

    wsClient = new WebSocket(webSocketClientUrl)
    //wsClient = new WebSocket('ws://128.199.211.79:8081');
    wsClient.on('open', () => {
        console.log('Connected to the Client WebSocket server');
        const messageConnected = {
            event: "connected",
            start: {
                time: new Date().toISOString(),  // Format: YYYY-MM-DDTHH:MM:SSZ
                streamSid: activeChannel,
                callSid: caller,  // Replace with actual call SID
                customParameters: {
                    protocol: protocol,
                    state: state // Add your custom parameters here
                }
            }
        };
        wsClient.send(JSON.stringify(messageConnected));
        const message = {
            event: "start",
            start: {
                time: new Date().toISOString(),  // Format: YYYY-MM-DDTHH:MM:SSZ
                streamSid: activeChannel,
                callSid: caller,  // Replace with actual call SID
                customParameters: {
                    protocol: protocol,
                    state: state // Add your custom parameters here
                }
            }
        };
        wsClient.send(JSON.stringify(message));
    });

    wsClient.on('message', async (message) => {

        const msg = JSON.parse(message);
        switch (msg.event) {
            case "media":
              const audioBuffer = Buffer.from(msg.media.payload, 'base64');
                clientAudioDataBuffer = Buffer.concat([clientAudioDataBuffer, audioBuffer]);
                console.log('Client Received audio data', clientAudioDataBuffer);
            break;
            case "playRemoteAudio":

                console.log('Play audio:', message);
                console.log(`Active channel: ${msg.streamSid}`);
                currentChannel = await getChannel(msg.streamSid);
                if (clientAudioDataBuffer.length > 0) {
                    saveAsWavtoHttp(clientAudioDataBuffer,'test');
                    clientAudioDataBuffer = Buffer.alloc(0);
        
                    currentChannel.play({ media: 'sound:' + config.httpServer.url + config.httpServer.audioLocation + config.httpServer.fileName  }, (err, playback) => {
                        if (err) {
                        console.error('Error playing audio:', err);
                        return;
                        }
                        console.log('Audio is playing in:', msg.streamSid);
                    });
                }
            break;
        }
        /*
        const msg = JSON.parse(message);
        switch (msg.event) {
            case "media":
            break;
        }
        */


    });
    
    // Event: Connection closed
    wsClient.on('close', () => {
        console.log('Connection from Client WebSocket closed');
        const message = {
            event: "stop",
            streamSid: activeChannel
          };
        wsClient.send(JSON.stringify(message));
        
    });
    
    // Event: Error occurred
    wsClient.on('error', (error) => {
        console.error('Client WebSocket error:', error);
    });
}

asteriskWss.on('connection', async  (ws, req) => {

    //let audioDataBuffer = Buffer.alloc(0); // Buffer to hold raw audio data

    console.log('Asterisk client connected');

    const url = new URL(req.url, `ws://${req.headers.host}`);
    const caller = url.searchParams.get('caller');
    const channel = url.searchParams.get('channel');

    console.log(`caller : ${caller}`);
    console.log(`activechannelChannel : ${channel}`);

    activeChannel = channel;

    try {

        console.log('Connecting to Client Websocket Server...');
        console.log(`activeChannel : ${activeChannel}`);
        let wsClientUrl = await getCientWsUrl(activeChannel);
        if (wsClientUrl.length > 0) {
            connectToClientWebSocket(wsClientUrl[0].clientWsUrl);
        } else {
            console.error('No WebSocket URL found for the given channel, using default.');
            connectToClientWebSocket(config.clientWss.url);
        }
    } catch (error) {
        console.error('Error retrieving WebSocket URL:', error);
    }

    
    
    ws.on('message', (message) => {
        // `message` is an ArrayBuffer or Buffer
        console.log('Received audio data', message);
        console.log('activeChannel', activeChannel);
        console.log('caller', activeChannel);
        const base64Data = message.toString('base64');
        // Process or store the audio data
	// Write the audio data to the file
        //writeStream.write(message);
        if (wsClient && wsClient.readyState === wsClient.OPEN) {
            const data = {
                event: "media",
                streamSid: activeChannel,
                media: {
                  track: "inbound",  // "outbound" indica que es el audio de salida
                  chunk: 1,
                  timestamp: new Date().toISOString(),
                  payload: base64Data
                }
            };
            wsClient.send(JSON.stringify(data));
            //wsClient.send(message);
        }
        //ws.send(message);
        //console.log('Sending audio data', message);
        //audioDataBuffer = Buffer.concat([audioDataBuffer, message]);
        
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
	    writeStream.end(); // Close the write stream
        if (audioDataBuffer.length > 0) {
            saveAsWav(audioDataBuffer,'sent-audio');
            audioDataBuffer = Buffer.alloc(0);
        }
        const message = {
            event: "stop",
            streamSid: activeChannel
          };
        wsClient.send(JSON.stringify(message));
    });

    
});

// Connect to Asterisk ARI
AriClient.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD)
  .then((ari) => {
    console.log('Connected to ARI');

    CheckDatabase();

    // Listen for StasisStart events
    ari.on('StasisStart', async (event, channel) => {
      console.log(`Call started: ${channel.name}`);

      activeChannel = channel.name;
      caller = channel.caller.number;
      protocol = channel.protocol_id;
      state = channel.state;

      /*channel.answer()
        .then(() => {
          // Playback
            //console.log("Playing audio in the channel")
            /*play(ari,channel, 'sound:goodbye', (err) => {
                // Playback Completed - Send a Hangup Channel
                /*channel.hangup((err) => {
                    console.log(`Hangup Channel ID : ${channel.id}`);
                });*/
            //});
          // Initiate media capture (bridge or channel)
          /*return channel.record({
            format: 'ulaw',
            name: `stream-${channel.id}`
          });*/
        /*})
        .catch(err => console.error('Error answering channel:', err));*/
        console.log(`Channel ${channel.id} entered Stasis`);

        console.log("Event args:", event.args);

        // Check if we should continue automatically
        if (event.args.includes("continue")) {
          await ari.channels.continueInDialplan({ channelId: channel.id });
          console.log(`Channel ${channel.id} automatically resumed dialplan.`);
        }
    });

    ari.on('StasisStop', (event, channel) => {
        ari.stop();
        console.log('Channel hangup');
      });


    ari.on('ChannelHangupRequest', (event, channel) => {
        console.log(`ChannelHangupRequest : ${channel.name} - ${channel.state}`);
        const message = {
            event: "stop",
            streamSid: activeChannel
          };
        //wsClient.send(JSON.stringify(message));
    });

    ari.on('ChannelCreated', (event, channel) => {
        console.log(`ChannelCreated : ${channel.name} - ${channel.state}`);
    });
  

    ari.start('starlight');
}).catch((err) => console.error('ARI connection error:', err));

app.use('/api', authenticate);

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

app.get('/api/hello', (req, res) => {
  res.send('Hello World!');
});

app.get('/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

app.post('/xml', function(req, res, next) {
    // req.body is an object, so we'll check if it has any (enumerable) properties

    console.log('XML Body:', req.body);
    /*if (Object.keys(req.body).length) {
      console.log('Parsed XML', req.body);
      res.send('OK!');
    } else {
      res.send('Not OK :(');
    }
    console.log('post body length', req.rawBody.length); // this is a string*/
    return res.end();
  });

app.listen(port, () => {
  console.log(`Server running on ${config.server.url}:${port}`);
});

function saveAsWav(audioBuffer,name) {
    const wavFilePath = path.join(__dirname, name+'.wav');
    const header = createWavHeader(audioBuffer.length, sampleRate, numChannels, bitsPerSample);

    const wavData = Buffer.concat([header, audioBuffer]);

    fs.writeFileSync(wavFilePath, wavData);
    console.log(`Saved audio data to ${wavFilePath}`);
}

function saveAsWavtoHttp(audioBuffer,name) {
    const wavFilePath = path.join(config.wav.storeLocation, name+'.wav');
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

function play(client, channel, sound, callback) {
    var playback = client.Playback();
    playback.once('PlaybackFinished',
        function (event, instance) {
            if (callback) {
                callback(null);
            }
        });
    channel.play({ media: sound }, playback, (err, playback) => { });
}

async function CheckDatabase() {
    // Connect to SQLite database (creates the file if it doesn't exist)
    const db = new sqlite3.Database(config.sqlite.databasename, (err) => {
      if (err) {
          console.error('Error opening database:', err.message);
      } else {
          console.log('Connected to the SQLite database.');
  
          // Create table if it doesn't exist
          db.run(`CREATE TABLE IF NOT EXISTS clientWsUrl (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              channel TEXT,
              clientWsUrl TEXT
          )`);
      }
    });
  }

  async function getCientWsUrl(channel) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(config.sqlite.databasename, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
            reject(err);
        } else {
          const sql = `SELECT * FROM clientWsUrl where channel ='`+channel+`'`;
          db.all(sql, [], (err, rows) => {
              if (err) {
                  console.error('Error retrieving data:', err.message);
                  reject(err);
              } else {
                  console.log('WebSocketUrl:', rows);
                  resolve(rows);
              }
          });
        }
      });
    });
  }


  async function getChannel(channelName) {

    let currentChannel;
  
    try {
      // Connect to ARI
      const client = await AriClient.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);
  
      // Get active channels
      const channels = await client.channels.list();
  
      // Log channel details
      //console.log("Active Channels in ARI:", channels);
      channels.forEach(channel => {
        //console.log("\n\n\nChannel in loop:", channel);
        if (channelName == channel.name){
            currentChannel = channel;
        }
        console.log(`ID: ${channel.id}, Name: ${channel.name}, State: ${channel.state}, Caller: ${channel.caller.number}`);
      });
  
      return currentChannel;  // Return the list of channels if needed
    } catch (err) {
      console.error("Error listing channels:", err);
      return currentChannel;
    }
  }


