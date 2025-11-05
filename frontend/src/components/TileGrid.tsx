import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

interface TileGridProps {
  onTileClick: (tileId: string) => void;
}

const tiles = [
  { id: "1", label: "Chat 1", gradient: "from-[hsl(var(--tile-1))] to-[hsl(var(--tile-1)_/_0.8)]" },
  { id: "2", label: "Chat 2", gradient: "from-[hsl(var(--tile-2))] to-[hsl(var(--tile-2)_/_0.8)]" },
  { id: "3", label: "Chat 3", gradient: "from-[hsl(var(--tile-3))] to-[hsl(var(--tile-3)_/_0.8)]" },
  { id: "4", label: "Chat 4", gradient: "from-[hsl(var(--tile-4))] to-[hsl(var(--tile-4)_/_0.8)]" },
];

const TileGrid = ({ onTileClick }: TileGridProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted/30">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Multi-Tile Chat POC
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">Select a chat to get started</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6 max-w-4xl w-full">
        {tiles.map((tile, index) => (
          <motion.div
            key={tile.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onTileClick(tile.id)}
            className={`
              relative overflow-hidden rounded-2xl cursor-pointer
              bg-gradient-to-br ${tile.gradient}
              shadow-lg hover:shadow-xl
              transition-all duration-300
              aspect-square flex flex-col items-center justify-center
              text-white p-6
            `}
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="mb-4"
            >
              <MessageSquare size={40} strokeWidth={2} />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold">{tile.label}</h2>
            <p className="text-white/90 mt-2 text-sm">Click to open conversation</p>
            
            {/* Decorative elements */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TileGrid;