const { extension } = require("mime");
const AriClient = require('ari-client');

const ARI_URL = 'http://128.199.211.79:8088/ari';
const ARI_USERNAME = 'asterdev';
const ARI_PASSWORD = 'OirBTBIH06N73q';

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

  app.post('/xml', function(req, res, next) {
    // req.body is an object, so we'll check if it has any (enumerable) properties
    console.log('XML Body:', req.body);
    if (Object.keys(req.body).length) {
      console.log('Parsed XML', req.body);
      var dialNumber = req.body.response.dial;
      var streamURl = req.body.response.stream;
      var dialer = req.body.response.dialer;

      console.log('Dialing:', dialNumber);
      console.log('Client Streamming Server:',streamURl);
      console.log('Client Streamming Server:',dialer);
      
      if(dialer == "" || dialer == "" || dialNumber == "" || dialNumber == undefined || streamURl == "" || streamURl == undefined){
        res.send('XML Invalid, please check again');
      } else{
        originateCall("PJSIP/"+dialNumber+"@trunk-username",dialNumber,'outbound',dialer);
        res.send('OK!');
      }

      
    } else {
      res.send('XML Invalid, please check again');
    }
    console.log('post body length', req.rawBody.length); // this is a string
    return res.end();
  });
};

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
