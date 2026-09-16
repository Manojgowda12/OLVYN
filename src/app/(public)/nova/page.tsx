import { Metadata } from "next";
import { NovaChatView } from "./nova-chat-view";

export const metadata: Metadata = {
  title: "Nova AI — Live Intelligent Learning Companion",
  description:
    "Chat with Nova AI, your dedicated learning assistant grounded in our live curriculum database. Get course recommendations, study roadmaps, and coding explanations.",
};

export default function NovaPage() {
  return (
    <div className="min-h-screen bg-[#f6f8f5]">
      <NovaChatView />
    </div>
  );
}
