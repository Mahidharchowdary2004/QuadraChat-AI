import { useState } from "react";
import { Link } from "react-router-dom";
import TileGrid from "@/components/TileGrid";
import ChatInterface from "@/components/ChatInterface";
import NotificationPrompt from "@/components/NotificationPrompt";

const Index = () => {
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  return (
    <>
      {selectedTile ? (
        <ChatInterface tileId={selectedTile} onBack={() => setSelectedTile(null)} />
      ) : (
        <div className="min-h-screen flex flex-col">
          <div className="p-4">
            <Link 
              to="/proxy-chat" 
              className="inline-block mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Proxy Chat
            </Link>
          </div>
          <TileGrid onTileClick={setSelectedTile} />
        </div>
      )}
      <NotificationPrompt />
    </>
  );
};

export default Index;