import json
import os
from game_service import process_player_games

def lambda_handler(event, context):
    # Extract profile ID from event
    profile_id = None
    
    # Check different possible locations for profile ID in the event
    if isinstance(event, dict):
        if 'profileId' in event:
            profile_id = event['profileId']
        elif 'queryStringParameters' in event and event['queryStringParameters'] and 'profileId' in event['queryStringParameters']:
            profile_id = event['queryStringParameters']['profileId']
        elif 'body' in event and event['body']:
            try:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
                if 'profileId' in body:
                    profile_id = body['profileId']
            except:
                pass
    
    # Validate profile_id is provided
    if not profile_id:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': 'Missing required parameter: profileId'
            })
        }
    
    # Use /tmp for file storage in Lambda with profile_id in the filename
    json_file = f'/tmp/player_games_{profile_id}.json'
    
    # Process games
    all_games, analysis = process_player_games(profile_id, json_file)
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'games_count': len(all_games),
            'analysis': analysis,
            'profile_id': profile_id
        })
    }
