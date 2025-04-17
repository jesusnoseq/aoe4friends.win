import pytest
from game_analysis import analyze_games

@pytest.fixture
def sample_games():
    return [
        {
            'teams': [
                [
                    {'player': {'profile_id': 1, 'name': 'Alice', 'result': 'win', 'civilization': 'Britons'}},
                    {'player': {'profile_id': 2, 'name': 'Bob', 'result': 'win', 'civilization': 'Franks'}}
                ],
                [
                    {'player': {'profile_id': 3, 'name': 'Carol', 'result': 'loss', 'civilization': 'Goths'}},
                    {'player': {'profile_id': 4, 'name': 'Dave', 'result': 'loss', 'civilization': 'Vikings'}}
                ]
            ]
        },
        {
            'teams': [
                [
                    {'player': {'profile_id': 1, 'name': 'Alice', 'result': 'loss', 'civilization': 'Britons'}},
                    {'player': {'profile_id': 5, 'name': 'Eve', 'result': 'loss', 'civilization': 'Teutons'}}
                ],
                [
                    {'player': {'profile_id': 3, 'name': 'Carol', 'result': 'win', 'civilization': 'Goths'}},
                    {'player': {'profile_id': 6, 'name': 'Frank', 'result': 'win', 'civilization': 'Persians'}}
                ]
            ]
        }
    ]

def test_analyze_games_basic(sample_games):
    result = analyze_games(sample_games, 1)
    assert result['match_stats']['total'] == 2
    assert result['match_stats']['wins'] == 1
    assert result['match_stats']['losses'] == 1

    # Civilization stats
    civ_stats = result['civ_stats']
    assert 'Britons' in civ_stats
    assert civ_stats['Britons']['total'] == 2
    assert civ_stats['Britons']['wins'] == 1
    assert civ_stats['Britons']['losses'] == 1
    assert civ_stats['Britons']['win_rate'] == 50.0

    # Allies
    allies = result['allies']
    assert 'Bob' in allies
    assert allies['Bob']['games'] == 1
    assert allies['Bob']['wins'] == 1
    assert allies['Bob']['losses'] == 0
    assert 'Eve' in allies
    assert allies['Eve']['games'] == 1
    assert allies['Eve']['wins'] == 0
    assert allies['Eve']['losses'] == 1

    # Opponents
    opponents = result['opponents']
    assert 'Carol' in opponents
    assert opponents['Carol']['games'] == 2
    assert opponents['Carol']['wins'] == 1
    assert opponents['Carol']['losses'] == 1
    assert 'Dave' in opponents
    assert opponents['Dave']['games'] == 1
    assert opponents['Dave']['wins'] == 0
    assert opponents['Dave']['losses'] == 1
    assert 'Frank' in opponents
    assert opponents['Frank']['games'] == 1
    assert opponents['Frank']['wins'] == 1
    assert opponents['Frank']['losses'] == 0
