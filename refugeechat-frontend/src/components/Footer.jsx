export default function Footer() {
  return (
    <footer className="border-t border-[#5bc0be]/20 bg-[#0b132b] py-6 mt-10">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-[#5bc0be] text-sm">
        <p className="text-center md:text-left">
          © {new Date().getFullYear()} AREL Tech Chat. All rights reserved.
        </p>
        <p className="mt-2 md:mt-0 text-center md:text-right">
          Built with{" "}
          <span className="text-[#6fffe9] animate-pulse">❤️</span> by{" "}
          <span className="text-[#6fffe9] font-semibold hover:text-[#5bc0be] transition-colors duration-200">
            AREL Students
          </span>
        </p>
      </div>
    </footer>
  );
}