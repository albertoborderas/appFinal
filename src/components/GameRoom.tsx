import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { supabase } from '../supabase';
import { Send, Crown, Copy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Room, StoryEntry } from '../types';

export function GameRoom() {
  const { player, room, setRoom } = useGameStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!room?.id) return;

    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', room.id)
        .single();
      
      if (error) {
        console.error('Error fetching room:', error);
        return;
      }
      
      if (data && JSON.stringify(data) !== JSON.stringify(room)) {
        console.log('Room state updated:', data);
        setRoom(data as Room);
      }
    };

    const channel = supabase.channel(`room:${room.id}`);
    
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          console.log('Room change detected:', payload);
          const newRoomData = payload.new as Room;
          if (JSON.stringify(newRoomData) !== JSON.stringify(room)) {
            setRoom(newRoomData);
          }
        }
      )
      .subscribe();

    // Fetch initial state
    fetchRoom();

    const interval = setInterval(fetchRoom, 3000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [room?.id]);

  const isMyTurn = player?.id === room?.current_turn;
  const isHost = player?.id === room?.player1_id;
  const isSecondPlayer = player?.id === room?.player2_id;
  const isFull = Boolean(room?.player1_id && room?.player2_id);
  const isWaitingForPlayer = !room?.player2_id;

  useEffect(() => {
    if (room?.player2_id && isHost) {
      // Force refresh room state when player 2 joins
      const refreshRoom = async () => {
        const { data } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', room.id)
          .single();
        
        if (data) setRoom(data as Room);
      };
      refreshRoom();
    }
  }, [room?.player2_id, isHost]);

  const copyRoomCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      toast.success('Room code copied to clipboard!');
    }
  };

  const submitAction = async () => {
    if (!player || !room || !input.trim() || !isMyTurn || !isFull) return;

    setIsLoading(true);
    try {
      const newEntry: StoryEntry = {
        player_id: player.id,
        content: input,
        timestamp: new Date().toISOString(),
        type: 'player',
      };

      const nextTurn = room.player1_id === player.id ? room.player2_id : room.player1_id;
      
      const { error } = await supabase
        .from('rooms')
        .update({
          story: [...room.story, newEntry],
          current_turn: nextTurn,
        })
        .eq('id', room.id);

      if (error) throw error;

      // Call Groq API for AI response
      try {
        console.log('Sending request to Groq API...');
        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: 'You are a concise dungeon master narrating a fantasy story. Keep your responses short and focused, around 2-3 sentences per response. Maintain the story flow while being brief.',
              },
              ...room.story.map(entry => ({
                role: entry.type === 'ai' ? 'assistant' : 'user',
                content: entry.content
              })),
              {
                role: 'user',
                content: input,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('AI Response Error:', errorText);
          console.error('Status:', aiResponse.status);
          console.error('Status Text:', aiResponse.statusText);
          throw new Error(`Failed to get AI response: ${aiResponse.status} ${aiResponse.statusText}`);
        }
        
        const aiData = await aiResponse.json();
        const aiEntry: StoryEntry = {
          player_id: 'ai',
          content: aiData.choices[0].message.content,
          timestamp: new Date().toISOString(),
          type: 'ai',
        };

        const { error: updateError } = await supabase
          .from('rooms')
          .update({
            story: [...room.story, newEntry, aiEntry],
          })
          .eq('id', room.id);

        if (updateError) throw updateError;
      } catch (error) {
        console.error('AI/Update Error:', error);
        throw error;
      }

      setInput('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit action');
    } finally {
      setIsLoading(false);
    }
  };

  const getInputPlaceholder = () => {
    if (!room.player2_id) return "Waiting for another player to join...";
    if (isMyTurn) return "Describe your action...";
    return "Waiting for other player's turn...";
  };

  if (!room || !player) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Room Info Banner */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold">Room Code:</h2>
            <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1.5 rounded-lg">
              <code className="font-mono text-purple-400">{room.id}</code>
              <button
                onClick={copyRoomCode}
                className="text-gray-400 hover:text-white transition-colors"
                title="Copy room code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400">
              {isFull ? 'Game in progress' : 'Waiting for player to join...'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isWaitingForPlayer && isHost ? (
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-6 text-center">
            <h3 className="text-xl font-semibold mb-2">Share Room Code</h3>
            <p className="text-gray-400 mb-4">
              Share this code with your friend to start the adventure:
            </p>
            <div className="inline-flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
              <code className="font-mono text-2xl text-purple-400">{room.id}</code>
              <button
                onClick={copyRoomCode}
                className="text-gray-400 hover:text-white transition-colors"
                title="Copy room code"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          room.story.map((entry, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                entry.type === 'ai'
                  ? 'bg-purple-900/50 border border-purple-500/30'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            >
              {entry.type === 'ai' ? (
                <div className="flex items-center space-x-2 mb-2">
                  <Crown className="w-5 h-5 text-purple-400" />
                  <span className="text-purple-400 font-medium">Dungeon Master</span>
                </div>
              ) : (
                <div className="text-gray-400 mb-2">
                  {entry.player_id === room.player1_id ? 'Player 1' : 'Player 2'}
                </div>
              )}
              <p className="text-gray-100">{entry.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!isMyTurn || isLoading || !isFull || isWaitingForPlayer}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              placeholder={getInputPlaceholder()}
            />
            <button
              onClick={submitAction}
              disabled={!isMyTurn || isLoading || !input.trim() || !isFull}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center space-x-2 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              <span>{isLoading ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}