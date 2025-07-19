const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'});

const doc = {
  info: {
    title: 'EduRuz API',
    description: 'API Documentation for the EduRuz Learning Platform'
  },
  host: 'localhost:8080',
  securityDefinitions:{
    bearerAuth: {
      type: 'http',
      name: 'Authorization',
      scheme: 'bearer',
      in: 'header',
      bearerFormat: 'JWT',
      description: 'Enter JWT Bearer token **_only_**'
    }
  }
};

const outputFile = './docs/swagger-output.json';
const routes = ['./server.js'];

swaggerAutogen(outputFile, routes, doc);