import { RotateCcw } from 'lucide-react';

interface DateRangeSliderProps {
  totalSteps: number; // number of days in the domain
  value: [number, number]; // inclusive day indices, start <= end
  onChange: (v: [number, number]) => void;
  formatLabel: (idx: number) => string;
  onReset: () => void;
  isFiltered: boolean;
  summary?: string;
}

// Shared thumb styling for the two overlaid native range inputs. The inputs
// themselves are pointer-transparent so the one underneath stays clickable;
// only the thumbs receive pointer events.
const RANGE_INPUT_CLASS =
  'absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-4 appearance-none bg-transparent pointer-events-none ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-900 ' +
  '[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none ' +
  '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-gray-900 ' +
  '[&::-moz-range-thumb]:cursor-pointer ' +
  '[&::-moz-range-track]:bg-transparent focus:outline-none ' +
  '[&:focus-visible::-webkit-slider-thumb]:ring-2 [&:focus-visible::-webkit-slider-thumb]:ring-blue-300 ' +
  '[&:focus-visible::-moz-range-thumb]:ring-2 [&:focus-visible::-moz-range-thumb]:ring-blue-300';

export default function DateRangeSlider({
  totalSteps,
  value,
  onChange,
  formatLabel,
  onReset,
  isFiltered,
  summary,
}: DateRangeSliderProps) {
  const max = totalSteps - 1;
  const [start, end] = value;
  const startPct = (start / max) * 100;
  const endPct = (end / max) * 100;

  // When both thumbs sit in the same half, the top input's thumb could cover
  // the other's; keep the start thumb on top only while it lives in the right
  // half so whichever thumb is pinned to an edge stays reachable.
  const startOnTop = start > max / 2;

  return (
    <div>
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-700" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-blue-600"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={start}
          aria-label="Start date"
          aria-valuetext={formatLabel(start)}
          onChange={(e) => onChange([Math.min(Number(e.target.value), end), end])}
          className={`${RANGE_INPUT_CLASS} ${startOnTop ? 'z-20' : 'z-10'}`}
        />
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={end}
          aria-label="End date"
          aria-valuetext={formatLabel(end)}
          onChange={(e) => onChange([start, Math.max(Number(e.target.value), start)])}
          className={`${RANGE_INPUT_CLASS} ${startOnTop ? 'z-10' : 'z-20'}`}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-sm">
        <span className="font-semibold">{formatLabel(start)}</span>
        <span className="text-gray-400 flex items-center gap-3">
          {summary}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </span>
        <span className="font-semibold">{formatLabel(end)}</span>
      </div>
    </div>
  );
}
