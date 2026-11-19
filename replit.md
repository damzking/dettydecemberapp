# Detty December Guide

A stage 1 guide for diaspora visitors to Lagos and Abuja in December.

## Scope

- Frontend only: no login, database, real payments, or live support.
- Keep the code simple and beginner-friendly, with short comments.
- Do not add unlisted features or redesign the requested warm-brown and gold look.
- All sample venue names, prices, dates, and blurbs must stay in square brackets. The specified pass prices are $3, $6, and $10.
- Prioritize a 390px phone layout while keeping the browser version usable on desktop.

## Run

Start the **Detty December Guide** workflow and open Preview. Choose a pass, then use the simulated payment button to enter the five-tab app. No money is charged.

From a shell, use `pnpm --filter @workspace/detty-december run typecheck` to check TypeScript. Use the managed workflow for startup so preview configuration is supplied automatically.

## Project

- `artifacts/detty-december/`: Expo app, local sample content, and device-only state.
- `artifacts/api-server/`: shared starter server; not needed for stage 1.
- No external service accounts or credentials are required.

## Not implemented

Real purchases, authentication, database storage, verified real listings, working ticket checkout, live local replies, WhatsApp integration, and calls are intentionally excluded. Replace bracketed content and refund/support policies before using this as a real guide.
