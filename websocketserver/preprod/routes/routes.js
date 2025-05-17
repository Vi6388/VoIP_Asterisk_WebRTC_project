const { extension } = require("mime");
const AriClient = require('ari-client');
let config = require('../config');
const AsteriskManager = require('asterisk-manager');
const sqlite3 = require('sqlite3').verbose();

const ARI_URL = config.ari.url;
const ARI_USERNAME = config.ari.username;
const ARI_PASSWORD = config.ari.password;

const AMI_URL = config.ami.url;
const AMI_USERNAME = config.ami.username;
const AMI_PASSWORD = config.ami.password;



/**
 * @swagger
 * /api/call:
 *   get:
 *     summary: Initiate a call
 *     description: Initiates a call by providing the necessary parameters.
 *     parameters:
 *       - in: query
 *         name: number
 *         required: true
 *         description: The endpoint to call.
 *         schema:
 *           type: string
 *       - in: query
 *         name: callerId
 *         required: true
 *         description: Caller ID for the call.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Call initiated successfully
 *       400:
 *         description: Missing required parameters
 */
module.exports = (app) => {

  app.get('/api/status', async (req, res) => {
    //const { endpoint, extension, context, callerId } = req.query;
    const { channel} = req.query;
  
    // Initiate the call
    const result = await getChannelStatus(channel);
  
    // Send the response
    res.json(result);
  });
  
  app.get('/api/call', async (req, res) => {
    //const { endpoint, extension, context, callerId } = req.query;
    const { number, callerId} = req.query;
  
    // Validate the request parameters
    /*if (!endpoint || !extension || !context || !callerId) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }*/

    if (!number || !callerId ) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    var extension = 201;
    var endpoint =  "PJSIP/52"+ number +"@trunk-username";
    var context = "from-internal";
  
    // Initiate the call
    const result = await originateCall(endpoint, extension, context, callerId);
  
    // Send the response
    res.json(result);
  });

  app.get('/api/test-call', async (req, res) => {
    const { endpoint, extension, context, callerId } = req.query;
    //const { number, callerId} = req.query;
  
    // Validate the request parameters
    if (!endpoint || !extension || !context || !callerId) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }
  
    /*if (!number || !callerId ) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }*/
  
    /*var extension = number;
    var endpoint =  "PJSIP/"+ number +"@trunk-username";
    var context = "from-internal";*/
  
    // Initiate the call
    const result = await originateCall(endpoint, extension, context, callerId);
  
    // Send the response
    res.json(result);
  });

  app.get('/api/list-channels', async (req, res) => {
      //const { endpoint, extension, context, callerId } = req.query;
      
    
      // Initiate the call
      const result = await listActiveChannels();
    
      // Send the response
      res.json(result);
  });

  app.get('/api/conference', async (req, res) => {
    const { action, conference, channels} = req.query;
    let resultCreate;
    let resulted;
    //const { number, callerId} = req.query;
  
    // Validate the request parameters
    if (!action || !conference || !channels) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }
  
    /*if (!number || !callerId ) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }*/
  
    /*var extension = number;
    var endpoint =  "PJSIP/"+ number +"@trunk-username";
    var context = "from-internal";*/

    

    if(action=='new'){

      try {
        resulted = await createDynamicConference(conference);
        console.log("Success:", resulted);
      } catch (error) {
        console.error("Error:", error);
        resulted = { success: false, message: 'Cannot create conference', error: error.message };
      }
      

    }

    if(action=='ami-bridge'){

      let channelsData;
      channelsData = channels.split(",");
      channelsData.forEach(function(channel){
        result = joinDynamicConference(channel,conference);
      });

    }

    if(action=='add'){
      console.error('Channels:', channels);
      let channelsData;
      channelsData = channels.split(",");

      /*channelsData.forEach(function(channel){
        result = await joinConference(channel, conference);
        
      });*/
      try {
        resulted = await joinChannels(channelsData,conference);
        console.log("Success:", resulted);
      } catch (error) {
        console.error("Error:", error);
        resulted = { success: false, message: 'Cannot create conference', error: error.message };
      }

    }


    if(action=='remove'){
      console.error('Channels:', channels);
      let channelsData;
      channelsData = channels.split(",");

      /*channelsData.forEach(function(channel){
        result = await joinConference(channel, conference);
        
      });*/
      try {
        resulted = await removeChannels(channelsData,conference);
        console.log("Success:", resulted);
      } catch (error) {
        console.error("Error:", error);
        resulted = { success: false, message: 'Cannot remove conference', error: error.message };
      }

    }
  
    if(action=='create'){

      // Call the function
      //listActiveChannels();
      
      //let conferenceId =  new Date().getTime();
      let channelsData;
      /*if (channels.includes(",")){
        channelsData = channels.split(",").map(function (val) { return +val + 1; });
      } else {
        channelsData = channels;
        
      }*/

      //channelsData = channels.split(",").map(function (val) { return +val + 1; });
      
      channelsData = channels.split(",");
      

      console.error('Channels Data:', channelsData);
      
      resultCreate = await createConference(conference);

      //conferenceId = resultCreate.Id;

      channelsData.forEach(function(channel){
        moveChannelToStasis(channel);
        result = addMemberToConference(conference, channel) ;
      });

    }

    if(action=='bridge'){
      let channelsData;
      channelsData = channels.split(",");
      console.log('Channels Data:', channelsData);
      amiBridgeChannels(channelsData[0],channelsData[1]);
    }

    if(action=='ari-bridge'){
      resultCreate = await createConference(conference);
      let channelsData;
      channelsData = channels.split(",");
      channelsData.forEach(function(channel){
        result = addMemberToConference(conference, channel) ;
      });
    }

    if(action=='list'){
      resultCreate = await listConferences();
    }
    // Initiate the call
    
  
    // Send the response
    console.log(`Result: ${resulted}`);
    res.json(resulted);
    //return res.end();
  });

  app.post('/xml', function(req, res, next) {
    let result;
    // req.body is an object, so we'll check if it has any (enumerable) properties
    console.log('XML Body:', req.body);
    if (Object.keys(req.body).length) {
      console.log('Parsed XML', req.body);
      var dialNumber = req.body.response.dial;
      var streamURl = req.body.response.stream;
      var dialer = req.body.response.dialer;

      console.log('Dialing:', dialNumber);
      console.log('Client Streamming Server:',streamURl);
      console.log('Dialer:',dialer);
      
      if(dialer == "" || dialer == "" || dialNumber == "" || dialNumber == undefined || streamURl == "" || streamURl == undefined){
        res.send('XML Invalid, please check again');
        result =  { success: false, message: 'XML Invalid, please check again', error: err.message };
      } else{
        originateCall("PJSIP/"+dialNumber+"@trunk-username",dialNumber,'outbound',dialer, streamURl);
        result =  { success: true, message: `Successfyllu created call`, origin: dialer, destination: dialNumber };
        //res.send('OK!');
      }
      
    } else {
      //res.send('XML Invalid, please check again');
      result =  { success: false, message: 'XML Invalid, please check again', error: err.message };
    }
    res.json(result);
    console.log('post body length', req.rawBody.length); // this is a string
    return res.end();
  });
};

