'use strict';

const { google } = require('googleapis');

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const SHEET_HEADERS = ['Gasto', 'Categoría', 'Fecha', 'Monto', 'Pagado Por'];

/**
 * Derives the sheet tab name from a date string (D/MM/YYYY or DD/MM/YYYY).
 * Example: "16/05/2026" → "Gastos Mayo 2026"
 */
function getSheetName(dateStr) {
  const parts = dateStr.split('/');
  const monthIndex = parseInt(parts[1], 10) - 1;
  const year = parts[2];
  return `Gastos ${MONTHS_ES[monthIndex]} ${year}`;
}

function buildAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Ensures the target sheet tab exists. Creates it with headers if it doesn't.
 */
async function ensureSheet(sheets, spreadsheetId, sheetName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = meta.data.sheets.map((s) => s.properties.title);

  if (existingTitles.includes(sheetName)) return;

  // Create tab
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });

  // Write header row
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1:E1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [SHEET_HEADERS] },
  });
}

/**
 * Appends an expense row to the correct monthly sheet tab.
 *
 * @param {object} expense  Parsed expense from aiService
 */
async function appendExpense(expense) {
  const auth = buildAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const sheetName = getSheetName(expense.fecha);
  await ensureSheet(sheets, spreadsheetId, sheetName);

  const row = [
    expense.gasto,
    expense.categoria,
    expense.fecha,
    Number(expense.monto),
    expense.pagado_por,
  ];

  // Find the last row that actually has data in column A to avoid gaps
  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:A`,
  });
  const existingRows = colA.data.values ?? [];
  let lastFilledRow = 0;
  for (let i = 0; i < existingRows.length; i++) {
    if (existingRows[i]?.[0]?.toString().trim()) {
      lastFilledRow = i + 1; // 1-indexed
    }
  }
  const targetRow = lastFilledRow + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A${targetRow}:E${targetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

module.exports = { appendExpense };
