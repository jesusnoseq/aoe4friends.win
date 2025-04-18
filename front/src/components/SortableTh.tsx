import React from 'react';

interface SortableThProps {
  label: string;
  column: string;
  table: 'allies' | 'opponents';
  tableSort: {
    table: 'allies' | 'opponents';
    column: string;
    direction: 'asc' | 'desc';
  };
  setTableSort: React.Dispatch<React.SetStateAction<{
    table: 'allies' | 'opponents';
    column: string;
    direction: 'asc' | 'desc';
  }>>;
}

const SortableTh: React.FC<SortableThProps> = ({ label, column, table, tableSort, setTableSort }) => {
  const active = tableSort.table === table && tableSort.column === column;
  return (
    <th
      className="py-2 px-3 cursor-pointer select-none"
      onClick={() => {
        setTableSort(prev => {
          if (prev.table === table && prev.column === column) {
            return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
          }
          return { table, column, direction: 'desc' };
        });
      }}
    >
      {label}
      {active && (
        <span className="ml-1">{tableSort.direction === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  );
};

export default SortableTh;
