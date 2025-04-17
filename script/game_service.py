import requests
import json
import os
import boto3
from botocore.exceptions import ClientError
from urllib.parse import urlparse

# Storage Service - Handles file operations
class StorageService:
    @staticmethod
    def is_s3_path(path):
        """Check if the path is an S3 path (s3://bucket/key)"""
        return path.startswith('s3://')

    @staticmethod
    def parse_s3_path(s3_path):
        """Parse an S3 path into bucket and key components"""
        parsed = urlparse(s3_path)
        bucket = parsed.netloc
        key = parsed.path.lstrip('/')
        return bucket, key

    @staticmethod
    def load_data(file_path):
        """Load JSON data from either S3 or local filesystem"""
        if StorageService.is_s3_path(file_path):
            bucket, key = StorageService.parse_s3_path(file_path)
            s3 = boto3.client('s3')
            try:
                response = s3.get_object(Bucket=bucket, Key=key)
                content = response['Body'].read().decode('utf-8')
                return json.loads(content)
            except ClientError as e:
                if e.response['Error']['Code'] == 'NoSuchKey':
                    return []
                else:
                    raise
        else:
            # Local file system
            if os.path.exists(file_path):
                with open(file_path, 'r') as file:
                    return json.load(file)
            return []

    @staticmethod
    def save_data(data, file_path):
        """Save JSON data to either S3 or local filesystem"""
        json_content = json.dumps(data, indent=4)
        
        if StorageService.is_s3_path(file_path):
            bucket, key = StorageService.parse_s3_path(file_path)
            s3 = boto3.client('s3')
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=json_content,
                ContentType='application/json'
            )
        else:
            # Local file system
            with open(file_path, 'w') as file:
                file.write(json_content)

# API Service - Handles requests to the game API
class GameApiService:
    @staticmethod
    def fetch_games(profile_id, since=None, until_game_id=None):
        api_url = f'https://aoe4world.com/api/v0/players/{profile_id}/games'
        params = {}
        if since:
            params['since'] = since
            
        all_games = []
        page = 1
        found_until_game = False
        
        while True:
            params['page'] = page
            response = requests.get(api_url, params=params)
            if response.status_code != 200:
                print(f"Error fetching games: {response.status_code}")
                break
                
            games = response.json()
            if not games:
                break
                
            # If we're searching until a specific game, check if it's in this batch
            if until_game_id:
                game_ids = [game.get('id') for game in games]
                if until_game_id in game_ids:
                    until_index = game_ids.index(until_game_id)
                    # Only add games that come before the until_game_id
                    all_games.extend(games[:until_index])
                    found_until_game = True
                    break
            
            all_games.extend(games)
            page += 1
            
        return all_games

# Game Analysis - Handles game data analysis
def analyze_games(games, profile_id):
    profile_id = int(profile_id)
    opponents = {}
    allies = {}
    match_stats = {'total': 0, 'wins': 0, 'losses': 0}
    civ_stats = {}
    for game in games:
        # Find the player in the teams structure
        player_info = None
        player_team_index = None
        for team_index, team in enumerate(game['teams']):
            for team_member in team:
                if team_member['player']['profile_id'] == profile_id:
                    player_info = team_member['player']
                    player_team_index = team_index
                    break
            if player_info:
                break
        if not player_info:
            continue
        # Update match statistics
        match_stats['total'] += 1
        player_won = player_info['result'] == 'win'
        if player_won:
            match_stats['wins'] += 1
        else:
            match_stats['losses'] += 1
        # Update civilization statistics
        player_civ = player_info['civilization']
        if player_civ not in civ_stats:
            civ_stats[player_civ] = {'total': 0, 'wins': 0, 'losses': 0, 'win_rate': 0}
        civ_stats[player_civ]['total'] += 1
        if player_won:
            civ_stats[player_civ]['wins'] += 1
        else:
            civ_stats[player_civ]['losses'] += 1
        civ_stats[player_civ]['win_rate'] = (civ_stats[player_civ]['wins'] / civ_stats[player_civ]['total']) * 100.0
        # Process other players (teammates and enemies)
        for team_index, team in enumerate(game['teams']):
            for team_member in team:
                other_player = team_member['player']
                if other_player['profile_id'] == profile_id:
                    continue
                name = other_player['name']
                if team_index == player_team_index:
                    if name not in allies:
                        allies[name] = {'games': 0, 'wins': 0, 'losses': 0}
                    allies[name]['games'] += 1
                    if player_won:
                        allies[name]['wins'] += 1
                    else:
                        allies[name]['losses'] += 1
                else:
                    if name not in opponents:
                        opponents[name] = {'games': 0, 'wins': 0, 'losses': 0}
                    opponents[name]['games'] += 1
                    if player_won:
                        opponents[name]['losses'] += 1
                    else:
                        opponents[name]['wins'] += 1
    sorted_civ_stats = dict(sorted(
        civ_stats.items(), 
        key=lambda item: item[1]['total'], 
        reverse=True
    ))
    sorted_opponents = dict(sorted(
        opponents.items(), 
        key=lambda item: item[1]['games'], 
        reverse=True
    ))
    sorted_allies = dict(sorted(
        allies.items(), 
        key=lambda item: item[1]['games'], 
        reverse=True
    ))
    return {
        'match_stats': match_stats,
        'civ_stats': sorted_civ_stats,
        'allies': sorted_allies,
        'opponents': sorted_opponents
    }

# Main process function - Coordinates the workflow
def process_player_games(profile_id, file_path):
    # Load existing games from storage
    existing_games = StorageService.load_data(file_path)
    
    # Find latest game information to optimize requests
    last_game_id = None
    if existing_games:
        latest_game_time = max(game['started_at'] for game in existing_games)
        # Get the last game's ID to optimize pagination
        last_game_id = next((game.get('id') for game in existing_games 
                           if game['started_at'] == latest_game_time), None)
    else:
        latest_game_time = None
    
    # Fetch new games from API
    new_games = GameApiService.fetch_games(profile_id, since=latest_game_time, until_game_id=last_game_id)
    
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
