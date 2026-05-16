'use strict';

const twilio = require('twilio');

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Formats a number as Argentine peso string: 15000 → "$15.000"
 */
function formatMonto(monto) {
  const n = Math.round(Number(monto));
  return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Sends a plain text WhatsApp message via Twilio.
 *
 * @param {string} to    Recipient in Twilio format (whatsapp:+549...)
 * @param {string} text  Message body
 */
async function sendMessage(to, text) {
  await getClient().messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to,
    body: text,
  });
}

/**
 * Sends a success confirmation after an expense is registered.
 *
 * @param {string} to         Recipient in Twilio format
 * @param {object} expense    Parsed expense object
 * @param {string} audioNote  Optional note appended for voice messages
 */
async function sendConfirmation(to, expense, audioNote = '') {
  const text =
    `✅ Gasto registrado!\n\n` +
    `📝 ${expense.gasto}\n` +
    `💰 ${formatMonto(expense.monto)}\n` +
    `📂 ${expense.categoria}\n` +
    `📅 ${expense.fecha}\n` +
    `👤 ${expense.pagado_por}` +
    audioNote;

  await sendMessage(to, text);
}

/**
 * Sends a user-friendly error message.
 *
 * @param {string} to          Recipient in Twilio format
 * @param {string} description Human-readable description of what went wrong
 */
async function sendErrorMessage(to, description) {
  const text =
    `❌ No pude registrar el gasto.\n${description}\n\n` +
    `Intentá con algo como: "gasté 3500 en verdura"`;

  await sendMessage(to, text);
}

module.exports = { sendMessage, sendConfirmation, sendErrorMessage };
