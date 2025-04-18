export interface Player {
  profile_id: number;
  name: string;
  civilization: string;
  result: string;
}

export interface TeamMember {
  player: Player;
}

export interface Game {
  id: string;
  started_at: string;
  teams: TeamMember[][];
}
