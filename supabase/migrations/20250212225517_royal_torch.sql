/*
  # Create rooms table for multiplayer dungeon AI game

  1. New Tables
    - `rooms`
      - `id` (text, primary key) - Room code
      - `created_at` (timestamptz) - Room creation timestamp
      - `player1_id` (text) - ID of the first player
      - `player2_id` (text) - ID of the second player (nullable)
      - `current_turn` (text) - ID of the player whose turn it is
      - `story` (jsonb) - Array of story entries

  2. Security
    - Enable RLS on `rooms` table
    - Add policies for reading and updating rooms
*/

CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  player1_id text,
  player2_id text,
  current_turn text,
  story jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read rooms (needed for joining)
CREATE POLICY "Anyone can read rooms"
  ON rooms
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow anyone to insert rooms (needed for creating)
CREATE POLICY "Anyone can insert rooms"
  ON rooms
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Allow updates only by players in the room
CREATE POLICY "Players can update their rooms"
  ON rooms
  FOR UPDATE
  TO authenticated, anon
  USING (
    auth.uid()::text = player1_id OR
    auth.uid()::text = player2_id OR
    player2_id IS NULL
  )
  WITH CHECK (
    auth.uid()::text = player1_id OR
    auth.uid()::text = player2_id OR
    player2_id IS NULL
  );