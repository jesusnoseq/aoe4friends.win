import React, { useEffect, useMemo, useState } from 'react';
import { runQuery } from './services/analyticsApi';
import {
  timePerSectionPerDay,
  visitsPerSectionPerDay,
  distinctUsersPerWeek,
  timePerNickPerSection,
  visitsByCountry,
  eventTypeCounts,
  type DayRange,
  type SectionDayRow,
  type VisitsDayRow,
  type WeekUsersRow,
  type NickSectionRow,
  type CountryRow,
  type EventTypeRow,
} from './services/queries';
import { loadFriends, saveFriends, buildHashMap } from './services/friendsStore';
import ChartCard from './components/ChartCard';
import DateRangeSelector from './components/DateRangeSelector';
import FriendLabels from './components/FriendLabels';
import SectionTimeChart from './components/SectionTimeChart';
import SectionVisitsChart from './components/SectionVisitsChart';
import WeeklyUsersChart from './components/WeeklyUsersChart';
import NickSectionTable from './components/NickSectionTable';
import CountryChart from './components/CountryChart';
import EventTypeTiles from './components/EventTypeTiles';

interface QueryState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

function useQuery<T>(sql: string): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ data: [], loading: true, error: null });

    runQuery<T>(sql)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setState({ data: [], loading: false, error: message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sql]);

  return state;
}

const App: React.FC = () => {
  const [range, setRange] = useState<DayRange>(30);
  const [friends, setFriends] = useState<string[]>(() => loadFriends());
  const [hashMap, setHashMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    saveFriends(friends);
    buildHashMap(friends).then(setHashMap);
  }, [friends]);

  const sectionTimeSql = useMemo(() => timePerSectionPerDay(range), [range]);
  const visitsSql = useMemo(() => visitsPerSectionPerDay(range), [range]);
  const weeklyUsersSql = useMemo(() => distinctUsersPerWeek(), []);
  const nickSectionSql = useMemo(() => timePerNickPerSection(range), [range]);
  const countrySql = useMemo(() => visitsByCountry(range), [range]);
  const eventTypeSql = useMemo(() => eventTypeCounts(range), [range]);

  const sectionTime = useQuery<SectionDayRow>(sectionTimeSql);
  const visits = useQuery<VisitsDayRow>(visitsSql);
  const weeklyUsers = useQuery<WeekUsersRow>(weeklyUsersSql);
  const nickSection = useQuery<NickSectionRow>(nickSectionSql);
  const country = useQuery<CountryRow>(countrySql);
  const eventType = useQuery<EventTypeRow>(eventTypeSql);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">aoe4friends analytics</h1>
            <p className="text-gray-400 text-sm">
              Usage data from the aoe4friends_usage dataset. Local dashboard only —
              see the README for setup.
            </p>
          </div>
          <DateRangeSelector value={range} onChange={setRange} />
        </header>

        <div className="mb-6">
          <FriendLabels friends={friends} onChange={setFriends} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Time spent per section per day" loading={sectionTime.loading} error={sectionTime.error}>
            <SectionTimeChart rows={sectionTime.data} />
          </ChartCard>

          <ChartCard title="Visits per section per day" loading={visits.loading} error={visits.error}>
            <SectionVisitsChart rows={visits.data} />
          </ChartCard>

          <ChartCard title="Distinct users per week" loading={weeklyUsers.loading} error={weeklyUsers.error}>
            <WeeklyUsersChart rows={weeklyUsers.data} />
          </ChartCard>

          <ChartCard title="Visits by country" loading={country.loading} error={country.error}>
            <CountryChart rows={country.data} />
          </ChartCard>

          <ChartCard title="Event type totals" loading={eventType.loading} error={eventType.error}>
            <EventTypeTiles rows={eventType.data} />
          </ChartCard>

          <div className="lg:col-span-2">
            <ChartCard title="Time per user per section" loading={nickSection.loading} error={nickSection.error}>
              <NickSectionTable rows={nickSection.data} hashMap={hashMap} />
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
