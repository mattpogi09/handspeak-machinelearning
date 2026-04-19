import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <Loader2 
      size={size} 
      color={color} 
      className={`animate-spin ${className}`} 
      style={{ animation: 'spin 1s linear infinite' }}
    />
  );
}
