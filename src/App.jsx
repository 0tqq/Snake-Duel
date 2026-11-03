import { useCallback, useEffect, useRef, useState } from 'react';
import { createState, step, queueDirection } from './game/engine.js';
import { KEYMAP, TICK_MS } from './game/constants.js';
import GameBoard from './components/GameBoard.jsx';
import ScoreBoard from './components/ScoreBoard.jsx';
import GameOver from './components/GameOver.jsx';
import Lobby from './components/Lobby.jsx';
import OnlineGame from './components/OnlineGame.jsx';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => ALPHABET[n % ALPHABET.length]).join('');
const setUrl = (code) => history.replaceState(null, '', code ? `?room=${code}` : location.pathname);

function LocalGame({ onLobby }) {
  const stateRef = useRef(createState());
  const [view, setView] = useState(() => structuredClone(stateRef.current));

  const sync = () => setView(structuredClone(stateRef.current));

  // single game loop, owned by this effect
  useEffect(() => {
    const id = setInterval(() => {
      step(stateRef.current);
      sync();
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const m = KEYMAP[e.key] || KEYMAP[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!m) return;
      e.preventDefault();
      queueDirection(stateRef.current, m[0], m[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rematch = useCallback(() => {
    stateRef.current = createState();
    sync();
  }, []);

  return (
    <div className="game">
      <ScoreBoard state={view} />
      <div className="boardwrap">
        <GameBoard state={view} />
        {view.status === 'over' && <GameOver state={view} onRematch={rematch} onLobby={onLobby} />}
      </div>
    </div>
  );
}

export default function App() {
  const urlCode = (new URLSearchParams(location.search).get('room') || '').toUpperCase();
  const [mode, setMode] = useState('lobby');
  const [room, setRoom] = useState(null);
  const enter = (code, role) => { setUrl(code); setRoom({ code, role }); setMode('online'); };
  const leave = () => { setUrl(null); setRoom(null); setMode('lobby'); };
  return (
    <main>
      {mode === 'lobby' && (
        <Lobby initialCode={urlCode} onLocal={() => setMode('local')}
          onCreate={() => enter(makeCode(), 'host')} onJoin={(c) => enter(c, 'guest')} />
      )}
      {mode === 'local' && <LocalGame onLobby={leave} />}
      {mode === 'online' && <OnlineGame key={room.code + room.role} code={room.code} role={room.role} onLeave={leave} />}
    </main>
  );
}
