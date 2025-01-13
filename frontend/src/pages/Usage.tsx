import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface UsageMetrics {
  currentUsage: number;
  usageLimit: number;
  remainingUsage: number;
  usageByEndpoint: Record<string, number>;
  monthlyHistory: Record<string, number>;
}

const Usage = () => {
  const { user } = useUser();
  const [metrics, setMetrics] = useState<UsageMetrics>({
    currentUsage: 0,
    usageLimit: 0,
    remainingUsage: 0,
    usageByEndpoint: {},
    monthlyHistory: {},
  });

  useEffect(() => {
    // TODO: Fetch actual usage data from the API
    // This is mock data for demonstration
    setMetrics({
      currentUsage: 342,
      usageLimit: 500,
      remainingUsage: 158,
      usageByEndpoint: {
        "pull-requests/create": 156,
        "pull-requests/update": 98,
        "pull-requests/list": 88,
      },
      monthlyHistory: {
        "2024-01": 423,
        "2024-02": 342,
      },
    });
  }, []);

  const usagePercentage = (metrics.currentUsage / metrics.usageLimit) * 100;
  const endpointData = Object.entries(metrics.usageByEndpoint).map(
    ([endpoint, count]) => ({
      endpoint,
      count,
    })
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Usage & Limits</h1>
        <div className="text-sm text-muted-foreground">
          Current Plan: {user?.publicMetadata?.tier || "Free"}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Current Usage</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>{metrics.currentUsage} operations used</span>
              <span>{metrics.usageLimit} operations included</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {metrics.remainingUsage} operations remaining this month
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Usage by Endpoint</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={endpointData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="endpoint"
                stroke="#94a3b8"
                tick={{ fill: "#94a3b8" }}
              />
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#000000",
                  border: "1px solid #334155",
                }}
                labelStyle={{ color: "#ffffff" }}
              />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Plan Features</h2>
          <ul className="space-y-2">
            <li className="flex items-center text-sm">
              <span className="mr-2">✓</span>
              <span>Up to {metrics.usageLimit} operations per month</span>
            </li>
            <li className="flex items-center text-sm">
              <span className="mr-2">✓</span>
              <span>Advanced PR templates</span>
            </li>
            <li className="flex items-center text-sm">
              <span className="mr-2">✓</span>
              <span>Usage analytics</span>
            </li>
            <li className="flex items-center text-sm">
              <span className="mr-2">✓</span>
              <span>Email support</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Need More?</h2>
          <p className="text-muted-foreground mb-4">
            Upgrade your plan to get more operations and features.
          </p>
          <button
            className="btn-primary w-full"
            onClick={() => (window.location.href = "/pricing")}
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
};

export default Usage;
