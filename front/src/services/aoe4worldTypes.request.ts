export interface GamesResponse {
  total_count: number;
  page:        number;
  per_page:    number;
  count:       number;
  offset:      number;
  filters:     Filters;
  games:       Game[];
}

export interface Filters {
  leaderboard:          null;
  since:                null;
  profile_ids:          number[];
  opponent_profile_id:  null;
  opponent_profile_ids: null;
}


export interface Game {
  game_id:                  number;
  started_at:               Date;
  updated_at:               Date;
  duration:                 number;
  map:                      string;
  kind:                     Leaderboard;
  leaderboard:              Leaderboard;
  mmr_leaderboard:          Leaderboard;
  season:                   number;
  server:                   Server;
  patch:                    number;
  average_rating:           number | null;
  average_rating_deviation: number | null;
  average_mmr:              number | null;
  average_mmr_deviation:    number | null;
  ongoing:                  boolean;
  just_finished:            boolean;
  teams:                    Array<Team[]>;
}


export enum Leaderboard {
  QmSolo = "qm_solo",
  Qm2V2Chartacourse = "qm_2v2_chartacourse",
  Qm2V2Ew = "qm_2v2_ew",
  Qm3V3 = "qm_3v3",
  Qm3V3Ew = "qm_3v3_ew",
  Qm4V4 = "qm_4v4",
  Qm4V4Ew = "qm_4v4_ew",
  Rm3V3 = "rm_3v3",
  Rm4V4 = "rm_4v4",
  RmTeam = "rm_team",
  RmSolo = "rm_solo",
  Rm1V1 = "rm_1v1",
}

export enum Server {
  AsiaSE = "Asia (SE)",
  Australia = "Australia",
  EuropeW = "Europe (W)",
  India = "India",
  Uk = "UK",
  UsaE = "USA (E)",
  UsaW = "USA (W)",
}

export interface Team {
  player: Player;
}


export interface TeamMember {
  player: Player;
}

export interface Player {
  profile_id:              number;
  name:                    string;
  country:                 string;
  result:                  Result;
  civilization:            Civilization;
  civilization_randomized: boolean | null;
  rating:                  number | null;
  rating_diff:             number | null;
  mmr:                     number | null;
  mmr_diff:                number | null;
  input_type:              InputType | null;
}

export enum Civilization {
  AbbasidDynasty = "abbasid_dynasty",
  Ayyubids = "ayyubids",
  Byzantines = "byzantines",
  Chinese = "chinese",
  DelhiSultanate = "delhi_sultanate",
  English = "english",
  French = "french",
  HolyRomanEmpire = "holy_roman_empire",
  HouseOfLancaster = "house_of_lancaster",
  Japanese = "japanese",
  JeanneDarc = "jeanne_darc",
  KnightsTemplar = "knights_templar",
  Malians = "malians",
  Mongols = "mongols",
  OrderOfTheDragon = "order_of_the_dragon",
  Ottomans = "ottomans",
  Rus = "rus",
  ZhuXisLegacy = "zhu_xis_legacy",
}


export enum InputType {
  Controller = "controller",
  Keyboard = "keyboard",
}

export enum Result {
  Empty = "",
  Loss = "loss",
  Noresult = "noresult",
  Win = "win",
}

