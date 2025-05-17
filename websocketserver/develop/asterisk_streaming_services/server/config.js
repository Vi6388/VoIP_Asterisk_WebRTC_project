var config = {};

config.ari = {};
config.asteriskWss = {};
config.server = {};
config.clientWss = {};
config.wav = {};
config.streaming = {};
config.httpServer = {};

/*
config.default_stuff =  ['red','green','blue','apple','yellow','orange','politics'];
config.twitter.user_name = process.env.TWITTER_USER || 'username';
config.twitter.password=  process.env.TWITTER_PASSWORD || 'password';
config.redis.uri = process.env.DUOSTACK_DB_REDIS;
config.redis.host = 'hostname';
config.redis.port = 6379;
config.web.port = process.env.WEB_PORT || 9980;
*/

config.ari.url = 'http://128.199.211.79:8088';
config.ari.username = 'asterdev';
config.ari.password = 'OirBTBIH06N73q';

config.server.url = 'http://128.199.211.79';
config.server.port = 3001;

config.asteriskWss.port = 5001;

config.clientWss.url = 'wss://128.199.211.70:8081';

config.wav.sampleRate = 8000;
config.wav.numChannels = 1; // Adjust based on mono (1) or stereo (2)
config.wav.bitsPerSample = 16; // Adjust based on your audio source's bit depth
config.wav.byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
config.wav.storeLocation = '/var/www/html/audios/';

config.streaming.chunkSize = 4096;
config.streaming.offset = 0;

config.httpServer.url = 'http://128.199.211.79/';
config.httpServer.audioLocation = 'audios/';
config.httpServer.fileName = 'test.wav';

module.exports = config;
