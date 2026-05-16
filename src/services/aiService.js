'use strict';

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Sos un asistente que ayuda a registrar gastos del hogar de una pareja argentina.
Extraé los datos del gasto del mensaje del usuario y respondé ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin explicaciones.

La estructura del JSON debe ser exactamente esta:
{
  "gasto": "descripción corta del gasto",
  "categoria": "una de: Comida | Delivery | Transporte | Servicios | Para la Casa | Salidas/Ocio",
  "fecha": "DD/MM/YYYY",
  "monto": número sin símbolos ni puntos (ej: 15000),
  "pagado_por": "Luqui" o "Tami"
}

Reglas:
- Si no se menciona fecha, usar la fecha de hoy.
- Si no se menciona quién pagó, inferirlo del contexto: si el mensaje lo manda Luqui, pagó Luqui; si lo manda Tami, pagó Tami.
- Si no se menciona categoría, inferirla del tipo de gasto.
- Si el monto no está claro o falta información esencial que no puedas inferir, respondé con: {"error": "descripción del problema"}
- El campo "monto" debe ser siempre un número entero, sin puntos, sin comas, sin "$".

Ejemplos:
- "gasté 3500 en verdura" → categoria: Comida
- "uber 2800" → categoria: Transporte
- "fuimos a comer con tami, pagué 12000" → categoria: Salidas/Ocio
- "flow" → no hay monto, responder con error
- "sushi ko 45000" → categoria: Delivery`;

/**
 * Parses a natural language expense message into a structured object.
 *
 * @param {string} text        Raw message text
 * @param {string} senderName  Display name of the sender (used to infer who paid)
 * @returns {Promise<object>}  Parsed expense object or { error: string }
 */
async function parseExpense(text, senderName) {
  const today = new Date();
  const day = today.getDate();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const todayStr = `${day}/${month}/${year}`;

  const userMessage = `[Mensaje de ${senderName}] ${text}\n\nFecha actual: ${todayStr}`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 256,
  });

  const raw = chatCompletion.choices[0]?.message?.content?.trim() ?? '';

  // Strip potential markdown code fences the model might add despite instructions
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch {
    console.error('Failed to parse LLM response as JSON:', raw);
    return { error: 'No pude interpretar el gasto. Por favor reintentá con más detalle.' };
  }
}

module.exports = { parseExpense };
