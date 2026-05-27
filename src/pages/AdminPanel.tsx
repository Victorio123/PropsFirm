import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    // Strict typing checks and component flow would check if user is admin
    if (!token) navigate("/login");
    // Only fetch if admin mock
    fetchUsers();
  }, [token, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
         const data = await res.json();
         setUsers(data);
      } else {
         // unauthorized mock
         setUsers([{ email: "trader1@test.com", challenges: [] }]);
      }
    } catch {
       setUsers([{ email: "trader1@test.com", challenges: [] }]);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-8 font-sans">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border">
           <h1 className="text-2xl font-bold">System Administration</h1>
           <button onClick={() => navigate('/dashboard')} className="text-blue-500 font-bold hover:underline">Back to Dashboard</button>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border">
          <h2 className="text-lg font-bold mb-4">User Management</h2>
          <table className="w-full text-left">
            <thead>
               <tr className="border-b uppercase text-xs text-gray-500 bg-gray-50">
                  <th className="p-3">Email</th>
                  <th className="p-3">Active Accs</th>
                  <th className="p-3">Actions</th>
               </tr>
            </thead>
            <tbody>
               {users.map((u, i) => (
                 <tr key={i} className="border-b">
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.challenges?.length || 0}</td>
                    <td className="p-3"><button className="text-red-500 text-sm font-bold">Ban User</button></td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
