import { create } from 'zustand';
import { Player, Room } from './types';

interface GameState {
  player: Player | null;
  room: Room | null;
  setPlayer: (player: Player | null) => void;
  setRoom: (room: Room | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  player: null,
  room: null,
  setPlayer: (player) => set({ player }),
  setRoom: (room) => set({ room }),
}));