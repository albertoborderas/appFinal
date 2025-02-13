import React, { useState } from 'react';
import { useGameStore } from '../store';
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { Sword, Users } from 'lucide-react';

export function JoinRoom() {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { setPlayer, setRoom } = useGameStore();

  const createRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsCreating(true);
    const playerId = uuidv4();
    const roomId = uuidv4().slice(0, 8);

    try {
      const { error } = await supabase
        .from('rooms')
        .insert([
          {
            id: roomId,
            player1_id: playerId,
            current_turn: playerId,
            story: [],
          },
        ]);

      if (error) throw error;

      setPlayer({ id: playerId, name: playerName });
      setRoom({
        id: roomId,
        created_at: new Date().toISOString(),
        player1_id: playerId,
        player2_id: null,
        current_turn: playerId,
        story: [],
      });

      toast.success('Room created! Share the code with your friend.');
    } catch (error) {
      toast.error('Failed to create room');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    setIsJoining(true);
    try {
      const { data: rooms, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomCode);

      if (fetchError) throw fetchError;
      
      if (!rooms || rooms.length === 0) {
        toast.error('Room not found. Please check the code and try again.');
        return;
      }

      const room = rooms[0];
      if (room.player2_id) {
        toast.error('Room is full');
        return;
      }

      const playerId = uuidv4();
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ player2_id: playerId })
        .eq('id', roomCode);

      if (updateError) throw updateError;

      setPlayer({ id: playerId, name: playerName });
      setRoom({ ...room, player2_id: playerId });
      toast.success('Joined room successfully!');
    } catch (error) {
      console.error('Join room error:', error);
      toast.error('Failed to join room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-2xl">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold">Dungeon AI</h2>
          <p className="mt-2 text-gray-400">Collaborative Storytelling Adventure</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>

          <div className="flex flex-col space-y-4">
            <button
              onClick={createRoom}
              disabled={isCreating || isJoining}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              <Sword className="w-5 h-5 mr-2" />
              {isCreating ? 'Creating...' : 'Create New Room'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">Or join existing</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter room code"
                disabled={isJoining}
              />
              <button
                onClick={joinRoom}
                disabled={isCreating || isJoining}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                <Users className="w-5 h-5 mr-2" />
                {isJoining ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}