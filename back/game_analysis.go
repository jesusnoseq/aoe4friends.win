package main

import (
	"sort"
)

func AnalyzeGames(games []Game, profileID int) AnalyzeGamesResult {
	opponents := map[string]*AllyOpponentStat{}
	allies := map[string]*AllyOpponentStat{}
	matchStats := map[string]int{"total": 0, "wins": 0, "losses": 0}
	civStats := map[string]*CivStat{}

	for _, game := range games {
		var playerInfo *Player
		var playerTeamIndex int = -1

		// Find player in teams
		for tIdx, team := range game.Teams {
			for _, member := range team {
				if member.Player.ProfileID == profileID {
					playerInfo = &member.Player
					playerTeamIndex = tIdx
					break
				}
			}
			if playerInfo != nil {
				break
			}
		}
		if playerInfo == nil {
			continue
		}

		// Update match stats
		matchStats["total"]++
		playerWon := playerInfo.Result == "win"
		if playerWon {
			matchStats["wins"]++
		} else {
			matchStats["losses"]++
		}

		// Update civ stats
		pciv := playerInfo.Civilization
		if _, ok := civStats[pciv]; !ok {
			civStats[pciv] = &CivStat{}
		}
		civStats[pciv].Total++
		if playerWon {
			civStats[pciv].Wins++
		} else {
			civStats[pciv].Losses++
		}

		// Process other players
		for tIdx, team := range game.Teams {
			for _, member := range team {
				other := member.Player
				if other.ProfileID == profileID {
					continue
				}
				name := other.Name
				if tIdx == playerTeamIndex {
					if _, ok := allies[name]; !ok {
						allies[name] = &AllyOpponentStat{}
					}
					allies[name].Games++
					if playerWon {
						allies[name].Wins++
					} else {
						allies[name].Losses++
					}
				} else {
					if _, ok := opponents[name]; !ok {
						opponents[name] = &AllyOpponentStat{}
					}
					opponents[name].Games++
					if playerWon {
						opponents[name].Losses++
					} else {
						opponents[name].Wins++
					}
				}
			}
		}
	}

	// Convert civStats to sorted slice then to map (by total desc)
	sortedCivStats := map[string]CivStat{}
	type civPair struct {
		Name string
		Stat *CivStat
	}
	var civPairs []civPair
	for k, v := range civStats {
		civPairs = append(civPairs, civPair{k, v})
	}
	sort.Slice(civPairs, func(i, j int) bool {
		return civPairs[i].Stat.Total > civPairs[j].Stat.Total
	})
	for _, cp := range civPairs {
		sortedCivStats[cp.Name] = *cp.Stat
	}

	// Sort allies and opponents by games desc
	var sortedAllies []NameStatPair
	type aoPair struct {
		Name string
		Stat *AllyOpponentStat
	}
	var allyPairs []aoPair
	for k, v := range allies {
		allyPairs = append(allyPairs, aoPair{k, v})
	}
	sort.Slice(allyPairs, func(i, j int) bool {
		return allyPairs[i].Stat.Games > allyPairs[j].Stat.Games
	})
	for _, ap := range allyPairs {
		sortedAllies = append(sortedAllies, NameStatPair{ap.Name, *ap.Stat})
	}

	var sortedOpponents []NameStatPair
	var oppPairs []aoPair
	for k, v := range opponents {
		oppPairs = append(oppPairs, aoPair{k, v})
	}
	sort.Slice(oppPairs, func(i, j int) bool {
		return oppPairs[i].Stat.Games > oppPairs[j].Stat.Games
	})
	for _, op := range oppPairs {
		sortedOpponents = append(sortedOpponents, NameStatPair{op.Name, *op.Stat})
	}

	return AnalyzeGamesResult{
		MatchStats: matchStats,
		CivStats:   sortedCivStats,
		Allies:     sortedAllies,
		Opponents:  sortedOpponents,
	}
}
