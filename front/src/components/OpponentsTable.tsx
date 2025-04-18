import React from 'react';
import SortableTh from './SortableTh';

interface AllyOpponent {
  Name: string;
  Stat: {
    games: number;
    wins: number;
    losses: number;
  };
}

interface GameStats {
  opponents: AllyOpponent[];
}

interface OpponentsTableProps {
  stats: GameStats | null;
  tableSort: {
    table: 'allies' | 'opponents';
    column: string;
    direction: 'asc' | 'desc';
  };
  setTableSort: React.Dispatch<React.SetStateAction<any>>;
  getSorted: (list: AllyOpponent[], column: string, direction: string) => AllyOpponent[];
}

const OpponentsTable: React.FC<OpponentsTableProps> = ({ stats, tableSort, setTableSort, getSorted }) => {
  if (!stats || !stats.opponents || stats.opponents.length === 0) return null;
  const list = stats.opponents;
  const sortedList =
    tableSort.table === 'opponents'
      ? getSorted(list, tableSort.column, tableSort.direction)
      : [...list].sort((a, b) => b.Stat.games - a.Stat.games);
  return (
    <div className="bg-gray-700 rounded-lg p-4 shadow">
      <h3 className="text-lg font-semibold mb-4">Top 20 Enemies</h3>
      <table className="w-full text-left text-sm border-separate border-spacing-y-1">
        <thead>
          <tr className="bg-gray-800">
            <th className="py-2 px-3 rounded-l-lg">#</th>
            <SortableTh label="Name" column="name" table="opponents" tableSort={tableSort} setTableSort={setTableSort} />
            <SortableTh label="Games" column="games" table="opponents" tableSort={tableSort} setTableSort={setTableSort} />
            <SortableTh label="Wins" column="wins" table="opponents" tableSort={tableSort} setTableSort={setTableSort} />
            <SortableTh label="Losses" column="losses" table="opponents" tableSort={tableSort} setTableSort={setTableSort} />
            <SortableTh label="Win Rate" column="winrate" table="opponents" tableSort={tableSort} setTableSort={setTableSort} />
          </tr>
        </thead>
        <tbody>
          {sortedList
            .slice(0, 20)
            .map((op, idx) => (
              <tr
                key={op.Name}
                className={`hover:bg-gray-600 transition ${idx % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}
              >
                <td className="py-2 px-3 font-bold text-blue-300">{idx + 1}</td>
                <td className="py-2 px-3 break-all">{op.Name}</td>
                <td className="py-2 px-3">{op.Stat.games}</td>
                <td className="py-2 px-3 text-green-400">{op.Stat.wins}</td>
                <td className="py-2 px-3 text-red-400">{op.Stat.losses}</td>
                <td className="py-2 px-3 font-semibold">
                  {op.Stat.games > 0 ? Math.round((op.Stat.wins / op.Stat.games) * 100) : 0}%
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OpponentsTable;