async function listConferences() {
  try {
    // Connect to ARI
    const client = await AriClient.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);
    return client.bridges.list()
    .then(bridges => {
      if (bridges.length === 0) {
        console.log('No active bridges.');
      } else {
        console.log('Active Bridges:');
        bridges.forEach(bridge => {
          console.log(`ID: ${bridge.id}, Name: ${bridge.name}, Type: ${bridge.bridge_type}, Channels: ${bridge.channels.length}`);
        });
      }
    })
    .catch(err => console.error('Error listing bridges:', err));
  } catch (err) {
    console.error('Error connecting to ARI:', err);
    return { success: false, message: 'Error listing bridges', error: err.message };
  }
}

async function createConference(bridgeId) {
  try {
    // Connect to ARI
    const client = await AriClient.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);
    return client.bridges.create({ type: 'mixing', bridgeId: bridgeId })
    .then(bridge => {
      console.log(`Conference ${bridge.id} created`);
      return { success: true, message: `Conference ${bridge.id} created` };
      //return bridge;
    }).catch(err => console.error('Error creating bridge:', err));
  } catch (err) {
    console.error('Error connecting to ARI:', err);
    return { success: false, message: 'Error originating call', error: err.message };
  }
}

async function addMemberToConference(bridgeId, channelId) {
  try {
    // Connect to ARI
    const client = await AriClient.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);
    let bridge;
    
    bridge = await client.bridges.get({ bridgeId: bridgeId });

    console.log('Conference:', bridge.id);
    console.log('Channel To Add:', channelId);

    //client.channels.move({ channelId: channelId, app: 'starlight' });

    let channelRealId = await getChannelId(channelId);

    console.log('Channel ID:', channelRealId);

    return await bridge.addChannel({ channel: channelRealId })
      .then(() =>{
        console.log(`Channel ${channelId} added to conference`);
        return { success: true, message: `Channel ${channelId} added to conference ${bridge.id}` };
      })
      .catch(err => console.error('Error adding member:', err));
  } catch (err) {
    console.error('Error connecting to ARI:', err);
    return { success: false, message: 'Error originating call', error: err.message };
  }
}

