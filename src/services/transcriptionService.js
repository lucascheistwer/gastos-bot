'use strict';

const axios = require('axios');
const FormData = require('form-data');

/**
 * Transcribes a WhatsApp audio message using Groq Whisper.
 *
 * With Twilio the audio URL comes directly in MediaUrl0.
 * Downloading it requires Basic Auth (ACCOUNT_SID:AUTH_TOKEN).
 *
 * @param {string} mediaUrl  Direct audio URL from Twilio's MediaUrl0
 * @returns {Promise<string>} Transcribed text
 */
async function transcribe(mediaUrl) {
  // Download the OGG/Opus audio using Twilio Basic Auth
  const audioRes = await axios.get(mediaUrl, {
    responseType: 'arraybuffer',
    auth: {
      username: process.env.TWILIO_ACCOUNT_SID,
      password: process.env.TWILIO_AUTH_TOKEN,
    },
  });

  const audioBuffer = Buffer.from(audioRes.data);

  // Send to Groq Whisper via multipart/form-data
  const form = new FormData();
  form.append('file', audioBuffer, {
    filename: 'audio.ogg',
    contentType: 'audio/ogg',
  });
  form.append('model', 'whisper-large-v3');
  form.append('language', 'es');
  form.append('response_format', 'json');

  const groqRes = await axios.post(
    'https://api.groq.com/openai/v1/audio/transcriptions',
    form,
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        ...form.getHeaders(),
      },
    }
  );

  const text = groqRes.data?.text;
  if (!text) throw new Error('Groq Whisper no devolvió texto.');

  return text.trim();
}

module.exports = { transcribe };
