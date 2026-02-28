import express from 'express';
import cors from 'cors';
import { makeProviders, makeStandardFetcher, targets } from '@movie-web/providers';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT |

| 3000;

// 1. Basic Middleware
// Enable CORS so your frontend can communicate with this API
app.use(cors());
app.use(express.json());

// 2. Initialize the Scraping Engine
// Configures @movie-web/providers to run in the Node.js environment [1]
const providers = makeProviders({
  fetcher: makeStandardFetcher(fetch),
  target: targets.ANY,
});

// 3. Media Scraping Endpoint
// Your frontend will call this with a TMDB ID and details to get the streaming link
app.get('/api/stream', async (req, res) => {
  const { tmdbId, type, title, releaseYear, season, episode } = req.query;

  try {
    // Construct the media object based on user request
    const media = {
      type: type, // 'movie' or 'show'
      title: title,
      releaseYear: Number(releaseYear),
      tmdbId: tmdbId,
     ...(type === 'show' && {
        season: { number: Number(season) },
        episode: { number: Number(episode) }
      })
    };

    // Execute the scraper to find a valid source [2]
    const output = await providers.runAll({ media });

    if (!output) {
        return res.status(404).json({ error: "No stream found on known host domains." });
    }

    res.json(output);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. CORS Bypass Proxy for Video Playback
// Your frontend video player will request the.m3u8 link through this proxy
// It intercepts the response and artificially injects permissive CORS headers
app.use('/proxy', createProxyMiddleware({
  router: (req) => {
    // Dynamically route to the target URL provided in the query string
    // Example request from frontend: /proxy?url=https://target-cdn.com/video.m3u8
    return new URL(req.query.url).origin;
  },
  pathRewrite: (path, req) => {
    return new URL(req.query.url).pathname + new URL(req.query.url).search;
  },
  changeOrigin: true,
  onProxyRes: (proxyRes) => {
    // Inject permissive CORS headers into the outgoing video stream response
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = '*';
  }
}));

app.listen(PORT, () => {
  console.log(`Aggregator backend running on http://localhost:${PORT}`);
});