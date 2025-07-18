// At the very top of server.js, before any other requires
const winston = require('winston');
const { format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

// Create a custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
});

// Create a logger instance
const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        json()
    ),
    defaultMeta: { service: 'compliance-mait-service' },
    transports: [
        // Write all logs with level `error` and below to `error.log`
        new transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        // Write all logs to `combined.log`
        new transports.File({ 
            filename: 'logs/combined.log' 
        })
    ]
});

// If we're not in production, also log to the console with colorization
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: combine(
            colorize(),
            timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            consoleFormat
        )
    }));
}

// Override console methods
console.log = function() {
    const args = Array.from(arguments);
    logger.info(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' '));
};

console.error = function() {
    const args = Array.from(arguments);
    logger.error(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' '));
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Consider proper error handling and graceful shutdown
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const express = require('express');
const cors = require('cors'); 
const config = require('./config/config');
const { testConnection } = require('./config/database');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();
const port = config.server.port;



// Apply CORS settings from config
app.use(cors(config.cors));

// Add middleware to parse JSON and urlencoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
testConnection();

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerSpec.swaggerUIOptions));
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Mount API routes
const profileApi = require('./apis/profile-api');
const profileAvatarApi = require('./apis/profile-avatar-api');
const certificateApi = require('./apis/certificate-api');
const connectionApi = require('./apis/connection-api');
const jurisdictionApi = require('./apis/jurisdiction-api');
const countryApi = require('./apis/country-api');
const stateApi = require('./apis/state-api');
const notificationApi = require('./apis/notification-api');
const authApi = require('./apis/auth-api');
const roleApi = require('./apis/role-api');
const scanApi = require('./apis/scan-api').router;
const fileApi = require('./apis/file-api');
const inviteApi = require('./apis/invites-api');

app.use('/api/profiles', profileApi);
app.use('/api/profiles', profileAvatarApi); 
app.use('/api/certificates', certificateApi);
app.use('/api/connections', connectionApi);
app.use('/api/jurisdictions', jurisdictionApi);
app.use('/api/countries', countryApi);
app.use('/api/states', stateApi);
app.use('/api/notifications', notificationApi);
app.use('/api/auth', authApi);
app.use('/api/roles', roleApi);
app.use('/api/invites', inviteApi);
app.use('/api', scanApi);
app.use('/api/files', fileApi);

// Start server
app.listen(port, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Server listening on http://${config.server.host}:${port}`);
  console.log(`Swagger documentation available at http://${config.server.host}:${port}/api-docs`);
});
