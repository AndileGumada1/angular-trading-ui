import { HttpErrorResponse } from "@angular/common/http";
import {
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  PercentPipe,
} from "@angular/common";
import { ChangeDetectorRef, Component, inject, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { switchMap } from "rxjs";
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { AuthService } from "./core/services/auth.service";
import { TradingService } from "./core/services/trading.service";
import {
  BacktestRequest,
  BacktestResult,
  Candle,
  Evaluation,
  GoldNewsEvent,
  GoldNewsRequest,
  GoldNewsSignal,
  NewsSentiment,
  Signal,
  Trade,
} from "./core/models/trading.models";

type View = "overview" | "market" | "trades" | "backtesting" | "news";
const BACKTEST_CANDLE_COUNT = 500;

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    PercentPipe,
    DashboardComponent,
  ],
  template: `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">DERIV MULTI-AGENT TRADING SYSTEM</p>
          <h1>Trading console</h1>
        </div>
        @if (authenticated) {
          <button class="button button-quiet" type="button" (click)="logout()">
            Sign out
          </button>
        }
      </header>

      @if (!authenticated) {
        <section class="login-card">
          <p class="eyebrow">BACKEND CONNECTION</p>
          <h2>Sign in to your trading API</h2>
          <p class="muted">
            Use your backend HTTP Basic credentials. They are held in memory
            only and cleared when you sign out or reload this page.
          </p>
          <form (ngSubmit)="login()">
            <label>
              Username
              <input
                name="username"
                [(ngModel)]="username"
                autocomplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                [(ngModel)]="password"
                type="password"
                autocomplete="current-password"
                required
              />
            </label>
            <button class="button button-primary" type="submit">
              Open dashboard
            </button>
          </form>
        </section>
      } @else {
        <nav class="tabs" aria-label="Trading sections">
          <button type="button" [class.active]="view === 'overview'" (click)="view = 'overview'">Overview</button>
          <button type="button" [class.active]="view === 'market'" (click)="view = 'market'">Market</button>
          <button type="button" [class.active]="view === 'trades'" (click)="view = 'trades'">Trades</button>
          <button type="button" [class.active]="view === 'backtesting'" (click)="view = 'backtesting'">Backtesting</button>
          <button type="button" [class.active]="view === 'news'" (click)="view = 'news'">News analysis</button>
        </nav>

        @if (view === "overview") {
          <app-dashboard />
        }

        @if (view === "market") {
          <section class="page-heading">
            <div>
              <p class="eyebrow">MARKET DATA</p>
              <h2>Signals &amp; candles</h2>
            </div>
          </section>
          <section class="panel">
            <form class="inline-form" (ngSubmit)="loadMarketData()">
              <label>
                Instrument
                <select name="instrument" [(ngModel)]="instrument" required>
                  @for (option of instruments; track option.symbol) {
                    <option [value]="option.symbol">{{ option.label }} ({{ option.symbol }})</option>
                  }
                </select>
              </label>
              <button class="button button-primary" type="submit" [disabled]="marketLoading">
                {{ marketLoading ? "Loading…" : "Load data" }}
              </button>
              <button class="button button-quiet" type="button" (click)="syncMarketData()" [disabled]="syncLoading">
                {{ syncLoading ? "Syncing…" : "Sync candles" }}
              </button>
              <button class="button button-quiet" type="button" (click)="loadMt5Signal()" [disabled]="mt5SignalLoading || !instrument.trim()">
                {{ mt5SignalLoading ? "Loading…" : "Get MT5 signal" }}
              </button>
            </form>
            @if (marketError) { <p class="error" role="alert">{{ marketError }}</p> }
            @if (syncError) { <p class="error" role="alert">{{ syncError }}</p> }
            @if (mt5SignalError) { <p class="error" role="alert">{{ mt5SignalError }}</p> }
            @if (mt5Signal) {
              <p class="muted">MT5 signal: <strong>{{ mt5Signal }}</strong></p>
            }
          </section>
          <section class="panel">
            <div class="panel-heading"><h3>Signals</h3><span class="badge">{{ signals.length }}</span></div>
            @if (signals.length) {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Direction</th><th>Price</th><th>Reason</th><th>Created</th></tr></thead>
                  <tbody>
                    @for (signal of signals; track signal.id ?? $index) {
                      <tr><td>{{ signal.direction ?? "—" }}</td><td>{{ signal.price | number: "1.2-6" }}</td><td>{{ signal.reason ?? "—" }}</td><td>{{ signal.createdAt | date: "short" }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="empty-state">Load market data to view signals.</p>
            }
          </section>
          <section class="panel">
            <div class="panel-heading"><h3>Recent candles</h3><span class="badge">{{ candles.length }}</span></div>
            @if (candles.length) {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th></tr></thead>
                  <tbody>
                    @for (candle of candles; track candle.id ?? candle.timestamp) {
                      <tr><td>{{ candle.timestamp | date: "short" }}</td><td>{{ candle.open | number: "1.2-6" }}</td><td>{{ candle.high | number: "1.2-6" }}</td><td>{{ candle.low | number: "1.2-6" }}</td><td>{{ candle.close | number: "1.2-6" }}</td><td>{{ candle.volume | number: "1.0-4" }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="empty-state">No candles loaded.</p>
            }
          </section>
          <section class="panel risk-panel">
            <div class="panel-heading">
              <div>
                <h3>Evaluate strategy</h3>
                <p class="muted">The backend may execute an approved trade. Only run this when you intend to.</p>
              </div>
              <button class="button button-danger" type="button" (click)="evaluateStrategy()" [disabled]="evaluationLoading || !instrument.trim()">
                {{ evaluationLoading ? "Evaluating…" : "Evaluate & execute" }}
              </button>
            </div>
            @if (evaluationError) { <p class="error" role="alert">{{ evaluationError }}</p> }
            @if (evaluation; as result) {
              <div class="result-grid">
                <div><span>Signal</span><strong>{{ result.signal?.direction ?? "—" }} · {{ result.signal?.price | number: "1.2-6" }}</strong></div>
                <div><span>Risk decision</span><strong>{{ result.risk?.approved ? "Approved" : "Not approved" }}</strong></div>
                <div><span>Execution</span><strong>{{ result.execution?.status ?? "—" }}</strong></div>
                <div><span>Message</span><strong>{{ result.execution?.message ?? result.risk?.reason ?? "—" }}</strong></div>
              </div>
            }
          </section>
        }

        @if (view === "trades") {
          <section class="page-heading">
            <div><p class="eyebrow">ACTIVITY</p><h2>Trades</h2></div>
            <button class="button button-quiet" type="button" (click)="loadTrades()" [disabled]="tradesLoading">
              {{ tradesLoading ? "Loading…" : "Refresh trades" }}
            </button>
          </section>
          @if (tradesError) { <p class="error" role="alert">{{ tradesError }}</p> }
          <section class="panel">
            @if (trades.length) {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Instrument</th><th>Direction</th><th>Mode</th><th>Status</th><th>Entry</th><th>Exit</th><th>Realized P&amp;L</th><th>Created</th></tr></thead>
                  <tbody>
                    @for (trade of trades; track trade.id ?? $index) {
                      <tr><td>{{ trade.instrument ?? "—" }}</td><td>{{ trade.direction ?? "—" }}</td><td>{{ trade.mode ?? "—" }}</td><td>{{ trade.status ?? "—" }}</td><td>{{ trade.entryPrice | currency }}</td><td>{{ trade.exitPrice | currency }}</td><td>{{ trade.realizedPnl | currency }}</td><td>{{ trade.createdAt | date: "short" }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="empty-state">No trades returned by the API.</p>
            }
          </section>
        }

        @if (view === "backtesting") {
          <section class="page-heading"><div><p class="eyebrow">SIMULATION</p><h2>Backtesting</h2></div></section>
          <section class="panel">
            <form class="inline-form" (ngSubmit)="runBacktest()">
              <label>
                Instrument
                <select name="backtestInstrument" [(ngModel)]="instrument" required>
                  @for (option of instruments; track option.symbol) {
                    <option [value]="option.symbol">{{ option.label }} ({{ option.symbol }})</option>
                  }
                </select>
              </label>
              <label>Initial capital (optional)<input name="initialCapital" type="number" min="1" [(ngModel)]="initialCapital" /></label>
              <button class="button button-primary" type="submit" [disabled]="backtestLoading">
                {{ backtestLoading ? "Loading history and running…" : "Run backtest" }}
              </button>
            </form>
            <p class="helper-text">Syncs 500 recent one-minute candles before simulating stored history. Volatility Index strategies require at least 201 candles.</p>
            @if (backtestError) { <p class="error" role="alert">{{ backtestError }}</p> }
          </section>
          @if (backtest; as result) {
            <section class="metric-grid">
              <article class="metric-card"><span>Final equity</span><strong>{{ result.finalEquity | currency }}</strong></article>
              <article class="metric-card"><span>Total return</span><strong>{{ result.totalReturnFraction | percent: "1.2-2" }}</strong></article>
              <article class="metric-card"><span>Max drawdown</span><strong>{{ result.maxDrawdownFraction | percent: "1.2-2" }}</strong></article>
              <article class="metric-card"><span>Closed trades / bars</span><strong>{{ result.closedTrades ?? 0 }} / {{ result.bars ?? 0 }}</strong></article>
            </section>
            <section class="panel">
              <div class="panel-heading"><h3>Simulated trades</h3><span class="badge">{{ result.trades?.length ?? 0 }}</span></div>
              @if (result.trades?.length) {
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>Direction</th><th>Entry</th><th>Exit</th><th>Quantity</th><th>P&amp;L</th></tr></thead>
                    <tbody>
                      @for (trade of result.trades; track $index) {
                        <tr><td>{{ trade.direction ?? "—" }}</td><td>{{ trade.entryPrice | currency }}</td><td>{{ trade.exitPrice | currency }}</td><td>{{ trade.quantity ?? "—" }}</td><td>{{ trade.pnl | currency }}</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <p class="empty-state">The backtest returned no closed trades.</p>
              }
            </section>
          }
        }

        @if (view === "news") {
          <section class="page-heading"><div><p class="eyebrow">SENTIMENT</p><h2>News analysis</h2></div></section>
          <section class="panel">
            <form (ngSubmit)="analyzeNews()">
              <label>
                Headline
                <textarea name="headline" [(ngModel)]="headline" rows="4" required maxlength="1000" placeholder="Paste a market headline to analyze"></textarea>
              </label>
              <button class="button button-primary" type="submit" [disabled]="newsLoading || !headline.trim()">
                {{ newsLoading ? "Analyzing…" : "Analyze headline" }}
              </button>
            </form>
            @if (newsError) { <p class="error" role="alert">{{ newsError }}</p> }
          </section>
          @if (newsResult; as result) {
            <section class="panel">
              <p class="eyebrow">ANALYSIS RESULT</p>
              <h3>{{ result.sentiment ?? "Sentiment unavailable" }}</h3>
              <p>{{ result.headline }}</p>
              <p class="muted">Score: {{ result.score ?? "—" }} · Analyzed {{ result.analyzedAt | date: "medium" }}</p>
            </section>
          }
          <section class="panel">
            <div class="panel-heading">
              <div>
                <h3>Gold news signal</h3>
                <p class="muted">Compare an NFP or CPI actual value with its forecast.</p>
              </div>
            </div>
            <form class="inline-form" (ngSubmit)="analyzeGoldNewsSignal()">
              <label>
                Event
                <select name="goldEvent" [(ngModel)]="goldEvent">
                  <option value="NFP">NFP</option>
                  <option value="CPI">CPI</option>
                </select>
              </label>
              <label>
                Actual
                <input name="goldActual" type="number" step="any" [(ngModel)]="goldActual" required />
              </label>
              <label>
                Forecast
                <input name="goldForecast" type="number" step="any" [(ngModel)]="goldForecast" required />
              </label>
              <button class="button button-primary" type="submit" [disabled]="goldNewsLoading">
                {{ goldNewsLoading ? "Analyzing…" : "Generate gold signal" }}
              </button>
            </form>
            @if (goldNewsError) { <p class="error" role="alert">{{ goldNewsError }}</p> }
          </section>
          @if (goldNewsSignal; as result) {
            <section class="panel">
              <p class="eyebrow">GOLD NEWS SIGNAL</p>
              <h3>{{ result.asset ?? "Gold" }} · {{ result.direction ?? "—" }}</h3>
              <p>{{ result.rationale ?? "No rationale returned." }}</p>
              <p class="muted">
                {{ result.event ?? "Event" }} · Actual {{ result.actual ?? "—" }} · Forecast
                {{ result.forecast ?? "—" }} · Surprise {{ result.surprise ?? "—" }}
              </p>
              <p class="muted">Analyzed {{ result.analyzedAt | date: "medium" }}</p>
            </section>
          }
        }
      }
    </main>
  `,
})
export class AppComponent {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly trading = inject(TradingService);
  @ViewChild(DashboardComponent) private dashboard?: DashboardComponent;

