import ChatLayout from "../components/ChatLayout";
import { useIsMobile } from "../hooks/use-mobile";

export default function Dashboard(props) {
  const isMobile = useIsMobile();
  const containerClass = isMobile
    ? "mx-auto flex h[calc(100vh-120px)] w-full max-w-full flex-col px-2 pb-4"
    : "mx-auto flex h-[calc(100vh-160px)] w-full max-w-6xl flex-col px-4 pb-8";

  return (
    <div className={containerClass}>
      <ChatLayout {...props} />
    </div>
  );
}
