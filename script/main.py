import os
import json
from storage_service import StorageService
from game_api_service import GameApiService
from game_analysis import analyze_games

# Get storage directory from environment variable with default fallback
STORAGE_DIR = os.environ.get('GAME_STORAGE_PATH', os.path.join(os.getcwd(), 'data'))

def process_player_games(profile_id):
    if not profile_id:
        raise ValueError("Profile ID cannot be empty")
        
    # Create storage directory if it doesn't exist
    os.makedirs(STORAGE_DIR, exist_ok=True)
    
    # Generate file path based on profile ID using the environment variable
    file_path = os.path.join(STORAGE_DIR, f"player_games_{profile_id}.json")
    
    # Load existing games from storage
    existing_games = StorageService.load_data(file_path)
    
    # Find latest game information to optimize requests
    last_game_id = None
    if existing_games:
        latest_game_time = max(game['started_at'] for game in existing_games)
        # Get the last game's ID to optimize pagination
        last_game_id = next((game['game_id'] for game in existing_games 
                           if game['started_at'] == latest_game_time), None)
    else:
        latest_game_time = None
    
    # Fetch new games from API
    new_games = GameApiService.fetch_games(profile_id, since=latest_game_time, until_game_id=last_game_id)
    print(f"Fetched {len(new_games)} new games from API.")
    # Process and save results
    if new_games:
        all_games = existing_games + new_games
        StorageService.save_data(all_games, file_path)
        print(f"Fetched and saved {len(new_games)} new games.")
    else:
        all_games = existing_games
        print("No new games found.")
    
    # Analyze all games
    analysis = analyze_games(all_games, profile_id)
    
    return all_games, analysis

if __name__ == "__main__":
    import sys
    
    try:
        # Get profile ID from command line arguments
        if len(sys.argv) > 1:
            profile_id = sys.argv[1]
            if not profile_id:
                raise ValueError("Profile ID cannot be empty")
        else:
            raise ValueError("Profile ID is required as a command-line argument")
        
        print(f"Processing games for profile ID: {profile_id}")
        games, analysis = process_player_games(profile_id)
        print(f"Total games analyzed: {len(games)}")
        print(f"Total players analyzed: {len(analysis)}")
        #print(f"Analysis results: {analysis}")

        print("Top 10 Enemies:")
        for name, stats in list(analysis['opponents'].items())[:10]:
            print(f"{name}: {stats['games']} games, {stats['wins']} wins, {stats['losses']} losses")

        print("\nTop 10 Allies:")
        for name, stats in list(analysis['allies'].items())[:10]:
            print(f"{name}: {stats['games']} games, {stats['wins']} wins, {stats['losses']} losses")

        print("Game analysis completed successfully.")
        
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
