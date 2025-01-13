import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PRMetrics {
  totalPRs: number;
  openPRs: number;
  avgTimeToMerge: string;
  mergeRate: number;
}

interface ActivityData {
  date: string;
  prs: number;
}

const Dashboard = () => {
  const { user } = useUser();
  const [metrics, setMetrics] = useState<PRMetrics>({
    totalPRs: 0,
    openPRs: 0,
    avgTimeToMerge: "0h",
    mergeRate: 0,
  });
  const [activityData, setActivityData] = useState<ActivityData[]>([]);

  useEffect(() => {
    // TODO: Fetch actual data from the API
    // This is mock data for demonstration
    setMetrics({
      totalPRs: 156,
      openPRs: 8,
      avgTimeToMerge: "4h 23m",
      mergeRate: 92,
    });

    const mockActivityData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      prs: Math.floor(Math.random() * 10),
    })).reverse();

    setActivityData(mockActivityData);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.firstName || "User"}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium mb-2">Total PRs</h3>
          <p className="text-3xl font-bold">{metrics.totalPRs}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium mb-2">Open PRs</h3>
          <p className="text-3xl font-bold">{metrics.openPRs}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium mb-2">Avg. Time to Merge</h3>
          <p className="text-3xl font-bold">{metrics.avgTimeToMerge}</p>
        </div>
        <div className="card">
          <h3 className="text-lg font-medium mb-2">Merge Rate</h3>
          <p className="text-3xl font-bold">{metrics.mergeRate}%</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">PR Activity</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
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
              <Line
                type="monotone"
                dataKey="prs"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {/* TODO: Replace with actual activity data */}
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-muted-foreground">2h ago</span>
            <span>Merged PR: Add new feature</span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-muted-foreground">4h ago</span>
            <span>Created PR: Fix bug in production</span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-muted-foreground">Yesterday</span>
            <span>Updated PR: Implement user feedback</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
