# wpp-bot-gastos

Bot de WhatsApp para registrar gastos del hogar. Recibe mensajes de texto o audios, extrae el gasto con IA y lo agrega automáticamente a un Google Sheet.

---

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con los valores reales
```

### 3. Levantar el servidor

```bash
npm run dev   # con hot-reload (Node 20+)
# o
npm start
```

El servidor escucha en `http://localhost:3000`.

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (default: 3000) |
| `TWILIO_ACCOUNT_SID` | Account SID de Twilio (empieza con `AC`) |
| `TWILIO_AUTH_TOKEN` | Auth Token de Twilio |
| `TWILIO_WHATSAPP_NUMBER` | Número de Twilio Sandbox (`whatsapp:+14155238886`) |
| `LUQUI_PHONE` | Número de Luqui en formato Twilio (`whatsapp:+549...`) |
| `TAMI_PHONE` | Número de Tami en formato Twilio (`whatsapp:+549...`) |
| `GROQ_API_KEY` | API key de Groq |
| `GOOGLE_SERVICE_ACCOUNT` | JSON completo de la cuenta de servicio (stringificado, sin saltos de línea) |
| `SPREADSHEET_ID` | ID del Google Sheet (el que aparece en la URL) |

---

## Google Sheets — Preparación

1. Crear (o tener) un Google Sheet con pestañas nombradas `Gastos Mes Año` (ej: `Gastos Mayo 2026`).
2. Cada pestaña debe tener como encabezado en la fila 1: `Gasto | Categoría | Fecha | Monto | Pagado Por`.
3. Crear una cuenta de servicio en Google Cloud Console con el rol **Editor** en el Sheet.
4. Compartir el Sheet con el email de la cuenta de servicio (`xxx@proyecto.iam.gserviceaccount.com`).
5. Descargar el JSON de la cuenta de servicio, convertirlo a una sola línea y pegarlo en `GOOGLE_SERVICE_ACCOUNT`.

> Si una pestaña del mes no existe, el bot la crea automáticamente con los encabezados correctos.

---

## Configuración del webhook en Twilio

1. Ir a [Twilio Console](https://console.twilio.com/) → Messaging → Try it out → Send a WhatsApp message.
2. En **Sandbox Settings**, en el campo *"When a message comes in"*, poner:
   `https://tu-dominio.up.railway.app/webhook`
   y seleccionar método **HTTP POST**.
3. Guardar.
4. Cada usuario debe enviar el mensaje de join del sandbox una vez (ej: `join <palabra-clave>`) al número `+14155238886`.
5. Completar `LUQUI_PHONE` y `TAMI_PHONE` en el `.env` con los números reales en formato `whatsapp:+549XXXXXXXXXX`.

---

## Deploy en Railway

1. Crear un nuevo proyecto en [Railway](https://railway.app/) conectado a este repo.
2. Cargar todas las variables de entorno desde el panel de Railway.
3. Railway detecta Node.js automáticamente y corre `npm start`.
4. Copiar el dominio público generado (ej: `https://wpp-bot-gastos.up.railway.app`) y usarlo como webhook URL en Meta.

---

## Estructura

```
src/
├── server.js                    # Entry point, Express + rutas
├── handlers/
│   └── messageHandler.js        # Orquestador del flujo
└── services/
    ├── transcriptionService.js  # Descarga audio → Groq Whisper
    ├── aiService.js             # Texto → JSON estructurado (Groq LLM)
    ├── sheetsService.js         # Append a Google Sheets
    └── whatsappService.js       # Envío de respuestas via Meta API
```

---

## Ejemplos de mensajes válidos

- `gasté 5000 en verdura`
- `carne 15000`
- `uber 2800`
- `tami pagó el flow, 39000`
- `fuimos al cine, 8000 cada entrada, pagué yo`
- _(o cualquiera de estos como mensaje de voz)_
