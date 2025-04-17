package main

import (
	"testing"
)

func sampleGames() []Game {
	return []Game{
		{
			Teams: [][]TeamMember{
				{
					{Player: Player{ProfileID: 1, Name: "Alice", Result: "win", Civilization: "Britons"}},
					{Player: Player{ProfileID: 2, Name: "Bob", Result: "win", Civilization: "Franks"}},
				},
				{
					{Player: Player{ProfileID: 3, Name: "Carol", Result: "loss", Civilization: "Goths"}},
					{Player: Player{ProfileID: 4, Name: "Dave", Result: "loss", Civilization: "Vikings"}},
				},
			},
		},
		{
			Teams: [][]TeamMember{
				{
					{Player: Player{ProfileID: 1, Name: "Alice", Result: "loss", Civilization: "Britons"}},
					{Player: Player{ProfileID: 5, Name: "Eve", Result: "loss", Civilization: "Teutons"}},
				},
				{
					{Player: Player{ProfileID: 3, Name: "Carol", Result: "win", Civilization: "Goths"}},
					{Player: Player{ProfileID: 6, Name: "Frank", Result: "win", Civilization: "Persians"}},
				},
			},
		},
	}
}

func TestAnalyzeGamesBasic(t *testing.T) {
	result := AnalyzeGames(sampleGames(), 1)

	matchStats := result.MatchStats
	if matchStats["total"] != 2 || matchStats["wins"] != 1 || matchStats["losses"] != 1 {
		t.Errorf("unexpected match_stats: %+v", matchStats)
	}

	// Civilization stats
	civStats := result.CivStats
	britons, ok := civStats["Britons"]
	if !ok {
		t.Fatalf("Britons not in civ_stats")
	}
	if britons.Total != 2 || britons.Wins != 1 || britons.Losses != 1 || britons.WinRate != 50.0 {
		t.Errorf("unexpected britons stats: %+v", britons)
	}

	// Allies
	allies := result.Allies
	bobFound := false
	eveFound := false
	for _, pair := range allies {
		if pair.Name == "Bob" {
			bobFound = true
			if pair.Stat.Games != 1 || pair.Stat.Wins != 1 || pair.Stat.Losses != 0 {
				t.Errorf("unexpected Bob stats: %+v", pair.Stat)
			}
		}
		if pair.Name == "Eve" {
			eveFound = true
			if pair.Stat.Games != 1 || pair.Stat.Wins != 0 || pair.Stat.Losses != 1 {
				t.Errorf("unexpected Eve stats: %+v", pair.Stat)
			}
		}
	}
	if !bobFound {
		t.Fatalf("Bob not in allies")
	}
	if !eveFound {
		t.Fatalf("Eve not in allies")
	}

	// Opponents
	opponents := result.Opponents
	carolFound := false
	daveFound := false
	frankFound := false
	for _, pair := range opponents {
		if pair.Name == "Carol" {
			carolFound = true
			if pair.Stat.Games != 2 || pair.Stat.Wins != 1 || pair.Stat.Losses != 1 {
				t.Errorf("unexpected Carol stats: %+v", pair.Stat)
			}
		}
		if pair.Name == "Dave" {
			daveFound = true
			if pair.Stat.Games != 1 || pair.Stat.Wins != 0 || pair.Stat.Losses != 1 {
				t.Errorf("unexpected Dave stats: %+v", pair.Stat)
			}
		}
		if pair.Name == "Frank" {
			frankFound = true
			if pair.Stat.Games != 1 || pair.Stat.Wins != 1 || pair.Stat.Losses != 0 {
				t.Errorf("unexpected Frank stats: %+v", pair.Stat)
			}
		}
	}
	if !carolFound {
		t.Fatalf("Carol not in opponents")
	}
	if !daveFound {
		t.Fatalf("Dave not in opponents")
	}
	if !frankFound {
		t.Fatalf("Frank not in opponents")
	}
}
