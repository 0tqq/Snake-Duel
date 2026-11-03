import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { createState, step, queueDirection, toSnapshot } from '../game/engine.js';
import { TICK_MS } from '../game/constants.js';

const clientId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

/**
 * Host-authoritative multiplayer over Supabase Realtime.
 *  - Host (room creator) = Player 1 (blue). Runs the ONLY simulation.
 *  - Guest = Player 2 (red). Sends direction inputs, renders snapshots.
 */
export function useMultiplayer({ code, role }) {
  const isHost = role === 'host';
  const [conn, setConn] = useState('connecting'); // connecting | ready | error
  const [error, setError] = useState(null);
  const [snap, setSnap] = useState(null);

  const chRef = useRef(null);
  const api = useRef({}); // functions that read refs only (no stale closures)

  useEffect(() => {
    const id = clientId();
    const joinedAt = Date.now();
    let dead = false;

    // ---- host-only state (refs so timers never see stale React state) ----
    const H = {
      state: createState(),
      round: 1,
      phase: 'waiting', // waiting | countdown | playing | over
      countdown: 3,
      rematch: [false, false],
      msgSeq: 0,
      guestPresent: false,
      timer: null,
    };
    // ---- guest-only state ----
    const G = { lastSeq: -1, sawHost: false, hostTimer: null };

    const channel = supabase.channel(`snakeduel:${code}`, {
      config: { broadcast: { self: false }, presence: { key: id } },
    });
    chRef.current = channel;

    const fail = (msg) => {
      if (dead) return;
      stopTimer();
      setError(msg);
      setConn('error');
    };

    // ================= HOST =================
    function stopTimer() {
      if (H.timer) { clearInterval(H.timer); H.timer = null; } // guarantees a single loop
    }
    function publish() {
      const view = {
        ...toSnapshot(H.state),
        msgSeq: ++H.msgSeq,
        round: H.round,
        phase: H.phase,
        countdown: H.countdown,
        rematch: H.rematch,
        peer: H.guestPresent,
      };
      setSnap(view);
      channel.send({ type: 'broadcast', event: 'snap', payload: view });
    }
    function startLoop() {
      stopTimer();
      H.phase = 'playing';
      H.timer = setInterval(() => {
        step(H.state);
        if (H.state.status === 'over') {
          H.phase = 'over';
          stopTimer();
        }
        publish();
      }, TICK_MS);
      publish();
    }
    function startRound() {
      stopTimer();
      H.state = createState();
      H.rematch = [false, false];
      H.phase = 'countdown';
      H.countdown = 3;
      publish();
      H.timer = setInterval(() => {
        H.countdown--;
        if (H.countdown <= 0) startLoop();
        else publish();
      }, 1000);
    }
    function hostPresence(guests) {
      const has = guests.length > 0;
      if (has && !H.guestPresent) {
        H.guestPresent = true;
        if (H.phase === 'waiting') startRound();
        else if (H.phase === 'playing') startLoop(); // guest returned mid-match: resume + resend full snapshot
        else publish();
      } else if (!has && H.guestPresent) {
        H.guestPresent = false;
        if (H.phase === 'playing' || H.phase === 'countdown') {
          stopTimer(); // pause until they return
          if (H.phase === 'countdown') H.phase = 'waiting';
        }
        if (H.phase === 'over') H.rematch = [false, false];
        publish();
      }
    }

    // ================= GUEST =================
    function guestPresence(hosts, guests) {
      if (hosts.length) {
        G.sawHost = true;
        if (G.hostTimer) { clearTimeout(G.hostTimer); G.hostTimer = null; }
        const first = [...guests].sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1))[0];
        if (first && first.id !== id) fail('This room already has two players.');
      } else if (G.sawHost) {
        fail('The host disconnected. The match has ended.');
      } else if (!G.hostTimer) {
        G.hostTimer = setTimeout(() => fail('Room not found. Check the code, or ask the host to create a new room.'), 3500);
      }
    }

    channel
      .on('presence', { event: 'sync' }, () => {
        if (dead) return;
        const metas = Object.values(channel.presenceState()).flatMap((arr) => arr);
        const hosts = metas.filter((m) => m.role === 'host');
        const guests = metas.filter((m) => m.role === 'guest');
        if (isHost) {
          const firstHost = [...hosts].sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1))[0];
          if (firstHost && firstHost.id !== id) return fail('That room code is already in use. Go back and create a new room.');
          hostPresence(guests);
        } else guestPresence(hosts, guests);
      })
      .on('broadcast', { event: 'snap' }, ({ payload }) => {
        if (isHost || dead) return;
        if (payload.msgSeq <= G.lastSeq) return; // stale / out of order
        G.lastSeq = payload.msgSeq;
        setSnap(payload);
      })
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        if (!isHost || H.phase !== 'playing') return;
        queueDirection(H.state, 1, payload.dir); // guest can only ever steer Player 2
      })
      .on('broadcast', { event: 'rematch' }, () => {
        if (!isHost || H.phase !== 'over') return;
        H.rematch[1] = true;
        if (H.rematch[0]) startRound(); else publish();
      })
      .subscribe(async (status) => {
        if (dead) return;
        if (status === 'SUBSCRIBED') {
          await channel.track({ id, role, joinedAt });
          setConn('ready');
          if (isHost) setSnap({ ...toSnapshot(H.state), msgSeq: 0, round: 1, phase: 'waiting', countdown: 3, rematch: [false, false], peer: false });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          fail('Could not connect to the game server. Check your Supabase settings and internet.');
        } else if (status === 'CLOSED' && !dead) {
          fail('Connection closed.');
        }
      });

    api.current = {
      sendInput(dir) {
        if (isHost) { if (H.phase === 'playing') queueDirection(H.state, 0, dir); }
        else channel.send({ type: 'broadcast', event: 'input', payload: { dir } });
      },
      requestRematch() {
        if (isHost) {
          if (H.phase !== 'over') return;
          H.rematch[0] = true;
          if (H.rematch[1]) startRound(); else publish();
        } else {
          setSnap((s) => (s ? { ...s, rematch: [s.rematch[0], true] } : s));
          channel.send({ type: 'broadcast', event: 'rematch', payload: {} });
        }
      },
    };

    return () => {
      dead = true;
      stopTimer();
      if (G.hostTimer) clearTimeout(G.hostTimer);
      supabase.removeChannel(channel); // no leaked/duplicate subscriptions
      chRef.current = null;
    };
  }, [code, role, isHost]);

  const sendInput = useCallback((d) => api.current.sendInput?.(d), []);
  const requestRematch = useCallback(() => api.current.requestRematch?.(), []);
  return { conn, error, snap, sendInput, requestRematch, isHost };
}
