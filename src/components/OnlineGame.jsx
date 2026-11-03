import { useEffect, useState } from 'react';
import { useMultiplayer } from '../hooks/useMultiplayer.js';
import { KEYMAP } from '../game/constants.js';
import GameBoard from './GameBoard.jsx';
import ScoreBoard from './ScoreBoard.jsx';
import GameOver from './GameOver.jsx';

const DIR_KEYS = {};
for (const [k, [, dir]] of Object.entries(KEYMAP)) DIR_KEYS[k] = dir; // WASD and arrows both steer YOUR snake online

export default function OnlineGame({ code, role, onLeave }) {
  const { conn, error, snap, sendInput, requestRematch, isHost } = useMultiplayer({ code, role });
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?room=${code}`;

  useEffect(() => {
    const onKey = (e) => {
      const dir = DIR_KEYS[e.key] || DIR_KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!dir) return;
      e.preventDefault();
      sendInput(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sendInput]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { window.prompt('Copy this link:', link); }
  };

  if (conn === 'error') {
    return (
      <div className="card lobby">
        <h2>Connection problem</h2>
        <p className="hint">{error}</p>
        <p className="hint">If the browser console says <code>ERR_CONNECTION_REFUSED</code> for the Supabase WebSocket, this is usually outside the game code: confirm the Supabase project is active, then retry without a VPN, proxy, or restrictive network. If the error is for <code>localhost:5173</code>, restart the Vite development server.</p>
        <button className="btn primary" onClick={onLeave}>Back to lobby</button>
      </div>
    );
  }
  if (conn === 'connecting' || !snap) {
    return <div className="card lobby"><p>{isHost ? 'Creating room…' : `Joining room ${code}…`}</p></div>;
  }

  if (snap.phase === 'waiting') {
    return (
      <div className="card lobby">
        <h2>Room <span className="code">{code}</span></h2>
        <p className="status"><i className="dot on" /> Player 1 (host) connected</p>
        <p className="status"><i className="dot" /> Waiting for Player 2…</p>
        <button className="btn primary" onClick={copy}>{copied ? 'Copied!' : 'Copy invitation link'}</button>
        <p className="hint">Send the link or the code to your friend on the other laptop.</p>
        <button className="btn" onClick={onLeave}>Cancel</button>
      </div>
    );
  }

  const me = isHost ? 0 : 1;
  const mine = snap.rematch?.[me];
  const labels = ['Player 1 (Host)' + (me === 0 ? ' · You' : ''), 'Player 2' + (me === 1 ? ' · You' : '')];
  return (
    <div className="game">
      <ScoreBoard state={snap} labels={labels} />
      <div className="boardwrap">
        <GameBoard state={snap} />
        {snap.phase === 'countdown' && (
          <div className="overlay"><div className="card big">{snap.countdown}<small>You are {me === 0 ? 'Blue' : 'Red'}</small></div></div>
        )}
        {isHost && snap.peer === false && snap.phase !== 'over' && (
          <div className="overlay"><div className="card">Opponent disconnected. Waiting for them to return…</div></div>
        )}
        {snap.phase === 'over' && (
          <GameOver state={snap} onRematch={requestRematch} onLobby={onLeave}
            rematchLabel={mine ? 'Waiting for opponent…' : 'Rematch'} rematchDisabled={mine || (isHost && !snap.peer)} />
        )}
      </div>
      <p className="hint">Steer with W A S D or the arrow keys · You are {me === 0 ? 'Blue' : 'Red'}</p>
    </div>
  );
}
