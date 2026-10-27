import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import {
  BacktestRequest,
  BacktestResult,
  Candle,
  Evaluation,
  GoldNewsRequest,
  GoldNewsSignal,
  NewsSentiment,
  PortfolioSummary,
  Signal,
  Trade,
} from "../models/trading.models";

@Injectable({ providedIn: "root" })
export class TradingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getPortfolio(): Observable<PortfolioSummary> {
    return this.http.get<PortfolioSummary>(`${this.apiUrl}/portfolio`);
  }

  getTrades(): Observable<Trade[]> {
    return this.http.get<Trade[]>(`${this.apiUrl}/trades`);
  }

  getSignals(instrument: string): Observable<Signal[]> {
    return this.http.get<Signal[]>(
      `${this.apiUrl}/signals/${encodeURIComponent(instrument)}`,
    );
  }

  getMt5Signal(instrument: string): Observable<string> {
    return this.http.get(
      `${this.apiUrl}/mt5/signal/${encodeURIComponent(instrument)}`,
      { responseType: "text" },
    );
  }

  getCandles(instrument: string): Observable<Candle[]> {
    return this.http.get<Candle[]>(
      `${this.apiUrl}/market/${encodeURIComponent(instrument)}/candles`,
    );
  }

  syncCandles(
    instrument: string,
    limit = 200,
    intervalSeconds = 60,
  ): Observable<Candle[]> {
    const params = new HttpParams()
      .set("count", limit)
      .set("granularitySeconds", intervalSeconds);
    return this.http.post<Candle[]>(
      `${this.apiUrl}/market/${encodeURIComponent(instrument)}/sync`,
      null,
      { params },
    );
  }

  ingestCandles(instrument: string, candles: Candle[]): Observable<Candle[]> {
    return this.http.post<Candle[]>(
      `${this.apiUrl}/market/${encodeURIComponent(instrument)}/candles`,
      candles,
    );
  }

  evaluate(instrument: string): Observable<Evaluation> {
    return this.http.post<Evaluation>(
      `${this.apiUrl}/trading/${encodeURIComponent(instrument)}/evaluate`,
      null,
    );
  }

  runBacktest(request: BacktestRequest): Observable<BacktestResult> {
    return this.http.post<BacktestResult>(`${this.apiUrl}/backtest`, request);
  }

  analyzeNews(headline: string): Observable<NewsSentiment> {
    return this.http.post<NewsSentiment>(`${this.apiUrl}/news/analyze`, {
      headline,
    });
  }

  analyzeGoldNewsSignal(request: GoldNewsRequest): Observable<GoldNewsSignal> {
    return this.http.post<GoldNewsSignal>(
      `${this.apiUrl}/news/gold-signal`,
      request,
    );
  }
}
