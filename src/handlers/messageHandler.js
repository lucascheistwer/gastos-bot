'use strict';

const transcriptionService = require('../services/transcriptionService');
const aiService = require('../services/aiService');
const sheetsService = require('../services/sheetsService');
const whatsappService = require('../services/whatsappService');

/**
 * Resolves the display name of the sender based on their WhatsApp number.
 * Compares against LUQUI_PHONE and TAMI_PHONE env vars.
 *
 * @param {string} from  e.g. "whatsapp:+5491112345678"
 * @returns {string}     "Luqui", "Tami", or the raw number as fallback
 */
function resolveSenderName(from) {
  if (from === process.env.LUQUI_PHONE) return 'Luqui';
  if (from === process.env.TAMI_PHONE) return 'Tami';
  return from;
}

/**
 * POST /webhook — Twilio sends form-urlencoded fields:
 *   Body              - text message content
 *   From              - sender (whatsapp:+549...)
 *   MediaUrl0         - audio/image URL (if any)
 *   MediaContentType0 - MIME type of the media
 *   NumMedia          - number of media attachments
 */
function handleIncomingMessage(req, res) {
  // Acknowledge immediately — Twilio expects a fast 200 response
  res.sendStatus(200);

  const body = req.body;
  console.log('[webhook] body recibido:', body);

  const from = body?.From;
  const messageBody = body?.Body?.trim();
  const mediaUrl = body?.MediaUrl0;
  const mediaContentType = body?.MediaContentType0 ?? '';
  const numMedia = parseInt(body?.NumMedia ?? '0', 10);

  if (!from) {
    console.log('[webhook] ignorado: sin campo From');
    return;
  }

  const senderName = resolveSenderName(from);
  console.log(`[webhook] mensaje de ${from} (${senderName}): "${messageBody ?? '[audio]'}"`);

  processMessage({ from, messageBody, mediaUrl, mediaContentType, numMedia }, senderName).catch(
    (err) => console.error('Unhandled error in processMessage:', err)
  );
}

async function processMessage({ from, messageBody, mediaUrl, mediaContentType, numMedia }, senderName) {
  // Reply to whoever sent the message
  const replyTo = from;
  let rawText = null;
  let transcribedText = null;

  try {
    const isAudio = numMedia > 0 && mediaContentType.startsWith('audio/');

    if (isAudio) {
      if (!mediaUrl) throw new Error('Mensaje de audio sin URL de media.');
      console.log('[proceso] transcribiendo audio...');
      transcribedText = await transcriptionService.transcribe(mediaUrl);
      rawText = transcribedText;
      console.log('[proceso] transcripción:', rawText);
    } else if (messageBody) {
      rawText = messageBody;
      console.log('[proceso] texto recibido:', rawText);
    } else {
      await whatsappService.sendMessage(replyTo, '❌ Solo puedo procesar mensajes de texto o audio.');
      return;
    }

    const expense = await aiService.parseExpense(rawText, senderName);

    if (!expense || expense.error) {
      const description = expense?.error ?? 'No pude interpretar el mensaje.';
      await whatsappService.sendErrorMessage(replyTo, description);
      return;
    }

    await sheetsService.appendExpense(expense);

    const audioNote = transcribedText ? `\n\n🎙 Entendí: *${transcribedText}*` : '';
    await whatsappService.sendConfirmation(replyTo, expense, audioNote);
  } catch (err) {
    console.error('Error processing message:', err);
    await whatsappService
      .sendErrorMessage(replyTo, err.message ?? 'Error inesperado. Por favor reintentá.')
      .catch(() => {});
  }
}

module.exports = { handleIncomingMessage };
