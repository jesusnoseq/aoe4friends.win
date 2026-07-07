import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Coins, Swords, FlaskConical, Gauge } from 'lucide-react';
import { type PlayerReview } from '../services/coach/engine';
import { type CoachTopic, type Finding, type Severity } from '../services/coach/findings';
import { formatGameTime, prettyName } from '../services/coach/context';

const TOPICS: Array<{ topic: CoachTopic; label: string; icon: React.ReactNode }> = [
  { topic: 'economy', label: 'Economy', icon: <Coins className="w-5 h-5 text-yellow-400" /> },
  { topic: 'military', label: 'Military', icon: <Swords className="w-5 h-5 text-red-400" /> },
  { topic: 'technology', label: 'Technology', icon: <FlaskConical className="w-5 h-5 text-purple-400" /> },
  { topic: 'general', label: 'General', icon: <Gauge className="w-5 h-5 text-blue-400" /> },
];

const SEVERITY_ICON: Record<Severity, React.ReactNode> = {
  critical: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
  warning: <AlertCircle className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />,
  info: <Info className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />,
};

function FindingRow({ finding }: { finding: Finding }) {
  return (
    <li className="flex items-start gap-2">
      {SEVERITY_ICON[finding.severity]}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-200">{finding.title}</p>
        <p className="text-xs text-gray-400">{finding.detail}</p>
        {finding.timestamps && finding.timestamps.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1">
            {finding.timestamps.map((t, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 text-[11px] font-mono">
                {formatGameTime(t)}
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}

interface Props {
  review: PlayerReview;
  highlight?: boolean; // the selected/current player
}

export default function CoachPlayerReview({ review, highlight }: Props) {
  const { player, findings, checksTotal, checksPassed } = review;
  const total = TOPICS.reduce((n, t) => n + findings[t.topic].length, 0);
  const won = player.result === 'win';
  const allPassed = checksPassed === checksTotal;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 shadow-xl border ${highlight ? 'border-blue-500/60' : 'border-gray-700/40'}`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-semibold text-white">{player.name}</span>
        <span className="text-xs text-gray-400">{prettyName(player.civilization)}</span>
        {player.result && (
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${won ? 'bg-green-900 text-green-300' : 'bg-red-900/70 text-red-300'}`}>
            {won ? 'Victory' : 'Defeat'}
          </span>
        )}
        <span
          className={`ml-auto px-2 py-0.5 rounded text-[11px] font-semibold ${allPassed ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}
          title="Coaching checks this player passed (a check passes when the rule found no issue)"
        >
          {checksPassed}/{checksTotal} checks pass
        </span>
        {player.apm !== undefined && (
          <span className="text-xs text-gray-500">{player.apm} APM</span>
        )}
      </div>

      {total === 0 ? (
        <p className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle2 className="w-4 h-4" /> No issues found. Well played!
        </p>
      ) : (
        <div className="space-y-3">
          {TOPICS.filter(t => findings[t.topic].length > 0).map(t => (
            <div key={t.topic}>
              <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-100 mb-2">
                {t.icon} {t.label}
              </h4>
              <ul className="space-y-2 pl-1">
                {findings[t.topic].map((f, i) => (
                  <FindingRow key={`${f.ruleId}-${i}`} finding={f} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
