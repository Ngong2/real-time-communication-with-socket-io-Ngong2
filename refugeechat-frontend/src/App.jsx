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
            <Route path="/" element={
              <>
                <SignedOut>
                  <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 text-center text-slate-200">
                    <h2 className="text-3xl font-semibold text-white">
                      Welcome to AREL TECH CHAT
                    </h2>
                    <p className="mt-3 text-base text-slate-00">
                      Sign in to sync your Clerk profile and explore the static REST-based chat experience before we go live with Socket.IO.
                    </p>
                    <SignInButton mode="modal">
                      <Button size="lg" className="mt-6">
                        Sign in to continue
                      </Button>
                    </SignInButton>
                  </div>
                </SignedOut>
                <SignedIn>
                  <Navigate to="/dashboard" replace />
                </SignedIn>
              </>
            } />
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