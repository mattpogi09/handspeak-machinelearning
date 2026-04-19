import React from 'react';
import { 
  Handshake, 
  Star, 
  MessageCircle, 
  Users, 
  Leaf, 
  Home, 
  Type, 
  BookOpen, 
  Target, 
  Puzzle, 
  Rocket, 
  Rainbow, 
  Lightbulb, 
  Palette, 
  Waves, 
  Map, // Fallback
  Fish
} from 'lucide-react';

const EMOJI_MAP = {
  '🤝': Handshake,
  '🌟': Star,
  '💬': MessageCircle,
  '👥': Users,
  '🌿': Leaf,
  '🏠': Home,
  '🔤': Type,
  '📚': BookOpen,
  '🎯': Target,
  '🧩': Puzzle,
  '🚀': Rocket,
  '🌈': Rainbow,
  '💡': Lightbulb,
  '🎨': Palette,
  '🌊': Waves,
  '🐠': Fish,
};

export default function EmojiIcon({ emoji, size = 24, color = 'currentColor', className = '' }) {
  const IconComponent = EMOJI_MAP[emoji] || Map;
  return <IconComponent size={size} color={color} className={className} />;
}