async function listActiveChannels() {
  try {
    // Connect to ARI
    const client = await AriClient.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);

    // Get active channels
    const channels = await client.channels.list();

    const cleanChannels = channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      state: channel.state,
      caller: channel.caller ? channel.caller.number : "Unknown",
      connected: channel.connected ? channel.connected.number : "Unknown",
    }));

    // Log channel details
    console.log("Active Channels in ARI:");
    channels.forEach(channel => {
      console.log(`ID: ${channel.id}, Name: ${channel.name}, State: ${channel.state}, Caller: ${channel.caller.number}`);
    });

    return cleanChannels;  // Return the list of channels if needed
  } catch (err) {
    console.error("Error listing channels:", err);
    return [];
  }
}

async function getChannelId(channelName) {

  let channelId;

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
        channelId = channel.id;
      }
      console.log(`ID: ${channel.id}, Name: ${channel.name}, State: ${channel.state}, Caller: ${channel.caller.number}`);
    });

    return channelId;  // Return the list of channels if needed
  } catch (err) {
    console.error("Error listing channels:", err);
    return channelId;
  }
}

async function getChannelStatus(channelName) {

  let cleanChannel = {};
  let caller = {};
  let connected = {};
  let dialplan = {};

  try {
      const client = await AriClient.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);
      
      // Fetch channel details
      const channels = await client.channels.list();

      const channel = channels.find(ch => ch.name === channelName);

      

      if(channel){

        cleanChannel.id = channel.id;
        cleanChannel.name = channel.name;
        cleanChannel.state = channel.state;
        cleanChannel.protocol_id = channel.protocol_id;
        caller.name = channel.caller.name;
        caller.number = channel.caller.number;
        cleanChannel.caller = caller;
        connected.name = channel.connected.name;
        connected.number = channel.connected.number;
        cleanChannel.connected = connected;
        cleanChannel.accountcode = channel.accountcode;
        dialplan.context = channel.dialplan.context;
        dialplan.exten = channel.dialplan.exten;
        dialplan.priority = channel.dialplan.priority;
        dialplan.app_name = channel.dialplan.app_name;
        dialplan.app_data = channel.dialplan.app_data;
        cleanChannel.dialplan = dialplan;

        console.log("Channel Info:", channel);
        console.log("State:", channel.state); // Example: "Up", "Ringing", etc.
      } else{
        console.log("Channel not found.");
        cleanChannel.name = channel.name;
        cleanChannel.state = "Down";

      }

      
      return cleanChannel;

  } catch (error) {
      console.error("Error fetching channel status:", error.message);
      cleanChannel.name = channelName;
        cleanChannel.state = "Down";
        return cleanChannel;
      //return error.message;
  }
}


