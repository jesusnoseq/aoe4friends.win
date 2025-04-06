def analyze_games(games, profile_id):
    profile_id = int(profile_id)
    
    # Initialize statistics dictionaries
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