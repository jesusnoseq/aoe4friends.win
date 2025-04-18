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
  allies: AllyOpponent[];
}

interface AlliesTableProps {
  stats: GameStats | null;
  tableSort: {
    table: 'allies' | 'opponents';
    column: string;
    direction: 'asc' | 'desc';
  };
  setTableSort: React.Dispatch<React.SetStateAction<any>>;
  getSorted: (list: AllyOpponent[], column: string, direction: string) => AllyOpponent[];
}

const AlliesTable: React.FC<AlliesTableProps> = ({ stats, tableSort, setTableSort, getSorted }) => {
  const list = stats?.allies || [];
  const sortedList =
    tableSort.table === 'allies'
      ? getSorted(list, tableSort.column, tableSort.direction)
      : [...list].sort((a, b) => b.Stat.games - a.Stat.games);
  return (
    <div className="bg-gray-700 rounded-lg p-4 shadow">
      <h3 className="text-lg font-semibold mb-4">Top 20 Team Mates</h3>
      {list.length === 0 ? (
        <p className="text-gray-400">No team‐mate data available.</p>
      ) : (
        <table className="w-full text-left text-sm border-separate border-spacing-y-1">
          <thead>
            <tr className="bg-gray-800">
              <th className="py-2 px-3 rounded-l-lg">#</th>
              <SortableTh label="Name" column="name" table="allies" tableSort={tableSort} setTableSort={setTableSort} />
              <SortableTh label="Games" column="games" table="allies" tableSort={tableSort} setTableSort={setTableSort} />
              <SortableTh label="Wins" column="wins" table="allies" tableSort={tableSort} setTableSort={setTableSort} />
              <SortableTh label="Losses" column="losses" table="allies" tableSort={tableSort} setTableSort={setTableSort} />
              <SortableTh label="Win Rate" column="winrate" table="allies" tableSort={tableSort} setTableSort={setTableSort} />
            </tr>
          </thead>
          <tbody>
            {sortedList
              .slice(0, 20)
              .map((ally, idx) => (
                <tr key={ally.Name + idx}
                    className={`hover:bg-gray-600 transition ${idx % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}>
                  <td className="py-2 px-3 font-bold text-blue-300">{idx + 1}</td>
                  <td className="py-2 px-3 break-all">{ally.Name}</td>
                  <td className="py-2 px-3">{ally.Stat.games}</td>
                  <td className="py-2 px-3 text-green-400">{ally.Stat.wins}</td>
                  <td className="py-2 px-3 text-red-400">{ally.Stat.losses}</td>
                  <td className="py-2 px-3 font-semibold">
                    {ally.Stat.games > 0 ? Math.round((ally.Stat.wins / ally.Stat.games) * 100) : 0}%
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AlliesTable;
