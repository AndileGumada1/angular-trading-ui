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

Backtesting synchronizes up to 500 recent one-minute candles for the selected
instrument before submitting the simulation. Volatility Index strategies need
at least 201 candles; sync failures and insufficient-history responses are
shown in the backtesting view.

The backend currently documents REST endpoints only. Market data and account
views refresh on request; no WebSocket stream is configured. The development
build uses the `/api` proxy; production builds use
`src/environments/environment.production.ts`. For the current single-computer
setup, this points at `http://localhost:8070/api`, and the backend CORS allowlist
must include the exact Vercel origin. This only works in a browser on the same
computer running the backend. A multi-user deployment needs a reachable HTTPS
backend and a suitable user-authentication flow; do not put shared API
credentials in the frontend bundle.

## End-to-end tests

A separate Java project uses Playwright, Cucumber, and JUnit XML reporting.
See [e2e-java/README.md](./e2e-java/README.md) for setup and run instructions.
