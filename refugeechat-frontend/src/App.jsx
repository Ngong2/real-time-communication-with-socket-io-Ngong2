import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser
} from "@clerk/clerk-react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { Button } from "./components/ui/button";
import Home from "./pages/Home";
import About from "./pages/About";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function App() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.username || user?.firstName || "Guest";
  const email = user?.primaryEmailAddress?.emailAddress || "";

  return (
    <Router>
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#5bc0be] via-[#5bc0be] to-[#6fffe9]">
        <Navbar />
        
        <main className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route
              path="/dashboard"
              element={
                <SignedIn>
                  <Dashboard
                    currentUserId={user?.id}
                    currentAvatar={user?.imageUrl}
                    currentName={displayName}
                    currentEmail={email}
                  />
                </SignedIn>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}