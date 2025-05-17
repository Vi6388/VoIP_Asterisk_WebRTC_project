const WebSocket = require('ws');
const AriClient = require('ari-client');
const express = require('express');
const asteriskWss = new WebSocket.Server({ port: 5000 });
//const streamingWss = new WebSocket.Server({ port: 6000 });


const app = express();
const port = 3000;

const fs = require('fs');
const path = require('path');

const ARI_URL = 'http://128.199.211.79:8088/ari';
const ARI_USERNAME = 'asterdev';
const ARI_PASSWORD = 'OirBTBIH06N73q';

let activeChannel;


// WAV file configuration
const sampleRate = 8000; // Adjust to your audio source's sample rate
const sampleRate16 = 16000;
const numChannels = 1; // Adjust based on mono (1) or stereo (2)
const bitsPerSample = 16; // Adjust based on your audio source's bit depth
const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;

let audioDataBuffer = Buffer.alloc(0); // Buffer to hold raw audio data
let clientAudioDataBuffer = Buffer.alloc(0); 
let wsClient;

// Path to the file where audio will be stored
const audioFilePath = path.join(__dirname, 'received_audio.raw');
const writeStream = fs.createWriteStream(audioFilePath, { flags: 'a' });

function connectToClientWebSocket(){
    wsClient = new WebSocket('ws://128.199.211.79:8765'); 

    wsClient.on('open', () => {
        console.log('Connected to the Client WebSocket server');
    });

    wsClient.on('message', (message) => {
        console.log('Received from Client WebSocket server:', message);
        if(message == "playRemoteAudio"){
            if (clientAudioDataBuffer.length > 0) {
                saveAsWavtoHttp(clientAudioDataBuffer,'test');
                clientAudioDataBuffer = Buffer.alloc(0);
    
                activeChannel.play({ media: 'sound:http://128.199.211.79/audios/test.wav' }, (err, playback) => {
                    if (err) {
                      console.error('Error playing audio:', err);
                      return;
                    }
                    console.log('Audio is playing');
                  });
            }
        } else {
            clientAudioDataBuffer = Buffer.concat([clientAudioDataBuffer, message]);
        }
        


    });
    
    // Event: Connection closed
    wsClient.on('close', () => {
        console.log('Connection from Client WebSocket closed');
        
    });
    
    // Event: Error occurred
    wsClient.on('error', (error) => {
        console.error('Client WebSocket error:', error);
    });
}

asteriskWss.on('connection', (ws) => {

    //let audioDataBuffer = Buffer.alloc(0); // Buffer to hold raw audio data

    console.log('Asterisk client connected');

    console.log('Connecting to Client Websocket Server...');
    connectToClientWebSocket();
    
    ws.on('message', (message) => {
        // `message` is an ArrayBuffer or Buffer
        console.log('Received audio data', message);
        // Process or store the audio data
	// Write the audio data to the file
        writeStream.write(message);
        if (wsClient && wsClient.readyState === wsClient.OPEN) {
            wsClient.send(message);
        }
        audioDataBuffer = Buffer.concat([audioDataBuffer, message]);
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
	    writeStream.end(); // Close the write stream
        if (audioDataBuffer.length > 0) {
            saveAsWav(audioDataBuffer,'sent-audio');
            audioDataBuffer = Buffer.alloc(0);
        }
    });

    
});

// Connect to Asterisk ARI
AriClient.connect('http://128.199.211.79:8088', 'asterdev', 'OirBTBIH06N73q')
  .then((ari) => {
    console.log('Connected to ARI');

    // Listen for StasisStart events
    ari.on('StasisStart', (event, channel) => {
      console.log(`Call started: ${channel.name}`);

      activeChannel = channel;

      channel.answer()
        .then(() => {
          // Playback
            console.log("Playing audio in the channel")
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
        })
        .catch(err => console.error('Error answering channel:', err));

    });

    ari.on('StasisStop', (event, channel) => {
        ari.stop();
        console.log('Channel hangup');
      });


    ari.on('ChannelHangupRequest', (event, channel) => {
        console.log(`ChannelHangupRequest : ${channel.name} - ${channel.state}`);
    });

    ari.on('ChannelCreated', (event, channel) => {
        console.log(`ChannelCreated : ${channel.name} - ${channel.state}`);
    });
  

    ari.start('starlight');
  })
  .catch((err) => console.error('ARI connection error:', err));

  app.get('/call', async (req, res) => {
    const { endpoint, extension, context, callerId } = req.query;
  
    // Validate the request parameters
    if (!endpoint || !extension || !context || !callerId) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }
  
    // Initiate the call
    const result = await originateCall(endpoint, extension, context, callerId);
  
    // Send the response
    res.json(result);
  });
  
  app.listen(port, () => {
    console.log(`Server running on http://128.199.211.79:${port}`);
  });

function saveAsWav(audioBuffer,name) {
    const wavFilePath = path.join(__dirname, name+'.wav');
    const header = createWavHeader(audioBuffer.length, sampleRate, numChannels, bitsPerSample);

    const wavData = Buffer.concat([header, audioBuffer]);

    fs.writeFileSync(wavFilePath, wavData);
    console.log(`Saved audio data to ${wavFilePath}`);
}

function saveAsWavtoHttp(audioBuffer,name) {
    const wavFilePath = path.join('/var/www/html/audios/', name+'.wav');
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

// Originate a call
async function originateCall(endpoint, extension, context, callerId) {
    try {
      // Connect to ARI
      const client = await AriClient.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);
  
      // Define the call parameters
      const callOptions = {
        endpoint: endpoint, // Change to your desired endpoint (e.g., SIP/Extension)
        extension: extension,     // Dial plan extension
        context: context,   // Dial plan context
        priority: 1,          // Dial plan priority
        callerId: callerId
      };
  
      // Originate the call
      client.channels.originate(callOptions, (err, channel) => {
        if (err) {
          console.error('Error originating call:', err);
        } else {
          console.log('Call originated successfully:', channel);
        }
      });
  
      // Event listener for hangup
      client.on('StasisEnd', (event, channel) => {
        console.log('Call ended:', channel.name);
      });

      client.on('ChannelHangupRequest', (event, channel) => {
        console.log(`ChannelHangupRequest : ${channel.name} - ${channel.state}`);
        });

        client.on('ChannelCreated', (event, channel) => {
            console.log(`ChannelCreated : ${channel.name} - ${channel.state}`);
        });
  
      return { success: true, message: 'Call originated successfully' };
  
    } catch (err) {
      console.error('Error connecting to ARI:', err);
      return { success: false, message: 'Error originating call', error: err.message };
    }
  }
  
