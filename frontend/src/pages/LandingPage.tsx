import { SignIn } from "@clerk/clerk-react";

const features = [
  {
    title: "Structured PR Templates",
    description:
      "Create pull requests with consistent, well-organized templates",
    icon: "📝",
  },
  {
    title: "Usage Analytics",
    description: "Track and analyze your team's PR workflow",
    icon: "📊",
  },
  {
    title: "Team Collaboration",
    description: "Streamline your team's code review process",
    icon: "👥",
  },
  {
    title: "GitHub Integration",
    description: "Seamlessly integrate with your GitHub workflow",
    icon: "🔄",
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <header className="border-b border-muted">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">GitHub PR Manager</h1>
        </div>
      </header>

      <main>
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Streamline Your Pull Request Workflow
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Create, manage, and track pull requests with powerful templates
                and analytics. Perfect for teams of all sizes.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="p-4 rounded-lg border border-muted"
                  >
                    <div className="text-3xl mb-2">{feature.icon}</div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:pl-12">
              <div className="card max-w-md mx-auto">
                <SignIn
                  appearance={{
                    elements: {
                      rootBox: "mx-auto w-full",
                      card: "bg-transparent shadow-none",
                      headerTitle: "text-foreground",
                      headerSubtitle: "text-muted-foreground",
                      socialButtonsBlockButton:
                        "bg-muted text-foreground hover:bg-muted/80",
                      formButtonPrimary:
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                      formFieldLabel: "text-foreground",
                      formFieldInput:
                        "bg-background border-muted text-foreground",
                      dividerLine: "bg-muted",
                      dividerText: "text-muted-foreground",
                      footerActionLink: "text-primary hover:text-primary/90",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-muted py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 GitHub PR Manager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
