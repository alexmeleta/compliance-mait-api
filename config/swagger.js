const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');

const isProduction = process.env.NODE_ENV === 'production';
const protocol = isProduction ? 'https' : 'http';
const host = config.server.host;
const port = config.server.port;

// If you want to hide port on production (typical for 443), you can adjust this logic
const url = isProduction
  ? `${protocol}://${host}` // e.g. https://api.example.com
  : `${protocol}://${host}:${port}`; // e.g. http://localhost:3000

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Compliance MAIT API',
      version: '1.0.0',
      description: 'API documentation for the Compliance MAIT Service',
      contact: {
        name: 'API Support'
      },
    },
    servers: [
      {
        url: url,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './apis/*.js',
    './models/*.js'
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Add a custom function to process the Swagger UI
swaggerSpec.swaggerUIOptions = {
  persistAuthorization: true,
  displayRequestDuration: true,
  docExpansion: 'none',
  filter: true,
  tryItOutEnabled: true,
  syntaxHighlight: {
    activate: true,
    theme: 'agate'
  },
  oauth2RedirectUrl: `${url}/api-docs/oauth2-redirect.html`
};

module.exports = swaggerSpec;
