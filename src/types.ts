export interface Room {
  id: string;
  created_at: string;
  player1_id: string | null;
  player2_id: string | null;
  current_turn: string | null;
  story: StoryEntry[];
}

export interface StoryEntry {
  player_id: string;
  content: string;
  timestamp: string;
  type: 'player' | 'ai';
}

export interface Player {
  id: string;
  name: string;
}