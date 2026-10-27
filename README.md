# Deriv Trading Console

Angular client for the Deriv Multi-Agent Trading API.

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```sh
npm install
npm start
```

The Angular development server proxies `/api` to `http://localhost:8070`, so
the browser does not need cross-origin access to the backend. Start the backend
on port 8070 before using the console. To change that development target, edit
`proxy.conf.json`.

## Authentication and API

The backend uses HTTP Basic authentication. Enter the backend username and
password on the sign-in screen to open the dashboard; the client keeps them in
memory only and sends them in the `Authorization` header. Backend requests run
from the dashboard, where connection or credential errors are displayed.
Credentials are not stored in browser storage. Reloading or signing out clears
them.

The console connects to the REST endpoints documented by the backend's
OpenAPI spec: portfolio, trades, signals, MT5 signals, market candles and sync,
strategy evaluation, backtesting, headline sentiment, and NFP/CPI gold news signals.
Strategy evaluation can execute a trade if the backend approves it, so it is
an explicit user action.

The backend currently documents REST endpoints only. Market data and account
views refresh on request; no WebSocket stream is configured. For deployments,
serve the frontend behind a same-origin reverse proxy that forwards `/api` to
the backend, or update `src/environments/environment.ts` and configure backend
CORS for the deployed frontend origin.

## End-to-end tests

A separate Java project uses Playwright, Cucumber, and JUnit XML reporting.
See [e2e-java/README.md](./e2e-java/README.md) for setup and run instructions.
