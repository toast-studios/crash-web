# Game to App Events From 21 Jack

## 🔴 Critical Events (Must Have)

### Authentication & Session

- `player_auth_success` (src/views/playable/script.ts)
- `player_auth_failed`
- `player_rejoin_game`
- `socket_connected`
- `socket_disconnected`
- `token_refresh`

### Gameplay Core

- `game_phase_one_start`
- `game_phase_two_start`
- `game_end`
- `turn_start`
- `turn_end`
- `card_placed`
- `player_hit`
- `player_stand`
- `column_complete`
- `match_result`

### Error Handling

- `socket_error`
- `api_error`
- `game_state_error`
- `asset_load_error`
- `connection_timeout`

## 🟡 Important Events (Should Have)

### Game Flow

- `lobby_joined`
- `matchmaking_start`
- `opponent_found`
- `opponent_action_taken`
- `deck_shuffled`
- `score_update`
- `column_bust`
- `column_blackjack`

### Player Actions

- `card_selected`
- `card_placement_confirmed`
- `turn_skipped`
- `extra_time_used`
- `player_left_game`

### Performance

- `fps_drop`
- `loading_time_exceeded`
- `network_quality_change`
- `game_state_sync`

## 🟢 Enhancement Events (Nice to Have)

### Player Experience

- `tutorial_started`
- `tutorial_completed`
- `tutorial_step_completed`
- `settings_changed`

### Analytics

- `screen_view`
- `button_click`
- `popup_shown`
- `error_popup_shown`

## 📝 Event Properties Standard

### Common Properties

```json
{
  "timestamp": "ISO8601 timestamp",
  "gameUserId": "unique player identifier",
  "gameState": "current game state",
  "gameMode": "gameplay/test/ftue/playable",
  "gameEnvironment": "development/staging/production",
  "webVersion": "version number",
  "sessionId": "current session identifier"
}
```

### Game-Specific Properties Example

```json
{
  "game_end": {
    "winnerId": "winning player id",
    "winnerPoints": "numeric score",
    "looserPoints": "numeric score",
    "gameEndType": "GAME_OVER/OPPONENT_LEAVE_GAME/DRAW",
    "gameState": "current game state",
    "turnInfo": {
      "ownTurnInfo": "player turn data",
      "opponentTurnInfo": "opponent turn data"
    }
  }
}
```

## 🔄 Implementation Guidelines

1. Event Naming Convention

   - Use snake_case for event names
   - Follow pattern: `[game_phase]_[action]`
   - Keep consistent with existing socket events

2. Data Validation

   - Validate game state transitions
   - Check card placements and scores
   - Handle reconnection scenarios
   - Validate turn actions

3. Error Handling

   - Log errors using Logger utility
   - Implement socket reconnection
   - Handle API failures
   - Cache game state for recovery

4. Privacy Considerations

   - Only track game-related data
   - Avoid storing personal information
   - Follow platform guidelines
   - Implement proper token handling

5. Performance Impact

   - Optimize socket events
   - Handle animation states efficiently
   - Monitor memory usage
   - Implement proper cleanup

6. Testing Requirements
   - Test all game phases
   - Verify socket events
   - Test reconnection scenarios
   - Validate game end conditions
   - Check score calculations
