import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { createChart } from "lightweight-charts";
import { Activity, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export default function TradingRoom() {
  const { challengeId } = useParams();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  const [currentPrice, setCurrentPrice] = useState(0);
  const [lotSize, setLotSize] = useState(1);
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    if (!token) navigate("/login");
    
    // Setup Chart
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: '#151619' }, textColor: '#d1d4dc' },
      grid: { vertLines: { color: '#2B2B43' }, horzLines: { color: '#2B2B43' } },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
      wickUpColor: '#26a69a', wickDownColor: '#ef5350'
    });

    // Handle Resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);

    // Initial mock data
    const mockData = [];
    let time = Math.floor(Date.now() / 1000) - 3600;
    let price = 10000;
    for (let i = 0; i < 60; i++) {
       mockData.push({ time, open: price, high: price+10, low: price-10, close: price+5 });
       price += 5; time += 60;
    }
    candleSeries.setData(mockData);

    // Connect WS
    // If running deployed, APP_URL could be HTTPS, so we use wss://
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketURL = `${proto}//${window.location.host}`;
    const socket = new WebSocket(socketURL);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "subscribe_price", symbol: "R_100" }));
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "price_update") {
           setCurrentPrice(data.price);
           candleSeries.update({
             time: Math.floor(data.timestamp/1000) as any,
             open: data.price, high: data.price, low: data.price, close: data.price
           });
           
           // Update Floating PnL
           setPositions(prev => prev.map(p => {
             const isBuy = p.type === "BUY";
             const priceDiff = isBuy ? data.price - p.entryPrice : p.entryPrice - data.price;
             return { ...p, pnl: priceDiff * p.lotSize };
           }));
        }
      } catch (e) {
        console.error(e);
      }
    };

    setWs(socket);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      socket.close();
    };
  }, [token, navigate]);

  const executeTrade = async (type: 'BUY' | 'SELL') => {
    // API request to execute trade locally against user account
    try {
      const res = await fetch("/api/trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          challengeId, symbol: "R_100", type, lotSize: Number(lotSize),
          sl: sl ? Number(sl) : null, tp: tp ? Number(tp) : null, currentPrice
        })
      });
      const data = await res.json();
      if (data.success) {
        setPositions([...positions, data.trade]);
      } else {
        alert(data.error || "Trade failed");
      }
    } catch (e) {
      // Mock for UI preview
      const newPos = { id: Math.random().toString(), type, entryPrice: currentPrice, lotSize, sl, tp, pnl: 0 };
      setPositions([...positions, newPos]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0b0c10] text-[#c5c6c7] font-mono text-sm overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-gray-800 bg-[#151619] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Activity className="text-[#3b82f6]" />
          <span className="font-bold tracking-wider text-white">TRADING PLATFORM</span>
          <div className="px-3 py-1 bg-gray-800 rounded flex gap-2">
            <span>Vol 100 Index</span>
            <span className={currentPrice > 10000 ? "text-green-400" : "text-red-400"}>
              {currentPrice.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div className="flex flex-col"><span className="text-gray-500">BALANCE</span><span className="text-white">$10,000.00</span></div>
          <div className="flex flex-col"><span className="text-gray-500">EQUITY</span><span className="text-white">$10,000.00</span></div>
          <div className="flex flex-col"><span className="text-gray-500">MARGIN</span><span className="text-white">$0.00</span></div>
          <button onClick={() => navigate('/dashboard')} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300">Exit</button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart Area */}
        <div className="flex-1 flex flex-col relative border-r border-gray-800 p-1">
           <div ref={chartContainerRef} className="absolute inset-0"></div>
        </div>

        {/* Right Panel - Trading */}
        <div className="w-72 bg-[#151619] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="text-center font-bold text-white text-lg border-b border-gray-800 pb-2">ORDER ENTRY</div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Lot Size</label>
            <input 
              type="number" min="0.01" step="0.01" 
              className="bg-[#0b0c10] border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500" 
              value={lotSize} onChange={e => setLotSize(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Stop Loss</label>
            <input 
              type="number" step="0.01" 
              className="bg-[#0b0c10] border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500" 
              value={sl} onChange={e => setSl(e.target.value)} placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Take Profit</label>
            <input 
              type="number" step="0.01" 
              className="bg-[#0b0c10] border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500" 
              value={tp} onChange={e => setTp(e.target.value)} placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
             <button 
                onClick={() => executeTrade("SELL")}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded flex items-center justify-center gap-1">
                <ArrowDownCircle size={16} /> SELL
             </button>
             <button 
                onClick={() => executeTrade("BUY")}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded flex items-center justify-center gap-1">
                <ArrowUpCircle size={16} /> BUY
             </button>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Positions */}
      <div className="h-48 border-t border-gray-800 bg-[#151619] flex flex-col">
        <div className="text-xs font-bold text-gray-400 border-b border-gray-800 bg-[#0b0c10] px-4 py-2">OPEN POSITIONS</div>
        <div className="flex-1 overflow-y-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead className="text-[10px] uppercase text-gray-500 bg-[#151619] sticky top-0">
              <tr>
                <th className="px-4 py-2 font-normal">Ticket</th>
                <th className="px-4 py-2 font-normal">Type</th>
                <th className="px-4 py-2 font-normal">Size</th>
                <th className="px-4 py-2 font-normal">Symbol</th>
                <th className="px-4 py-2 font-normal">Entry</th>
                <th className="px-4 py-2 font-normal">S/L</th>
                <th className="px-4 py-2 font-normal">T/P</th>
                <th className="px-4 py-2 font-normal text-right">Profit</th>
                <th className="px-4 py-2 font-normal text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {positions.length === 0 && (
                <tr><td colSpan={9} className="text-center py-4 text-gray-600">No open positions.</td></tr>
              )}
              {positions.map((p, i) => (
                <tr key={p.id || i} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="px-4 py-1">{p.id || "#1002"}</td>
                  <td className={`px-4 py-1 font-bold ${p.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{p.type}</td>
                  <td className="px-4 py-1">{p.lotSize}</td>
                  <td className="px-4 py-1 font-bold">R_100</td>
                  <td className="px-4 py-1">{p.entryPrice.toFixed(2)}</td>
                  <td className="px-4 py-1">{p.sl || '-'}</td>
                  <td className="px-4 py-1">{p.tp || '-'}</td>
                  <td className="px-4 py-1 text-right font-bold text-blue-400">${p.pnl?.toFixed(2) || "0.00"}</td>
                  <td className="px-4 py-1 text-center">
                     <button className="text-[10px] text-gray-400 hover:text-white px-2 py-0 border border-gray-700 rounded">Close</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
