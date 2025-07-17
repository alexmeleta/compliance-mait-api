# IIS Deployment Guide for Compliance-MAIT-Service

This guide will help you deploy your Node.js application to Internet Information Services (IIS) on Windows.

## Prerequisites

1. **Windows Server** with IIS installed
2. **Node.js** installed on the server
3. **iisnode** module installed ([Download from GitHub](https://github.com/Azure/iisnode/releases))
4. **URL Rewrite Module** for IIS ([Download from Microsoft](https://www.iis.net/downloads/microsoft/url-rewrite))
5. **PostgreSQL** database accessible from the server

## Installation Steps

### 1. Install Required IIS Components

Make sure you have the following IIS components installed:
- Web Server (IIS)
- IIS Management Console
- URL Rewrite Module
- iisnode

### 2. Create a New IIS Website or Application

1. Open **Internet Information Services (IIS) Manager**
2. Right-click on **Sites** and select **Add Website** (or add as an application under an existing site)
3. Enter the following details:
   - **Site name**: compliance-mait-service (or your preferred name)
   - **Physical path**: Path to your application folder (e.g., C:\inetpub\wwwroot\compliance-mait-service)
   - **Binding**: Configure the appropriate IP address, port, and host name

### 3. Deploy Your Application

1. Copy all your application files to the physical path you specified in IIS
2. Make sure the `web.config` file is in the root directory
3. Ensure the application pool identity has read/write permissions to the application directory

### 4. Configure Environment Variables

1. Set up the appropriate environment variables for your production environment
2. You can set the `NODE_ENV` environment variable in one of these ways:
   - In the `web.config` file (already set to use %NODE_ENV%)
   - In the application pool advanced settings
   - As a system environment variable

### 5. Set Up the Database

1. Ensure your PostgreSQL database is accessible from the IIS server
2. Verify the connection details in your `.env.production` file:
   - Host: 52.156.160.251
   - Port: 5432
   - Username: postgres
   - Database: certs-v3

### 6. Test the Deployment

1. Browse to your website URL
2. Check the iisnode logs (in the `iisnode` directory) if you encounter any issues

## Troubleshooting

### Common Issues

1. **500 - Internal Server Error**
   - Check the iisnode logs in the `iisnode` directory
   - Verify that Node.js is installed and accessible via the path specified in web.config

2. **404 - Not Found**
   - Ensure URL Rewrite module is installed
   - Check that the rewrite rules in web.config are correct

3. **Database Connection Issues**
   - Verify that the server can reach the PostgreSQL database
   - Check firewall settings
   - Confirm database credentials are correct

### Viewing Logs

- Application logs are stored in the `iisnode` directory in your application folder
- You can enable more detailed logging by modifying the `loggingEnabled` and related settings in web.config

## Additional Configuration

### Adjusting Node.js Settings

You can modify the following settings in the `web.config` file:

- `nodeProcessCommandLine`: Path to the Node.js executable
- `maxConcurrentRequestsPerProcess`: Maximum number of concurrent requests
- `debuggingEnabled`: Enable/disable debugging
- Other iisnode-specific settings

### SSL Configuration

To enable HTTPS:

1. Obtain an SSL certificate
2. Configure HTTPS binding in IIS Manager
3. Update your application to handle HTTPS traffic

## References

- [iisnode documentation](https://github.com/Azure/iisnode/wiki)
- [IIS URL Rewrite documentation](https://docs.microsoft.com/en-us/iis/extensions/url-rewrite-module/using-the-url-rewrite-module)
- [Node.js on IIS](https://docs.microsoft.com/en-us/azure/app-service/app-service-web-get-started-nodejs)
