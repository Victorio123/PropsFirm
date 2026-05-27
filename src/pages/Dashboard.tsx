import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { LogOut, Activity, AlertCircle } from "lucide-react";

interface Challenge {
  id: string;
  type: string;
  status: string;
  currentBalance: number;
}

export default function Dashboard() {
  const { user, logout, token } = useAuthStore();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchChallenges();
  }, [user, navigate]);

  const fetchChallenges = async () => {
    try {
      const res = await fetch("/api/trading/challenges", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges(data);
      }
    } catch {
      // Mock for UI preview if backend unreachable
      setChallenges([
        { id: "mock-1", type: "10000", status: "ACTIVE", currentBalance: 10050 },
        { id: "mock-2", type: "50000", status: "FAILED", currentBalance: 42000 }
      ]);
    }
  };

  const buyChallenge = async (type: string, amount: number) => {
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type, amount })
      });
      const data = await res.json();
      if (data.status === "PENDING_PAYMENT") {
         alert("Payment initialized! (Simulated)");
         fetchChallenges();
      }
    } catch (e) {
      alert("Error initializing payment via API, UI mocking not sufficient here");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-xl font-bold flex items-center gap-2 text-blue-900">
            <Activity className="text-blue-600" /> Proprietary Firm
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{user?.email}</span>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="text-gray-500 hover:text-gray-900"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold mb-4">Your Challenges</h2>
            <div className="grid gap-4">
              {challenges.length === 0 && <p className="text-gray-500">No active challenges.</p>}
              {challenges.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-xl border flex justify-between shadow-sm items-center">
                  <div>
                    <h3 className="font-bold text-lg">${parseInt(c.type).toLocaleString()} Challenge</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium uppercase
                        ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          c.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100'} `}>
                        {c.status}
                      </span>
                      <span className="text-sm text-gray-500 font-mono">Bal: ${c.currentBalance.toFixed(2)}</span>
                    </div>
                  </div>
                  {c.status === "ACTIVE" && (
                    <button
                      onClick={() => navigate(`/trade/${c.id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Open Trading Room
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">New Challenge</h2>
            <div className="space-y-4">
              {[
                { size: 5000, price: 30 },
                { size: 10000, price: 70 },
                { size: 25000, price: 150 },
                { size: 50000, price: 300 },
                { size: 100000, price: 500 }
              ].map(opt => (
                <div key={opt.size} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div className="font-bold text-lg">${opt.size.toLocaleString()}</div>
                  <button
                    onClick={() => buyChallenge(opt.size.toString(), opt.price)}
                    className="px-4 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-bold"
                  >
                    Buy ${opt.price}
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800">
              <h4 className="font-bold flex items-center gap-2 mb-2"><AlertCircle size={16}/> Rules</h4>
              <ul className="text-sm space-y-1 list-disc pl-4">
                <li>Daily Drawdown limit: 5%</li>
                <li>Max Drawdown limit: 10%</li>
                <li>Profit Target: 10%</li>
                <li>Violations result in immediate failure</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
