import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

export default function Navbar() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || "Guest";

  return (
    <nav className="border-b border-[#5bc0be]/20 bg-[#0b132b] backdrop-blur-xl shadow-2xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        {/* Logo */}
        <Link 
          to="/" 
          className="text-xl font-bold bg-gradient-to-r from-[#5bc0be] to-[#6fffe9] bg-clip-text text-transparent hover:from-[#6fffe9] hover:to-[#5bc0be] transition-all duration-300"
        >
          AReLTech Chat
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-[#5bc0be]">
          <Link 
            to="/" 
            className="hover:text-[#6fffe9] transition-colors duration-200 font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#6fffe9] after:transition-all after:duration-300 hover:after:w-full"
          >
            Home
          </Link>
          <Link 
            to="/about" 
            className="hover:text-[#6fffe9] transition-colors duration-200 font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#6fffe9] after:transition-all after:duration-300 hover:after:w-full"
          >
            About
          </Link>
          <SignedIn>
            <Link 
              to="/dashboard" 
              className="hover:text-[#6fffe9] transition-colors duration-200 font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#6fffe9] after:transition-all after:duration-300 hover:after:w-full"
            >
              Dashboard
            </Link>
          </SignedIn>
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-[#5bc0be] hover:bg-[#6fffe9] text-[#0b132b] font-semibold border-none shadow-lg hover:shadow-[#5bc0be]/30 transition-all duration-200"
              >
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-3 rounded-full border border-[#5bc0be]/30 bg-[#1c2541] px-4 py-2 text-sm text-[#6fffe9] shadow-lg hover:shadow-[#5bc0be]/20 hover:border-[#5bc0be]/50 transition-all duration-200">
              <span className="font-medium">{displayName}</span>
              <div className="flex items-center">
                <div className="w-1 h-1 rounded-full bg-[#5bc0be] mx-2"></div>
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8 border-2 border-[#5bc0be]",
                    }
                  }}
                />
              </div>
            </div>
          </SignedIn>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-[#5bc0be]/10 bg-[#1c2541]">
        <div className="flex items-center justify-around py-3 px-4">
          <Link 
            to="/" 
            className="text-[#5bc0be] hover:text-[#6fffe9] transition-colors duration-200 text-sm font-medium"
          >
            Home
          </Link>
          <Link 
            to="/about" 
            className="text-[#5bc0be] hover:text-[#6fffe9] transition-colors duration-200 text-sm font-medium"
          >
            About
          </Link>
          <SignedIn>
            <Link 
              to="/dashboard" 
              className="text-[#5bc0be] hover:text-[#6fffe9] transition-colors duration-200 text-sm font-medium"
            >
              Dashboard
            </Link>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}