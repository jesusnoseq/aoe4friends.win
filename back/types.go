package main

type Game struct {
	ID        string         `json:"id"`
	StartedAt string         `json:"started_at"`
	Teams     [][]TeamMember `json:"teams"`
}

type Player struct {
	ProfileID    int    `json:"profile_id"`
	Name         string `json:"name"`
	Civilization string `json:"civilization"`
	Result       string `json:"result"`
}

type TeamMember struct {
	Player Player `json:"player"`
}

type CivStat struct {
	Total   int     `json:"total"`
	Wins    int     `json:"wins"`
	Losses  int     `json:"losses"`
	WinRate float64 `json:"win_rate"`
}

type AllyOpponentStat struct {
	Games  int `json:"games"`
	Wins   int `json:"wins"`
	Losses int `json:"losses"`
}

type NameStatPair struct {
	Name string
	Stat AllyOpponentStat
}

type AnalyzeGamesResult struct {
	MatchStats map[string]int
	CivStats   map[string]CivStat
	Allies     []NameStatPair
	Opponents  []NameStatPair
}
