"use client";

import { useEffect, useState } from "react";

interface Order {
  id: string;
  status: string;
  total: number;
  notes: string | null;
  createdAt: string;
  customer: { name: string };
  items: { product: { name: string }; quantity: number; price: number }[];
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = () => fetch("/api/orders").then((r) => r.json()).then(setOrders);

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{order.customer.name}</h3>
                <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                <div className="mt-2 space-y-1">
                  {order.items.map((item, i) => (
                    <p key={i} className="text-sm">
                      {item.product.name} x {item.quantity} = ${item.price * item.quantity}
                    </p>
                  ))}
                </div>
                {order.notes && <p className="text-sm text-gray-500 mt-2">Notes: {order.notes}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">${order.total.toFixed(2)}</p>
                <div className="mt-2">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || ""}`}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
