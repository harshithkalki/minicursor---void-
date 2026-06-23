import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();


const client = new OpenAI(
      {apiKey: process.env.OPENAI_API_KEY}
);

interface Store {
    snippet:string
    vector:number[]
}

function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0)
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dot / (magA * magB)
}


const snippets  =[ `function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    // Extract token from 'Bearer <TOKEN>' format
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token missing' });
    }

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        // Attach decoded payload to the request object for downstream routes
        req.user = decodedUser;
        next();
    });
}`,

`app.post('/api/login', (req, res) => {
    // Replace this mock with your actual database user validation logic
    const { username, password } = req.body;

    if (username === 'admin' && password === 'password') {
        const userPayload = { id: 101, username: 'admin', role: 'editor' };

        // Sign the token with a payload, secret key, and expiration time
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });

        return res.json({ success: true, token: \`Bearer token\` });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
});
`
]


export async function spike (){
    const store : Store[]= []
    for (const snippet of snippets) {
        const response = await client.embeddings.create({
            model: "text-embedding-3-small",
            input: snippet
        })
        const embedding = response.data[0]
        if (!embedding) throw new Error('No embedding returned');
        store.push({ snippet, vector: embedding.embedding })
    }
    const query = "how does token authentication work"
    const queryResponse = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: query
    })
    const queryEmbedding = queryResponse.data[0]
    if (!queryEmbedding) throw new Error('No query embedding returned');
    const queryVector = queryEmbedding.embedding

    const results = store.map(entry => ({
        snippet: entry.snippet.slice(0, 60),
        score: cosineSimilarity(queryVector, entry.vector)
    }))
    results.sort((a, b) => b.score - a.score)
    console.log('Query:', query)
    console.log('Results:')
    results.forEach((r, i) => console.log(`${i + 1}. score: ${r.score.toFixed(4)} | ${r.snippet}`))

    }

spike()
