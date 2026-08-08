# Implementation Plan - WhatsApp 24/7 Continuous Daemon Deployment

Implementation plan for deploying a dedicated 24/7 background Node.js container with persistent storage to maintain live WhatsApp Web sessions without phone disconnection.

## User Review Required

> [!IMPORTANT]
> The continuous 24/7 WhatsApp Daemon uses persistent disk volumes (`whatsapp-auth/`) to retain Baileys cryptographic keys across server restarts, preventing mobile app logout traps.

## Proposed Changes

### WhatsApp Gateway & Daemon

#### [NEW] [Dockerfile.whatsapp](file:///c:/Users/diego/OneDrive/%C3%81rea%20de%20Trabalho/Rodrigues%20%20$%20Soares%20-%20Advocacia/AssinaJur/Dockerfile.whatsapp)
- Configured light Node.js Alpine container with `/app/whatsapp-auth` volume mount.

#### [MODIFY] [whatsapp-daemon.js](file:///c:/Users/diego/OneDrive/%C3%81rea%20de%20Trabalho/Rodrigues%20%20$%20Soares%20-%20Advocacia/AssinaJur/scripts/whatsapp-daemon.js)
- Implemented automatic media downloading (RG/CNH photos), Base64 encoding, Gemini Vision OCR payload forwarding, and resilient auto-reconnect.

## Verification Plan

### Automated Tests
- Executed `scripts/test_live.js` against production Vercel endpoints. Result: `HTTP 200 OK`.
- Verified Next.js build compilation with 28 static/dynamic routes.