  authenticated = false;
  username = "";
  password = "";

  view: View = "overview";
  readonly instruments = [
    { label: "Gold", symbol: "frxXAUUSD" },
    { label: "Step Index", symbol: "stpRNG" },
    { label: "Volatility 10 Index", symbol: "R_10" },
    { label: "Volatility 25 Index", symbol: "R_25" },
    { label: "Volatility 50 Index", symbol: "R_50" },
    { label: "Volatility 75 Index", symbol: "R_75" },
    { label: "Volatility 75 (1s)", symbol: "1HZ75V" },
  ];
  instrument = "frxXAUUSD";
  initialCapital: number | null = null;
  headline = "";
  goldEvent: GoldNewsEvent = "NFP";
  goldActual: number | null = null;
  goldForecast: number | null = null;

  trades: Trade[] = [];
  signals: Signal[] = [];
  candles: Candle[] = [];
  mt5Signal = "";
  evaluation: Evaluation | null = null;
  backtest: BacktestResult | null = null;
  newsResult: NewsSentiment | null = null;
  goldNewsSignal: GoldNewsSignal | null = null;

  tradesLoading = false;
  marketLoading = false;
  syncLoading = false;
  mt5SignalLoading = false;
  evaluationLoading = false;
  backtestLoading = false;
  newsLoading = false;
  goldNewsLoading = false;

