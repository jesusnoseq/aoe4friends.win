import React from 'react';
import { Sparkles } from 'lucide-react';

function AICoach() {
  return (
    <div className="card-pad">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-parchment-100">
        <Sparkles className="w-6 h-6 text-gold-400" /> AI Coach (BETA)
      </h2>
      <p className="text-steel-400 text-center py-8">Coming soon.</p>
    </div>
  );
}

export default AICoach;