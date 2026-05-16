'use strict';

/**
 * Test script para probar el bot localmente sin Meta ni ngrok.
 *
 * Simula payloads de webhook de WhatsApp y los envía al servidor local.
 * Groq y Google Sheets funcionan con credenciales reales en .env.
 * La respuesta de WhatsApp va a fallar (o ignorarse) si no hay token real, lo cual es esperado.
 *
 * Uso:
 *   node scripts/test-local.js "gasté 5000 en verdura"
 *   node scripts/test-local.js "uber 2800" tami
 *   node scripts/test-local.js --invalid
 */

require('dotenv').config();
const http = require('http');

const SERVER_URL = `http://localhost:${process.env.PORT || 3000}/webhook`;

// Argumentos
const args = process.argv.slice(2);
const isInvalid = args.includes('--invalid');
const messageText = isInvalid ? 'flow' : (args[0] || 'gasté 3500 en verdura');
const senderArg = args[1] || 'Luqui'; // "Luqui" o "Tami"

const FROM_NUMBER = process.env.LUQUI_PHONE || 'whatsapp:+5491112345678';

function buildPayload(text, sender) {
  // Resolve the From number based on the sender arg
  let from = FROM_NUMBER;
  if (sender.toLowerCase() === 'tami') from = process.env.TAMI_PHONE || 'whatsapp:+5491199999999';
  if (sender.toLowerCase() === 'luqui') from = process.env.LUQUI_PHONE || 'whatsapp:+5491112345678';

  // Twilio sends application/x-www-form-urlencoded fields
  return {
    From: from,
    To: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
    Body: text,
    NumMedia: '0',
    SmsStatus: 'received',
    MessageSid: `SMtest${Date.now()}`,
  };
}

async function sendRequest(payload) {
  const body = new URLSearchParams(payload).toString();
  const url = new URL(SERVER_URL);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('──────────────────────────────────────');
  console.log(`Servidor: ${SERVER_URL}`);
  console.log(`Sender:   ${senderArg}`);
  console.log(`Mensaje:  "${messageText}"`);
  console.log('──────────────────────────────────────');

  const payload = buildPayload(messageText, senderArg);

  try {
    const res = await sendRequest(payload);
    console.log(`\n✅ HTTP ${res.status} (esperado: 200)`);
    console.log('El procesamiento ocurre de forma asíncrona en el servidor.');
    console.log('Revisá los logs del servidor para ver el resultado completo.\n');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('\n❌ No hay servidor escuchando en', SERVER_URL);
      console.error('   Primero corré: npm run dev\n');
    } else {
      console.error('\n❌ Error:', err.message);
    }
    process.exit(1);
  }
}

main();
