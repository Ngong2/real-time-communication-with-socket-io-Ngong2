import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { Button } from "../components/ui/button";

export default function Home() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || "Guest";

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-6 text-center text-slate-300">
      <h1 className="text-4xl font-bold text-white mb-5">Welcome to AReL Tech Chat</h1>
      <p className="max-w-2xl text-slate-700">
        A community-driven chat platform designed for AReL students and developers.  
        Connect, share ideas, and grow together in technology and innovation.
      </p>

      <SignedOut>
        <SignInButton mode="modal">
          <Button size="lg" className="mt-2">Sign in to Get Started</Button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <div className="mt-4 text-slate-700  #0b132b">
          <p>Hello, <span className="text-indigo-400 font-medium">{displayName}</span> 👋</p>
          <p className="mt-2">You can now access your <span className="text-indigo-400">Dashboard</span> to start chatting!</p>
        </div>
      </SignedIn>
    </div>
  );
}
