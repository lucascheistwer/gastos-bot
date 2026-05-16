'use strict';

require('dotenv').config();

const express = require('express');
const { handleIncomingMessage } = require('./handlers/messageHandler');

const app = express();
// Twilio sends webhook data as application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// POST /webhook — incoming WhatsApp messages from Twilio
app.post('/webhook', handleIncomingMessage);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
