import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useGameStore } from './store';
import { JoinRoom } from './components/JoinRoom';
import { GameRoom } from './components/GameRoom';

function App() {
  const { room } = useGameStore();

  return (
    <>
      <Toaster position="top-right" />
      {room ? <GameRoom /> : <JoinRoom />}
    </>
  );
}

export default App;