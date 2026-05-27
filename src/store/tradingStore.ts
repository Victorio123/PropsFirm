import { create } from 'zustand';

interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  lotSize: number;
}

interface TradingState {
  currentPrice: number;
  openTrades: Trade[];
  setPrice: (price: number) => void;
  setTrades: (trades: Trade[]) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  currentPrice: 0,
  openTrades: [],
  setPrice: (price) => set({ currentPrice: price }),
  setTrades: (trades) => set({ openTrades: trades }),
}));
