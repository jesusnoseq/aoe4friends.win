import React from 'react';
import { Sparkles } from 'lucide-react';

function AICoach() {
  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700/40">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-blue-400" /> AI Coach (BETA)
      </h2>
      <p className="text-gray-400 text-center py-8">Coming soon.</p>
    </div>
  );
}

export default AICoach;