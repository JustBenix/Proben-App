
import React, { useState } from 'react';
import { Info, ChevronUp } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  expandedContent?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, expandedContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 relative ${onClick ? 'cursor-pointer hover:shadow-2xl hover:border-indigo-500/30 hover:scale-[1.01] active:scale-[0.99]' : ''} ${className}`}
    >
      <div className="relative">
        {children}
        
        {expandedContent && (
          <button 
            onClick={toggleExpansion}
            className={`absolute top-4 right-4 p-2 rounded-xl transition-all z-20 ${
              isExpanded 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40' 
                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isExpanded ? "Details schließen" : "Details anzeigen"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </button>
        )}
      </div>

      {expandedContent && (
        <div 
          className={`transition-all duration-500 ease-in-out overflow-hidden border-indigo-500/10 ${
            isExpanded 
              ? 'max-h-[500px] opacity-100 border-t p-6 bg-slate-950/30' 
              : 'max-h-0 opacity-0'
          }`}
        >
          <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            {expandedContent}
          </div>
        </div>
      )}
    </div>
  );
};
