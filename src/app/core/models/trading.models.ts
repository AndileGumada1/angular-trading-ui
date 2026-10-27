export type TradeDirection = "BUY" | "SELL" | "HOLD";
export type GoldNewsEvent = "NFP" | "CPI";

export interface GoldNewsRequest {
  event: GoldNewsEvent;
  actual: number;
  forecast: number;
}

export interface GoldNewsSignal {
  asset?: string;
  event?: GoldNewsEvent;
  actual?: number;
  forecast?: number;
  surprise?: number;
  direction?: TradeDirection;
  rationale?: string;
  analyzedAt?: string;
}

export interface Signal {
  id?: string;
  instrument?: string;
  direction?: TradeDirection;
  price?: number;
  reason?: string;
  createdAt?: string;
}

export interface RiskDecision {
  approved?: boolean;
  reason?: string;
  quantity?: number;
  riskBudget?: number;
  stakeAmount?: number;
}

export interface ExecutionResult {
  executed?: boolean;
  status?: string;
  message?: string;
  brokerReference?: string;
}

export interface Evaluation {
  signal?: Signal;
  risk?: RiskDecision;
  execution?: ExecutionResult;
}

export interface Candle {
  id?: string;
  instrument?: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestRequest {
  instrument: string;
  initialCapital?: number;
}

export interface BacktestTrade {
  direction?: TradeDirection;
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  pnl?: number;
}

export interface BacktestResult {
  instrument?: string;
  bars?: number;
  closedTrades?: number;
  initialCapital?: number;
  finalEquity?: number;
  totalReturnFraction?: number;
  maxDrawdownFraction?: number;
  trades?: BacktestTrade[];
}

export interface Trade {
  id?: string;
  signalId?: string;
  instrument?: string;
  direction?: TradeDirection;
  mode?: string;
  status?: string;
  entryPrice?: number;
  quantity?: number;
  exitPrice?: number;
  realizedPnl?: number;
  brokerReference?: string;
  createdAt?: string;
  closedAt?: string;
}

export interface PortfolioSummary {
  initialCapital?: number;
  balance?: number;
  equity?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;
  openTrades?: Trade[];
  demoRealizedPnl?: number;
  demoOpenContracts?: Trade[];
  asOf?: string;
}

export interface NewsSentiment {
  headline?: string;
  sentiment?: string;
  score?: number;
  analyzedAt?: string;
}
