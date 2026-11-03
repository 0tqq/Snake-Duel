import { useState } from 'react';
import { isConfigured } from '../lib/supabase.js';

export default function Lobby({ onLocal, onCreate, onJoin, initialCode = '' }) {
  const [code, setCode] = useState(initialCode);
  const valid = code.trim().length === 6;
  return (
    <div className="card lobby">
      <h1>SNAKE<span>DUEL</span></h1>
      {!isConfigured && (
        <p className="warn">Online play needs Supabase keys. Copy <code>.env.example</code> to <code>.env</code>, fill it in, and restart.</p>
      )}
      <button className="btn primary" onClick={onCreate} disabled={!isConfigured}>Create Room</button>
      <div className="row">
        <input className="input" placeholder="ROOM CODE" maxLength={6} value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
        <button className="btn" disabled={!isConfigured || !valid} onClick={() => onJoin(code.trim())}>Join</button>
      </div>
      <button className="btn" onClick={onLocal}>Play locally (1 keyboard)</button>
      <p className="hint">
        Online: steer with <b>W A S D</b> or <b>arrow keys</b>. Host is <b className="blue">Blue</b>, guest is <b className="red">Red</b>.<br />
        Local: <b className="blue">Player 1</b> WASD · <b className="red">Player 2</b> Arrows.<br />
        Eat green food to grow. Hit a wall or a snake and you lose.
      </p>
    </div>
  );
}
