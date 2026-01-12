import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Connection Cache
// Key: URI, Value: MongoClient instance
const clients = {};

const getClient = async (uri) => {
  if (!clients[uri]) {
    const client = new MongoClient(uri);
    await client.connect();
    clients[uri] = client;
    
    // Handle disconnects
    client.on('close', () => {
        delete clients[uri];
    });
  }
  return clients[uri];
};

// Middleware to extract URI and get client
const withMongo = async (req, res, next) => {
  const uri = req.headers['x-mongo-uri'];
  if (!uri) {
    return res.status(400).json({ error: 'Missing MongoDB URI header' });
  }

  try {
    const client = await getClient(uri);
    req.dbClient = client;
    next();
  } catch (error) {
    console.error("Connection Error:", error);
    res.status(500).json({ error: 'Failed to connect to MongoDB instance' });
  }
};

const hexIdRegex = /^[0-9a-fA-F]{24}$/;

// Helper to convert string IDs to ObjectId in filters
const normalizeFilter = (filter) => {
    if (!filter) return {};
    const newFilter = JSON.parse(JSON.stringify(filter));
    const process = (obj) => {
        for (const key in obj) {
            if (key === '_id' && typeof obj[key] === 'string' && hexIdRegex.test(obj[key])) {
                obj[key] = new ObjectId(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                process(obj[key]);
            }
        }
    };
    process(newFilter);
    return newFilter;
};

// --- API Routes ---

app.post('/api/connect', async (req, res) => {
    const { uri } = req.body;
    try {
        await getClient(uri);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/databases', withMongo, async (req, res) => {
    try {
        let dbList = [];
        try {
             // Try to list all databases (requires cluster permissions)
            const adminDb = req.dbClient.db().admin();
            const result = await adminDb.listDatabases();
            dbList = result.databases;
        } catch (e) {
            console.warn("Could not list databases (likely permission issue). Falling back to current DB.");
            // Fallback: If user provided a specific DB in URI, return just that one
            const currentDbName = req.dbClient.db().databaseName;
            // 'test' is default if none specified, usually better to show it than nothing
            dbList = [{ name: currentDbName, sizeOnDisk: 0, empty: false }];
        }

        // Fetch collections for accessible databases
        const dbs = await Promise.all(dbList.map(async (dbInfo) => {
            try {
                const db = req.dbClient.db(dbInfo.name);
                const cols = await db.listCollections().toArray();
                return {
                    name: dbInfo.name,
                    sizeOnDisk: dbInfo.sizeOnDisk,
                    collections: cols.map(c => ({ name: c.name, docs: [] }))
                };
            } catch (e) {
                // Return just the name if we can't inspect it
                return { name: dbInfo.name, collections: [] };
            }
        }));
        res.json(dbs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/status', withMongo, async (req, res) => {
    try {
        const adminDb = req.dbClient.db().admin();
        const info = await adminDb.serverStatus();
        res.json({
            version: info.version,
            uptime: info.uptime,
            connections: info.connections.current,
            memoryUsage: Math.round(info.mem.resident)
        });
    } catch (e) {
        // Fallback status for restricted users
        res.json({
            version: 'Unknown (Restricted)',
            uptime: 0,
            connections: 1,
            memoryUsage: 0
        });
    }
});

app.get('/api/collections/:dbName', withMongo, async (req, res) => {
    try {
        const db = req.dbClient.db(req.params.dbName);
        const cols = await db.listCollections().toArray();
        const detailedCols = await Promise.all(cols.map(async c => {
            try {
                const count = await db.collection(c.name).estimatedDocumentCount();
                return { name: c.name, docs: Array(count).fill(null) };
            } catch {
                return { name: c.name, docs: [] };
            }
        }));
        res.json(detailedCols);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/collection/:dbName', withMongo, async (req, res) => {
    try {
        const { collectionName } = req.body;
        await req.dbClient.db(req.params.dbName).createCollection(collectionName);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/database/:dbName', withMongo, async (req, res) => {
    try {
        await req.dbClient.db(req.params.dbName).dropDatabase();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/documents/:dbName/:colName', withMongo, async (req, res) => {
    try {
        const { filter = {}, sort = { _id: -1 }, limit = 20, skip = 0 } = req.body;
        const col = req.dbClient.db(req.params.dbName).collection(req.params.colName);
        const safeFilter = normalizeFilter(filter);
        const docs = await col.find(safeFilter).sort(sort).skip(skip).limit(limit).toArray();
        const total = await col.countDocuments(safeFilter);
        res.json({ docs, total });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/document/:dbName/:colName', withMongo, async (req, res) => {
    try {
        const { doc } = req.body;
        const col = req.dbClient.db(req.params.dbName).collection(req.params.colName);
        const result = await col.insertOne(doc);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/document/:dbName/:colName/:id', withMongo, async (req, res) => {
    try {
        const { update } = req.body;
        const { id } = req.params;
        const col = req.dbClient.db(req.params.dbName).collection(req.params.colName);
        let queryId = id;
        if (hexIdRegex.test(id)) queryId = new ObjectId(id);
        const { _id, ...cleanUpdate } = update;
        const result = await col.updateOne({ _id: queryId }, { $set: cleanUpdate });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/document/:dbName/:colName/:id', withMongo, async (req, res) => {
    try {
        const { id } = req.params;
        const col = req.dbClient.db(req.params.dbName).collection(req.params.colName);
        let queryId = id;
        if (hexIdRegex.test(id)) queryId = new ObjectId(id);
        await col.deleteOne({ _id: queryId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Static Serving (Production) ---
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Catch-all: Route everything else to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`MongoDeck Backend running at http://localhost:${port}`);
});