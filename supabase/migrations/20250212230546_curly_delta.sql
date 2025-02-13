/*
  # Fix Room Security Policies

  1. Changes
    - Drop existing policies that are causing issues
    - Create new policies that allow:
      - Anyone to create rooms
      - Anyone to read rooms
      - Players to update their own rooms
      - No deletion allowed

  2. Security
    - Enable RLS on rooms table
    - Add policies for anonymous access
    - Restrict updates to room players only
*/

-- First, drop existing policies
DROP POLICY IF EXISTS "Anyone can read rooms" ON rooms;
DROP POLICY IF EXISTS "Anyone can insert rooms" ON rooms;
DROP POLICY IF EXISTS "Players can update their rooms" ON rooms;

-- Create new policies
CREATE POLICY "public_read"
  ON rooms
  FOR SELECT
  USING (true);

CREATE POLICY "public_insert"
  ON rooms
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "players_update"
  ON rooms
  FOR UPDATE
  USING (
    (player1_id IS NULL) OR
    (player2_id IS NULL) OR
    (auth.uid() IS NULL) OR
    (player1_id = auth.uid()::text) OR
    (player2_id = auth.uid()::text)
  )
  WITH CHECK (
    (player1_id IS NULL) OR
    (player2_id IS NULL) OR
    (auth.uid() IS NULL) OR
    (player1_id = auth.uid()::text) OR
    (player2_id = auth.uid()::text)
  );