package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
)

type GameApiService struct{}

// In-memory cache for games by profileID
var (
	gameCache      = make(map[int][]Game)
	gameCacheMutex sync.RWMutex
)

func (g *GameApiService) FetchGames(profileID int, since string, untilGameID string) ([]Game, error) {
	// Check cache first
	gameCacheMutex.RLock()
	cachedGames, found := gameCache[profileID]
	gameCacheMutex.RUnlock()
	if found {
		return cachedGames, nil
	}

	apiURL := fmt.Sprintf("https://aoe4world.com/api/v0/players/%d/games", profileID)
	allGames := []Game{}
	page := 1

	for {
		params := ""
		if since != "" {
			params += fmt.Sprintf("?since=%s", since)
		} else {
			params += "?"
		}
		params += fmt.Sprintf("&page=%d", page)

		resp, err := http.Get(apiURL + params)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return nil, fmt.Errorf("API error: %d", resp.StatusCode)
		}
		var gamesResp struct {
			Games      []Game `json:"games"`
			TotalCount int    `json:"total_count"`
			Offset     int    `json:"offset"`
			Count      int    `json:"count"`
		}
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		err = json.Unmarshal(body, &gamesResp)
		if err != nil {
			return nil, err
		}

		// If untilGameID is set, stop at that game
		if untilGameID != "" {
			found := false
			for i, game := range gamesResp.Games {
				if game.ID == untilGameID {
					allGames = append(allGames, gamesResp.Games[:i]...)
					found = true
					break
				}
			}
			if found {
				break
			}
		}

		allGames = append(allGames, gamesResp.Games...)

		// Check if we've fetched all games
		if gamesResp.TotalCount == (gamesResp.Offset+gamesResp.Count) || len(gamesResp.Games) == 0 {
			break
		}
		page++
	}
	gameCacheMutex.Lock()
	gameCache[profileID] = allGames
	gameCacheMutex.Unlock()

	return allGames, nil
}

func processPlayerGames(profileID int, filePath string) ([]Game, error) {
	ss := getStorageService()
	var existingGames []Game
	_ = ss.LoadData(filePath, &existingGames)

	var latestGameTime string
	if len(existingGames) > 0 {
		latestGameTime = existingGames[len(existingGames)-1].StartedAt
	}
	api := &GameApiService{}
	newGames, err := api.FetchGames(profileID, latestGameTime, "")
	if err != nil {
		return nil, err
	}
	allGames := append(existingGames, newGames...)
	err = ss.SaveData(filePath, &allGames)
	if err != nil {
		return nil, err
	}
	return allGames, nil
}
