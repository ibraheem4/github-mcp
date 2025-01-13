import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";

interface GitHubRepo {
  name: string;
  full_name: string;
  private: boolean;
  connected: boolean;
}

const Settings = () => {
  const { user } = useUser();
  const [repositories, setRepositories] = useState<GitHubRepo[]>([
    // Mock data - replace with actual GitHub API call
    {
      name: "project-a",
      full_name: "user/project-a",
      private: false,
      connected: true,
    },
    {
      name: "project-b",
      full_name: "user/project-b",
      private: true,
      connected: false,
    },
  ]);

  const [notifications, setNotifications] = useState({
    prCreated: true,
    prUpdated: true,
    prMerged: true,
    mentions: true,
    weeklyDigest: false,
  });

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRepositoryToggle = (repoName: string) => {
    setRepositories((prev) =>
      prev.map((repo) =>
        repo.name === repoName ? { ...repo, connected: !repo.connected } : repo
      )
    );
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs.Root defaultValue="repositories" className="space-y-6">
        <Tabs.List className="flex space-x-4 border-b border-muted">
          <Tabs.Trigger
            value="repositories"
            className="px-4 py-2 text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Repositories
          </Tabs.Trigger>
          <Tabs.Trigger
            value="notifications"
            className="px-4 py-2 text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            Notifications
          </Tabs.Trigger>
          <Tabs.Trigger
            value="api"
            className="px-4 py-2 text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            API Access
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="repositories" className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Connected Repositories</h2>
            <div className="space-y-4">
              {repositories.map((repo) => (
                <div
                  key={repo.name}
                  className="flex items-center justify-between p-4 border border-muted rounded-lg"
                >
                  <div>
                    <div className="font-medium">{repo.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {repo.private ? "Private" : "Public"}
                    </div>
                  </div>
                  <button
                    className={`btn ${
                      repo.connected ? "btn-secondary" : "btn-primary"
                    }`}
                    onClick={() => handleRepositoryToggle(repo.name)}
                  >
                    {repo.connected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-primary">Connect New Repository</button>
        </Tabs.Content>

        <Tabs.Content value="notifications" className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Email Notifications</h2>
            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <div className="font-medium">
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Receive notifications when{" "}
                      {key === "prCreated"
                        ? "new pull requests are created"
                        : key === "prUpdated"
                        ? "pull requests are updated"
                        : key === "prMerged"
                        ? "pull requests are merged"
                        : key === "mentions"
                        ? "you are mentioned in comments"
                        : "we send weekly summaries"}
                    </div>
                  </div>
                  <button
                    className={`w-12 h-6 rounded-full transition-colors ${
                      value ? "bg-primary" : "bg-muted"
                    }`}
                    onClick={() =>
                      handleNotificationChange(
                        key as keyof typeof notifications
                      )
                    }
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        value ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="api" className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">API Keys</h2>
            <p className="text-muted-foreground mb-4">
              Generate API keys to access the GitHub PR Manager API
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-muted rounded-lg">
                <div>
                  <div className="font-medium">Production Key</div>
                  <div className="text-sm text-muted-foreground">
                    Last used: 2 hours ago
                  </div>
                </div>
                <button className="btn-secondary">Regenerate</button>
              </div>
              <div className="flex items-center justify-between p-4 border border-muted rounded-lg">
                <div>
                  <div className="font-medium">Development Key</div>
                  <div className="text-sm text-muted-foreground">
                    Last used: 5 days ago
                  </div>
                </div>
                <button className="btn-secondary">Regenerate</button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">Webhooks</h2>
            <p className="text-muted-foreground mb-4">
              Configure webhooks to receive real-time updates
            </p>
            <button className="btn-primary">Add Webhook</button>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default Settings;
