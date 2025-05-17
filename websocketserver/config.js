var config = {};

config.ari = {};
config.ami = {};
config.asteriskWss = {};
config.server = {};
config.clientWss = {};
config.wav = {};
config.streaming = {};
config.httpServer = {};
config.sqlite = {};

/*
config.default_stuff =  ['red','green','blue','apple','yellow','orange','politics'];
config.twitter.user_name = process.env.TWITTER_USER || 'username';
config.twitter.password=  process.env.TWITTER_PASSWORD || 'password';
config.redis.uri = process.env.DUOSTACK_DB_REDIS;
config.redis.host = 'hostname';
config.redis.port = 6379;
config.web.port = process.env.WEB_PORT || 9980;
*/

config.ari.url = 'http://178.128.221.113:8088';
config.ari.username = 'asterdev';
config.ari.password = 'OirBTBIH06N73q';

config.ami.url = '127.0.0.1';
config.ami.username = 'asterdev';
config.ami.password = 'OirBTBIH06N73q';

config.server.url = 'http://178.128.221.113';
config.server.port = 3000;

config.sqlite.databasename = 'ams.db';

config.asteriskWss.port = 5000;

config.clientWss.url = 'wss://sure-akita-smiling.ngrok-free.app';

config.wav.sampleRate = 8000;
config.wav.numChannels = 1; // Adjust based on mono (1) or stereo (2)
config.wav.bitsPerSample = 16; // Adjust based on your audio source's bit depth
config.wav.byteRate = (config.wav.sampleRate * config.wav.numChannels * config.wav.bitsPerSample) / 8;
//config.wav.storeLocation = '/var/www/html/audios/';
config.wav.storeLocation = '/var/www/atnerds.voicetelecom.net/html/audios/';

config.streaming.chunkSize = 4096;
config.streaming.offset = 0;

//config.httpServer.url = 'http://178.128.221.113/';
config.httpServer.url = 'https://atnerds.voicetelecom.net/';
config.httpServer.audioLocation = 'audios/';
config.httpServer.fileName = 'test.wav';

module.exports = config;
