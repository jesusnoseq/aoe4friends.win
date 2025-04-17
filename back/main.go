package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
)

func analyzeHandler(w http.ResponseWriter, r *http.Request) {
	profileIDStr := r.URL.Query().Get("profile_id")
	if profileIDStr == "" {
		http.Error(w, "Missing profile_id", http.StatusBadRequest)
		return
	}
	profileID, err := strconv.Atoi(profileIDStr)
	if err != nil {
		http.Error(w, "Invalid profile_id", http.StatusBadRequest)
		return
	}
	filePath := fmt.Sprintf("data/player_games_%d.json", profileID)
	games, err := processPlayerGames(profileID, filePath)
	if err != nil {
		http.Error(w, "Error processing player games: "+err.Error(), http.StatusInternalServerError)
		return
	}
	analysis := AnalyzeGames(games, profileID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analysis)
}

func main() {
	if len(os.Args) == 1 {
		// Start HTTP server if no CLI args
		http.HandleFunc("/analyze", analyzeHandler)
		fmt.Println("Starting server on :8080...")
		http.ListenAndServe(":8080", nil)
		return
	}
	if len(os.Args) < 2 {
		fmt.Println("Usage: back_go <profile_id>")
		os.Exit(1)
	}
	profileIDStr := os.Args[1]
	profileID, err := strconv.Atoi(profileIDStr)
	if err != nil {
		fmt.Println("Invalid profile_id, must be an integer")
		os.Exit(1)
	}
	filePath := fmt.Sprintf("data/player_games_%d.json", profileID)
	games, err := processPlayerGames(profileID, filePath)
	if err != nil {
		fmt.Println("Error processing player games:", err)
		os.Exit(1)
	}
	analysis := AnalyzeGames(games, profileID)
	fmt.Printf("Total games analyzed: %d\n", len(games))

	// Print Top 10 Enemies (Opponents)
	fmt.Println("Top 10 Enemies:")
	for i, pair := range analysis.Opponents {
		fmt.Printf("%s: %d games, %d wins, %d losses\n", pair.Name, pair.Stat.Games, pair.Stat.Wins, pair.Stat.Losses)
		if i >= 9 {
			break
		}
	}

	// Print Top 10 Allies
	fmt.Println("\nTop 10 Allies:")
	for i, pair := range analysis.Allies {
		fmt.Printf("%s: %d games, %d wins, %d losses\n", pair.Name, pair.Stat.Games, pair.Stat.Wins, pair.Stat.Losses)
		if i >= 9 {
			break
		}
	}

	fmt.Println("Game analysis completed successfully.")
	//fmt.Printf("Analysis: %+v\n", analysis)
}
