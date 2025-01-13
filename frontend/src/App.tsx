import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import Usage from "./pages/Usage";
import Settings from "./pages/Settings";
import LandingPage from "./pages/LandingPage";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Clerk Publishable Key");
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Router>
        <div className="min-h-screen">
          <SignedIn>
            <div className="flex h-screen">
              <Navigation />
              <main className="flex-1 overflow-y-auto p-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/usage" element={<Usage />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </div>
          </SignedIn>
          <SignedOut>
            <Routes>
              <Route path="/*" element={<LandingPage />} />
            </Routes>
          </SignedOut>
        </div>
      </Router>
    </ClerkProvider>
  );
}

export default App;
