"use client";

import { useEffect, useState } from "react";

interface Stats {
  products: number;
  customers: number;
  orders: number;
  revenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, customers: 0, orders: 0, revenue: 0 });

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ]).then(([products, customers, orders]) => {
      const revenue = orders.reduce((sum: number, o: { total: number }) => sum + o.total, 0);
      setStats({ products: products.length, customers: customers.length, orders: orders.length, revenue });
    });
  }, []);

  const cards = [
    { label: "Products", value: stats.products, color: "bg-blue-500" },
    { label: "Customers", value: stats.customers, color: "bg-green-500" },
    { label: "Orders", value: stats.orders, color: "bg-yellow-500" },
    { label: "Revenue", value: `$${stats.revenue.toFixed(2)}`, color: "bg-purple-500" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-md p-6">
            <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center text-white text-xl mb-4`}>
              {card.label === "Products" && "📦"}
              {card.label === "Customers" && "👥"}
              {card.label === "Orders" && "🛒"}
              {card.label === "Revenue" && "💰"}
            </div>
            <h3 className="text-gray-500 text-sm">{card.label}</h3>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
