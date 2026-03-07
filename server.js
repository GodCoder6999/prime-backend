import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors({ origin: '*' })); 

app.get('/', (req, res) => res.send('🚀 Zero-Storage Pass-Through Proxy is Live!'));

app.get('/api/stream-video', async (req, res) => {
    const { sourceUrl } = req.query;
    if (!sourceUrl) return res.status(400).send('Missing sourceUrl');

    try {
        console.log(`[Stream Pipe] Connecting to: ${sourceUrl}`);
        const range = req.headers.range;
        const headers = range ? { 'Range': range } : {};

        const response = await axios({
            method: 'get',
            url: sourceUrl,
            responseType: 'stream',
            headers: headers,
            validateStatus: (status) => status >= 200 && status < 300 
        });

        res.status(response.status);
        for (const [key, value] of Object.entries(response.headers)) {
            res.setHeader(key, value);
        }

        response.data.pipe(res);

        req.on('close', () => {
            response.data.destroy();
        });

    } catch (error) {
        console.error('[Stream Pipe Error]:', error.message);
        if (!res.headersSent) res.status(500).send('Failed to stream the video.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
