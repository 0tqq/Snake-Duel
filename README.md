# SNAKE DUEL

Two-player Snake. Play on one keyboard, or online from two laptops.

## Run
```
npm install
cp .env.example .env     # then fill in your Supabase values
npm run dev
```

## Supabase setup (about 3 minutes, no SQL or tables needed)
1. Go to https://supabase.com, sign in, click **New project** (free plan is fine).
2. Open **Project Settings -> API**.
3. Copy **Project URL** into `VITE_SUPABASE_URL` and the **anon public** key into `VITE_SUPABASE_ANON_KEY` in `.env`.
4. Realtime Broadcast and Presence are on by default. Nothing else to configure.
   Never use the `service_role` key in this app.

## Play from two laptops
1. Laptop A: open the site, click **Create Room**, then **Copy invitation link**.
2. Laptop B: open that link (or type the 6-character code and click **Join**).
3. A 3-second countdown starts. Steer with W A S D or the arrow keys. Host = Blue, guest = Red.
(To test alone, open the link in two browser tabs.)

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. Vercel -> **Add New Project** -> import the repo (Framework: Vite, auto-detected).
3. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy, then share the Vercel URL with your friend.

## How it works
Host (room creator) runs the only game simulation and broadcasts a snapshot each tick (with a sequence number so
stale ones are ignored). The guest only sends direction inputs. Presence tracks who is in the room.

## Known limitations
- Host refresh or disconnect ends the match (host holds the game state).
- If the guest drops mid-match, the game pauses until they return.
- Channels are public (anyone with the room code can join); a third player is rejected by the client.
  Strict server-side authorization would need Supabase Auth + Realtime RLS policies.
- Not yet verified against a live Supabase project (needs your keys).
