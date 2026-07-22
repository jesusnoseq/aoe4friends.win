import React from 'react';
import { sectionColor, type NickSectionRow } from '../services/queries';

interface Props {
  rows: NickSectionRow[];
  hashMap: Map<string, string>;
}

const NickSectionTable: React.FC<Props> = ({ rows, hashMap }) => {
  if (rows.length === 0) return <p className="text-gray-500 text-sm">No data for this range.</p>;

  return (
    <div className="overflow-x-auto max-h-80 overflow-y-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="py-2 pr-4">User</th>
            <th className="py-2 pr-4">Section</th>
            <th className="py-2 pr-4 text-right">Minutes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const label = hashMap.get(row.nick_hash) ?? row.nick_hash;
            const isKnown = hashMap.has(row.nick_hash);
            return (
              <tr key={`${row.nick_hash}-${row.section}-${i}`} className="border-b border-gray-800">
                <td className="py-1.5 pr-4 text-gray-200">
                  {isKnown ? label : <code className="text-gray-500">{label}</code>}
                </td>
                <td className="py-1.5 pr-4">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-gray-900"
                    style={{ backgroundColor: sectionColor(row.section) }}
                  >
                    {row.section}
                  </span>
                </td>
                <td className="py-1.5 pr-4 text-right text-gray-200">
                  {Math.round(Number(row.seconds) / 60)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default NickSectionTable;
