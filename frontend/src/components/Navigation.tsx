import { UserButton } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: "📊" },
    { path: "/usage", label: "Usage", icon: "📈" },
    { path: "/pricing", label: "Pricing", icon: "💳" },
    { path: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav className="w-64 border-r border-muted bg-background p-4">
      <div className="flex flex-col h-full">
        <div className="mb-8">
          <h1 className="text-xl font-bold">GitHub PR Manager</h1>
        </div>

        <div className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-auto pt-8 border-t border-muted">
          <div className="flex items-center space-x-4 px-4">
            <UserButton afterSignOutUrl="/" />
            <div className="text-sm text-muted-foreground">
              <span>Account</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