async function originateCall(endpoint, extension, context, callerId, streamUrl) {
  try {
    // Connect to ARI
    const client = await AriClient.connect(ARI_URL, ARI_USERNAME, ARI_PASSWORD);

    // Define the call parameters
    const callOptions = {
      endpoint: endpoint, // Change to your desired endpoint (e.g., SIP/Extension)
      extension: extension,     // Dial plan extension
      context: context,   // Dial plan context
      priority: 1,          // Dial plan priority
      callerId: `"${callerId}" <${callerId}>`
    };

    

    // Originate the call
    client.channels.originate(callOptions, (err, channel) => {
      if (err) {
        console.error('Error originating call:', err);
      } else {
        console.log('Call originated successfully:', channel.name);
        activeChannel = channel.name;
        insertClientWsUrl(activeChannel,streamUrl);
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

async function amiBridgeChannels(firstChannel,secondChannel) {
  try {
    const AsteriskManager = require('asterisk-manager');

    console.log(`bridging channels: ${firstChannel} <-> ${secondChannel} `);

    const ami = new AsteriskManager(5038, AMI_URL, AMI_USERNAME, AMI_PASSWORD, true);

    ami.on('connect', () => {
        console.log('Connected to AMI');
        
        // Bridge two existing channels
        ami.action({
            Action: 'Bridge',
            Channel1: firstChannel,
            Channel2: secondChannel,
            Tone: 'no'
        }, (err, res) => {
            if (err) console.error('Error bridging:', err);
            else console.log('Bridge response:', res);
        });
    });
  } catch (err) {
    console.log('Bridge response:', res);
  }
}

async function moveChannelToStasis(channel) {
  try {
    const AsteriskManager = require('asterisk-manager');

    console.log(`Moving channel: ${channel}`);

    const ami = new AsteriskManager(5038, AMI_URL, AMI_USERNAME, AMI_PASSWORD, true);

    ami.on('connect', () => {
        console.log('Connected to AMI');
        
        // Bridge two existing channels
        ami.action({
          Action: 'Redirect',
          Channel: channel,
          Context: 'from-internal',
          Exten: '999',
          Priority: 1
        }).then(response => {
          console.log('Redirect Response:', response);
        }).catch(err => {
          console.error('Error redirecting channel:', err);
        });
    });
  } catch (err) {
    console.error('Error connecting to AMI:', err);
  }
}

async function startAmiConference(conferenceNumber) {
  try {
    const AsteriskManager = require('asterisk-manager');

    console.log(`Starting conference : ${conferenceNumber}  `);

    const ami = new AsteriskManager(5038, AMI_URL, AMI_USERNAME, AMI_PASSWORD, true);

    ami.on('connect', () => {
      console.log('Connected to AMI');
      ami.action({
        Action: 'ConfBridgeStart',
        Conference: conferenceNumber
      }, (err, res) => {
        if (err) console.error('Error starting conference:', err);
        else console.log(`Conference ${conferenceNumber} started:`, res);
      });
    });
  } catch (error) {
    console.error("Error fetching channel status:", error.message);
  }
}

async function joinChannels(channelsData, conference){
  let result;
  for (const channel of channelsData) {
    try {
      result = await joinConference(channel, conference);
      console.log("Joined:", result);
    } catch (error) {
      console.error("Error joining channel:", error);
    }
  }
  return result;
}

async function removeChannels(channelsData, conference){
  let result;
  for (const channel of channelsData) {
    try {
      result = await removeMemberFromConference(channel, conference);
      console.log("Removed:", result);
    } catch (error) {
      console.error("Error removing channel:", error);
    }
  }
  return result;
}

async function joinConference(channel, conferenceNumber) {
  return new Promise((resolve, reject) => {
    try {
      const AsteriskManager = require('asterisk-manager');

      console.log(`Starting conference : ${conferenceNumber}  `);

      const ami = new AsteriskManager(5038, AMI_URL, AMI_USERNAME, AMI_PASSWORD, true);

      ami.on('connect', () => {

        ami.action({
            Action: "Redirect",
            Channel: channel, // The existing active call
            Context: "from-internal",
            Exten: "991" + conferenceNumber,   // Send it to the conference extension
            Priority: 1
        }, (err, res) => {
            if (err){
              console.error(`Error joining ${channel} to conference ${conferenceNumber}:`, err);
              //return { success: false, message: 'Error joining ${channel} to conference ${conferenceNumber}', error: err.message };
              reject({ success: false, message: 'Error joining ${channel} to conference ${conferenceNumber}', error: err.message });
            }
            else{
              console.log(`Channel ${channel} joined conference ${conferenceNumber}`, res);
              resolve({ success: true, message: `Channel ${channel} joined conference ${conferenceNumber}` });
              //return { success: true, message: `Channel ${channel} joined conference ${conferenceNumber}` };
            } 
        });

        ami.on("error", (error) => {
          console.log("AMI connection error:", error);
          reject({ success: false, message: "AMI connection failed", error: error.message });
        });

      });
    } catch (error) {
      console.error(`Error joining ${channel} to conference ${conferenceNumber}`, error.message);
      reject({ success: false, message: `Error joining ${channel} to conference ${conferenceNumber}`, error: error.message });
    }
  });
}

async function removeMemberFromConference(channel, conference) {
  return new Promise((resolve, reject) => {
    try {
      const AsteriskManager = require('asterisk-manager');
      console.log(`Removing chanel ${channel} from conference ${conference}  `);
      const ami = new AsteriskManager(5038, AMI_URL, AMI_USERNAME, AMI_PASSWORD, true);
      ami.on('connect', () => {

        ami.action({
          Action: 'Command',
          Command: `confbridge kick 991${conference} ${channel}`
        }, (err, res) => {
          if (err){
            console.error(`Error removing ${channel} from conference ${conference}:`, err);
            //return { success: false, message: 'Error joining ${channel} to conference ${conferenceNumber}', error: err.message };
            reject({ success: false, message: `Error removing channel ${channel} from conference ${conference}`, error: err.message });
          }
          else{
            console.log(`Channel ${channel} joined conference ${conference}`, res);
            resolve({ success: true, message: `Channel ${channel} removed from conference ${conference}` });
            //return { success: true, message: `Channel ${channel} joined conference ${conferenceNumber}` };
          } 
        });

      
        /*.then(response => {
          resolve({ success: true, message: `Channel ${channel} removed from conference ${conference}` });
          ami.disconnect();
        }).catch(error => {
          reject({ success: false, message: `Error removing channel ${channel} from conference ${conference}`, error: err.message });
          ami.disconnect();
        });
      }).catch(error => {
        reject({ success: false, message: `Error removing channel ${channel} from conference ${conference}`, error: err.message });*/
      //});
      });

      ami.on("error", (error) => {
        console.log("AMI connection error:", error);
        reject({ success: false, message: `Error removing channel ${channel} from conference ${conference}`, error: err.message });
      });

    } catch (error) {
      console.error(`Error joining ${channel} to conference ${conference}`, error.message);
      reject({ success: false, message: `Error joining ${channel} to conference ${conference}`, error: error.message });
    }
  });
}

async function joinDynamicConference(channel, conferenceNumber) {
  try {
    const AsteriskManager = require('asterisk-manager');

    console.log(`Joining to conference : ${conferenceNumber}  `);

    const ami = new AsteriskManager(5038, AMI_URL, AMI_USERNAME, AMI_PASSWORD, true);

    ami.on('connect', () => {

      ami.action({
        Action: 'Originate',
        Channel: channel,
        Context: 'conf-bridge',
        Exten: conferenceNumber,
        Priority: 1,
        CallerID: `ConfBridge ${conferenceNumber}`,
        Async: true
    }, (err, res) => {
        if (err){
          console.error(`Error joining ${channel} to conference ${conferenceNumber}:`, err);
          return { success: false, message: `Error joining ${channel} to conference ${conferenceNumber}`, error: err.message };
        } 
        else{
          console.log(`Channel ${channel} joined conference ${conferenceNumber}:`, res);
          return { success: true, message: `Channel ${channel} joined conference ${conferenceNumber}` };
        } 
    });

    });
  } catch (error) {
    console.error("Error fetching channel status:", error.message);
  }
}



/*async function createDynamicConference(conferenceNumber) {
  let result; 
  try {
    const AsteriskManager = require('asterisk-manager');

    console.log(`Starting conference : ${conferenceNumber}  `);

    const ami = new AsteriskManager(5038, AMI_URL, AMI_USERNAME, AMI_PASSWORD, true);

    ami.on('connect', () => {

      ami.action({
        Action: "Originate",
        Channel: "Local/9991"+conferenceNumber+"@from-internal",  // Calls the dummy extension
        Context: "from-internal",
        Exten: "991" + conferenceNumber,  // Conference number
        Priority: 1,
        CallerID: "AutoJoin",
        Timeout: 30000,
        Async: true
    }, (err, res) => {
        if (err){ 
          console.log(`Cannot create conference 991${conferenceNumber}:`, res);
          result = { success: false, message: `Cannot create conference 991${conferenceNumber}`, error: err.message };
        } 
        else{
          
          console.error(`Created conference 991${conferenceNumber}`);
          result = { success: true, message: `Created conference 991${conferenceNumber}` };
        } 
    });

    });
  } catch (error) {
    console.log(`Cannot create conference 991${conferenceNumber}:`, res);
    result = { success: false, message: `Cannot create conference 991${conferenceNumber}`, error: err.message };
  }

  console.log(`Result ${result}`);
  return result;
}*/

async function createDynamicConference(conferenceNumber) {
  const AsteriskManager = require('asterisk-manager');

  console.log(`Starting conference : ${conferenceNumber}`);

  return new Promise((resolve, reject) => {
    try {
      const ami = new AsteriskManager(5038, AMI_URL, AMI_USERNAME, AMI_PASSWORD, true);

      ami.on('connect', () => {
        ami.action(
          {
            Action: "Originate",
            Channel: "Local/9991" + conferenceNumber + "@from-internal",
            Context: "from-internal",
            Exten: "991" + conferenceNumber,
            Priority: 1,
            CallerID: "AutoJoin",
            Timeout: 30000,
            Async: true,
          },
          (err, res) => {
            if (err) {
              console.log(`Cannot create conference 991${conferenceNumber}:`, err);
              reject({ success: false, message: `Cannot create conference 991${conferenceNumber}`, error: err.message });
            } else {
              console.log(`Created conference 991${conferenceNumber}`);
              resolve({ success: true, message: `Created conference 991${conferenceNumber}` });
            }
          }
        );
      });

      ami.on("error", (error) => {
        console.log("AMI connection error:", error);
        reject({ success: false, message: "AMI connection failed", error: error.message });
      });

    } catch (error) {
      console.log(`Cannot create conference 991${conferenceNumber}:`, error);
      reject({ success: false, message: `Cannot create conference 991${conferenceNumber}`, error: error.message });
    }
  });
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

async function insertClientWsUrl(channel, clientWsUrl) {
  const db = new sqlite3.Database(config.sqlite.databasename, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
      const sql = `INSERT INTO clientWsUrl (channel, clientWsUrl) VALUES (?, ?)`;

      console.log(`Insert : ${sql}`);
      console.log(`Channel : ${channel}`);
      console.log(`clientWsUrl : ${clientWsUrl}`);
      console.log(`Type of clientWsUrl: ${typeof clientWsUrl}`);
      const clientWsUrlText = JSON.stringify(clientWsUrl);

      let clientWsUrlTextClean= clientWsUrlText.replace(/[\[\]"]+/g, '');

      console.log(`clientWsUrlText : ${clientWsUrlTextClean}`);
      console.log(`Type of clientWsUrlText: ${typeof clientWsUrlTextClean}`);

      db.run(sql, [channel, clientWsUrlTextClean], function (err) {
          if (err) {
              console.error('Error inserting data:', err.message);
          } else {
              console.log(`ClientWsUrl added with ID: ${this.lastID}`);
          }
      });
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