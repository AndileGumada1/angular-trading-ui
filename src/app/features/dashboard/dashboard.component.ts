import { CurrencyPipe, DatePipe } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectorRef, Component, inject, OnInit } from "@angular/core";
import { PortfolioSummary } from "../../core/models/trading.models";
import { TradingService } from "../../core/services/trading.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  template: `
    <section class="page-heading">
      <div>
        <p class="eyebrow">ACCOUNT</p>
        <h2>Portfolio overview</h2>
      </div>
      <button
        class="button button-quiet"
        type="button"
        (click)="refreshPortfolio()"
        [disabled]="loading"
      >
        {{ loading ? "Refreshing…" : "Refresh" }}
      </button>
    </section>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    <section class="metric-grid">
      <article class="metric-card">
        <span>Equity</span>
        <strong>{{ portfolio?.equity | currency }}</strong>
      </article>
      <article class="metric-card">
        <span>Balance</span>
        <strong>{{ portfolio?.balance | currency }}</strong>
      </article>
      <article class="metric-card">
        <span>Realized P&amp;L</span>
        <strong
          [class.positive]="(portfolio?.realizedPnl ?? 0) >= 0"
          [class.negative]="(portfolio?.realizedPnl ?? 0) < 0"
        >
          {{ portfolio?.realizedPnl | currency }}
        </strong>
      </article>
      <article class="metric-card">
        <span>Unrealized P&amp;L</span>
        <strong
          [class.positive]="(portfolio?.unrealizedPnl ?? 0) >= 0"
          [class.negative]="(portfolio?.unrealizedPnl ?? 0) < 0"
        >
          {{ portfolio?.unrealizedPnl | currency }}
        </strong>
      </article>
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>Open positions</h3>
          <p class="muted">As of {{ portfolio?.asOf | date: "medium" }}</p>
        </div>
        <span class="badge">{{ portfolio?.openTrades?.length ?? 0 }} open</span>
      </div>
      @if (loading && !portfolio) {
        <p class="empty-state">Loading portfolio from the backend…</p>
      } @else if ((portfolio?.openTrades?.length ?? 0) > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Direction</th>
                <th>Quantity</th>
                <th>Entry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (trade of portfolio?.openTrades ?? []; track trade.id ?? $index) {
                <tr>
                  <td>{{ trade.instrument ?? "—" }}</td>
                  <td>{{ trade.direction ?? "—" }}</td>
                  <td>{{ trade.quantity ?? "—" }}</td>
                  <td>{{ trade.entryPrice | currency }}</td>
                  <td>{{ trade.status ?? "—" }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!loading && !error) {
        <p class="empty-state">No open positions reported by the API.</p>
      }
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>Demo account</h3>
          <p class="muted">
            Realized P&amp;L:
            <strong
              [class.positive]="(portfolio?.demoRealizedPnl ?? 0) >= 0"
              [class.negative]="(portfolio?.demoRealizedPnl ?? 0) < 0"
            >
              {{ portfolio?.demoRealizedPnl | currency }}
            </strong>
          </p>
        </div>
        <span class="badge">
          {{ portfolio?.demoOpenContracts?.length ?? 0 }} open contracts
        </span>
      </div>
      @if ((portfolio?.demoOpenContracts?.length ?? 0) > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Direction</th>
                <th>Quantity</th>
                <th>Entry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (
                trade of portfolio?.demoOpenContracts ?? [];
                track trade.id ?? $index
              ) {
                <tr>
                  <td>{{ trade.instrument ?? "—" }}</td>
                  <td>{{ trade.direction ?? "—" }}</td>
                  <td>{{ trade.quantity ?? "—" }}</td>
                  <td>{{ trade.entryPrice | currency }}</td>
                  <td>{{ trade.status ?? "—" }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!loading && !error) {
        <p class="empty-state">No open demo contracts reported by the API.</p>
      }
    </section>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly trading = inject(TradingService);

  portfolio: PortfolioSummary | null = null;
  loading = false;
  error = "";

  ngOnInit(): void {
    this.refreshPortfolio();
  }

  refreshPortfolio(): void {
    this.loading = true;
    this.error = "";
    this.trading.getPortfolio().subscribe({
      next: (portfolio) => {
        this.portfolio = portfolio;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.error = this.errorMessage(error);
        this.loading = false;
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
