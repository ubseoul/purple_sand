# Purple Sand

Purple Sand is a personal Reddit-style intelligence dashboard for a calmer, higher-signal internet.

It mixes reputable news, Al Jazeera, anime, League of Legends, and local weather into one private feed that learns from your behavior while staying transparent about why each item is ranked.

## What it does now

- Pulls live RSS feeds through a browser-friendly RSS-to-JSON layer
- Ranks items with a transparent signal score
- Learns from opens, saves, and explicit “More/Less” feedback
- Offers feed modes: Balanced, Focus, Culture, and Night
- Lets you tune topic weights with sliders
- Shows source health/status chips
- Supports search, sorting, saving, and local weather
- Works as a static GitHub Pages app with no backend required

## Source mix

- BBC World
- NPR News
- Al Jazeera
- Anime News Network
- League of Legends official news
- LoL Esports

## Ranking logic

Purple Sand combines:

1. Source credibility
2. Freshness decay
3. Manual topic preferences
4. Feed mode weighting
5. Learned behavior from opens and saves
6. Clickbait penalty
7. Fallback handling when feeds fail

Every card includes a “why” explanation so the feed is inspectable instead of mysterious.

## Files

- `index.html` — app shell, feed modes, controls, card template
- `styles.css` — mobile-first premium interface
- `app.js` — live RSS ingestion, ranking, learning, weather, persistence

## Running locally

Open `index.html` in a browser.

For best results, deploy with GitHub Pages because browser security rules can behave differently when opened as a local file.

## Deployment

1. Go to repository Settings
2. Open Pages
3. Set source to `main` branch
4. Save

## Next major upgrades

- Add a tiny backend/proxy to avoid RSS proxy limits
- Add user-defined source management
- Add Notion-style notes or reactions on saved articles
- Add a Prince Ube creative inspiration lane
- Add morning/evening automatic mode switching
- Add summary generation for saved items
