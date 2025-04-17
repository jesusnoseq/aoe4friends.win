import requests

class GameApiService:
    @staticmethod
    def fetch_games(profile_id, since=None, until_game_id=None):
        api_url = f'https://aoe4world.com/api/v0/players/{profile_id}/games'
        params = {}
        if since:
            params['since'] = since
            
        all_games = []
        page = 1
        
        while True:
            params['page'] = page
            response = requests.get(api_url, params=params)
            if response.status_code != 200:
                print(f"Error fetching games: {response.status_code}")
                print(f"Response: {response.text}")
                break
                
            gamesResp = response.json()
            if not gamesResp:
                raise ValueError("No games found")

            games = gamesResp.get('games', [])
                
            print(f"Fetched {len(games)} games from page {page}.")
            print(f"Games: {games}")
            # If we're searching until a specific game, check if it's in this batch
            if until_game_id:
                game_ids = [game.get('id') for game in games]
                if until_game_id in game_ids:
                    until_index = game_ids.index(until_game_id)
                    # Only add games that come before the until_game_id
                    all_games.extend(games[:until_index])
                    break
            
            all_games.extend(games)
            page += 1
            total_count = gamesResp.get("total_count")
            offset = gamesResp.get("offset")
            count = gamesResp.get("count")
            if total_count == (offset + count):
                print("All games fetched.")
                break
        return all_games