#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const url = require('url');
const { google } = require('googleapis');

// Load env
const clawdEnv = fs.readFileSync('/Users/judsoderborg/.clawdbot/.env', 'utf8');
clawdEnv.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#')) {
    process.env[key] = vals.join('=');
  }
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3333/callback'
);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('\n🔐 Google Calendar Authorization\n');
console.log('Open this URL:\n');
console.log(authUrl);
console.log('\n⏳ Waiting...\n');

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/callback' && parsedUrl.query.code) {
    try {
      const { tokens } = await oauth2Client.getToken(parsedUrl.query.code);
      
      console.log('✅ Success!\n');
      console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body style="font-family:system-ui;padding:40px;text-align:center;"><h1>✅ Done!</h1><p>Close this window.</p></body></html>');
      
      setTimeout(() => process.exit(0), 500);
    } catch (err) {
      console.error('Error:', err.message);
      res.writeHead(500);
      res.end('Error: ' + err.message);
    }
  }
});

server.listen(3333);
