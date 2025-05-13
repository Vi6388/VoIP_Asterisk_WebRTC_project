const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
    title: 'Asterisk Media Streaming API',
    version: '1.0.0',
    description: 'Asterisk Media Streaming API v1',
    },
  };


  const options = {
    swaggerDefinition,
    apis: [path.join(__dirname, './routes/*.js')], // Path to the API routes in your Node.js application
    };
  
  const swaggerSpec = swaggerJSDoc(options);
  module.exports = swaggerSpec;