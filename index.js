import express from 'express';
import cors from 'cors';
import { makeProviders, makeStandardFetcher, targets } from '@movie-web/providers';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
// FIXED: Double pipe || for the port
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const providers = makeProviders({
  fetcher: makeStandardFetcher(fetch),
  target: targets.ANY,
});

app.get('/api/stream', async (req, res) => {
  const { tmdbId, type, title, releaseYear, season, episode } = req.query;

  try {
    const media = {
      type: type, 
      title: title,
      releaseYear: Number(releaseYear),
      tmdbId: tmdbId,
      ...(type === 'show' && {
        season: { number: Number(season) },
        episode: { number: Number(episode) }
      })
    };

    const output = await providers.runAll({ media });

    if (!output) {
        return res.status(404).json({ error: "No stream found." });
    }

    res.json(output);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIXED: Cleaner proxy logic
app.use('/proxy', createProxyMiddleware({
  target: 'http://localhost:3000', // Dummy target
  router: (req) => {
    try {
        const url = new URL(req.query.url);
        return url.origin;
    } catch (e) {
        return '';
    }
  },
  pathRewrite: (path, req) => {
    try {
        const url = new URL(req.query.url);
        return url.pathname + url.search;
    } catch (e) {
        return path;
    }
  },
  changeOrigin: true,
  onProxyRes: (proxyRes) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = '*';
  }
}));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