  tradesError = "";
  marketError = "";
  syncError = "";
  mt5SignalError = "";
  evaluationError = "";
  backtestError = "";
  newsError = "";
  goldNewsError = "";

  login(): void {
    this.auth.setCredentials(this.username.trim(), this.password);
    this.authenticated = true;
    this.password = "";
    this.loadTrades();
  }

  logout(): void {
    this.auth.clearCredentials();
    this.authenticated = false;
    this.password = "";
    this.trades = [];
    this.signals = [];
    this.candles = [];
    this.mt5Signal = "";
    this.evaluation = null;
    this.backtest = null;
    this.newsResult = null;
    this.goldNewsSignal = null;
  }

  loadTrades(): void {
    this.tradesLoading = true;
    this.tradesError = "";
    this.trading.getTrades().subscribe({
      next: (trades) => {
        this.trades = trades;
        this.tradesLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.tradesError = this.errorMessage(error);
        this.tradesLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  loadMarketData(): void {
    const instrument = this.instrument.trim();
    if (!instrument) {
      this.marketError = "Enter an instrument to load market data.";
      return;
    }

    this.marketLoading = true;
    this.marketError = "";
    let pending = 2;
    const completed = (): void => {
      pending -= 1;
      if (pending === 0) {
        this.marketLoading = false;
      }
      this.changeDetector.markForCheck();
    };

    this.trading.getSignals(instrument).subscribe({
      next: (signals) => {
        this.signals = signals;
        completed();
      },
      error: (error: unknown) => {
        this.marketError = this.errorMessage(error);
        completed();
      },
    });
    this.trading.getCandles(instrument).subscribe({
      next: (candles) => {
        this.candles = candles;
        completed();
      },
      error: (error: unknown) => {
        this.marketError = this.errorMessage(error);
        completed();
      },
    });
  }

  syncMarketData(): void {
    const instrument = this.instrument.trim();
    if (!instrument) {
      this.syncError = "Enter an instrument before syncing candles.";
      return;
    }

    this.syncLoading = true;
    this.syncError = "";
    this.trading.syncCandles(instrument).subscribe({
      next: (candles) => {
        this.candles = candles;
        this.syncLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.syncError = this.errorMessage(error);
        this.syncLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  loadMt5Signal(): void {
    const instrument = this.instrument.trim();
    if (!instrument) {
      this.mt5SignalError = "Enter an instrument to load its MT5 signal.";
      return;
    }

    this.mt5SignalLoading = true;
    this.mt5SignalError = "";
    this.mt5Signal = "";
    this.trading.getMt5Signal(instrument).subscribe({
      next: (signal) => {
        this.mt5Signal = signal;
        this.mt5SignalLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.mt5SignalError = this.errorMessage(error);
        this.mt5SignalLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  evaluateStrategy(): void {
    const instrument = this.instrument.trim();
    if (!instrument) {
      this.evaluationError = "Enter an instrument before evaluating the strategy.";
      return;
    }

    this.evaluationLoading = true;
    this.evaluationError = "";
    this.evaluation = null;
    this.trading.evaluate(instrument).subscribe({
      next: (evaluation) => {
        this.evaluation = evaluation;
        this.evaluationLoading = false;
        this.dashboard?.refreshPortfolio();
        this.loadTrades();
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.evaluationError = this.errorMessage(error);
        this.evaluationLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  runBacktest(): void {
    const instrument = this.instrument.trim();
    if (!instrument) {
      this.backtestError = "Enter an instrument before running a backtest.";
      return;
    }

    const request: BacktestRequest = { instrument };
    if (this.initialCapital !== null) {
      request.initialCapital = this.initialCapital;
    }

    this.backtestLoading = true;
    this.backtestError = "";
    this.backtest = null;
    this.trading
      .syncCandles(instrument, BACKTEST_CANDLE_COUNT)
      .pipe(switchMap(() => this.trading.runBacktest(request)))
      .subscribe({
        next: (result) => {
          this.backtest = result;
          this.backtestLoading = false;
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.backtestError = this.errorMessage(error);
          this.backtestLoading = false;
          this.changeDetector.markForCheck();
        },
      });
  }

  analyzeNews(): void {
    const headline = this.headline.trim();
    if (!headline) {
      this.newsError = "Enter a headline to analyze.";
      return;
    }

    this.newsLoading = true;
    this.newsError = "";
    this.newsResult = null;
    this.trading.analyzeNews(headline).subscribe({
      next: (result) => {
        this.newsResult = result;
        this.newsLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.newsError = this.errorMessage(error);
        this.newsLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  analyzeGoldNewsSignal(): void {
    if (
      this.goldActual === null ||
      this.goldForecast === null ||
      !Number.isFinite(this.goldActual) ||
      !Number.isFinite(this.goldForecast)
    ) {
      this.goldNewsError = "Enter valid actual and forecast values.";
      return;
    }

    const request: GoldNewsRequest = {
      event: this.goldEvent,
      actual: this.goldActual,
      forecast: this.goldForecast,
    };
    this.goldNewsLoading = true;
    this.goldNewsError = "";
    this.goldNewsSignal = null;
    this.trading.analyzeGoldNewsSignal(request).subscribe({
      next: (signal) => {
        this.goldNewsSignal = signal;
        this.goldNewsLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.goldNewsError = this.errorMessage(error);
        this.goldNewsLoading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return "Could not reach the backend. Check that it is running at http://localhost:8070.";
      }
      if (error.status === 401) {
        return "The backend rejected these credentials. Check the username and password.";
      }
      if (
        typeof error.error === "object" &&
        error.error !== null &&
        "error" in error.error &&
        typeof error.error.error === "string"
      ) {
        return error.error.error;
      }
      return `Backend request failed (${error.status}): ${error.statusText || error.message}`;
    }
    return error instanceof Error ? error.message : "An unexpected error occurred.";
  }
}
