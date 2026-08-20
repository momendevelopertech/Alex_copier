"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Printer } from "lucide-react";

const testAccounts = [
  { name: "Omar Hassan", email: "omar@alexandria-copier.com", password: "password123", role: "GENERAL_MANAGER" },
  { name: "Sarah Company Manager", email: "sarah@jmal-ahlat.com", password: "password123", role: "COMPANY_MANAGER" },
  { name: "Ahmed Accountant", email: "ahmed@alexandria-copier.com", password: "password123", role: "ACCOUNTANT" },
  { name: "Mohamed Maintenance", email: "mohamed@alexandria-copier.com", password: "password123", role: "MAINTENANCE_MANAGER" },
  { name: "Ali Workshop", email: "ali@alexandria-copier.com", password: "password123", role: "WORKSHOP_MANAGER" },
  { name: "Khaled Engineer", email: "khaled@alexandria-copier.com", password: "password123", role: "ENGINEER" },
  { name: "Fatma Sales", email: "fatma@alexandria-copier.com", password: "password123", role: "SALES_EMPLOYEE" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      window.location.href = "/";
    }

    setLoading(false);
  };

  const handleTestLogin = async (testEmail: string, testPassword: string) => {
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: testEmail,
      password: testPassword,
      redirect: false,
    });

    if (result?.error) {
      setError("Login failed for test account");
    } else {
      window.location.href = "/";
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Printer size={32} className="text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Alexandria Copier ERP</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {process.env.NEXT_PUBLIC_SHOW_TEST_ACCOUNTS === "true" && (
          <div className="mt-8 bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Test Accounts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {testAccounts.map((account) => (
                    <tr key={account.email} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{account.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{account.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{account.password}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {account.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTestLogin(account.email, account.password)}
                          disabled={loading}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Login as
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
