import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

const upload = multer({ storage: multer.memoryStorage() });

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

// Drop a collection
app.delete('/api/collection/:dbName/:colName', withMongo, async (req, res) => {
    try {
        const { dbName, colName } = req.params;
        const db = req.dbClient.db(dbName);
        const exists = await db.listCollections({ name: colName }).hasNext();
        if (!exists) return res.status(404).json({ error: 'Collection not found' });
        await db.collection(colName).drop();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Truncate (delete all documents) in a collection
app.post('/api/collection/:dbName/:colName/truncate', withMongo, async (req, res) => {
    try {
        const { dbName, colName } = req.params;
        const db = req.dbClient.db(dbName);
        const col = db.collection(colName);
        await col.deleteMany({});
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Bulk action on collections: { action: 'drop'|'truncate', collections: string[] }
app.post('/api/collections/:dbName/bulk', withMongo, async (req, res) => {
    try {
        const { dbName } = req.params;
        const { action, collections } = req.body;
        if (!Array.isArray(collections) || !action) return res.status(400).json({ error: 'Invalid payload' });

        const db = req.dbClient.db(dbName);
        const results = [];

        for (const colName of collections) {
            try {
                if (action === 'drop') {
                    const exists = await db.listCollections({ name: colName }).hasNext();
                    if (exists) await db.collection(colName).drop();
                    results.push({ collection: colName, status: 'dropped' });
                } else if (action === 'truncate') {
                    await db.collection(colName).deleteMany({});
                    results.push({ collection: colName, status: 'truncated' });
                } else {
                    results.push({ collection: colName, status: 'unknown action' });
                }
            } catch (e) {
                results.push({ collection: colName, error: e.message });
            }
        }

        res.json({ results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Execute MongoDB command
app.post('/api/command', withMongo, async (req, res) => {
    try {
        const { command } = req.body;
        if (!command) return res.status(400).json({ error: 'Command is required' });

        const startTime = Date.now();
        const db = req.dbClient.db();

        // Try to parse as JSON command object first
        let result;
        try {
            const cmdObj = JSON.parse(command);
            result = await db.command(cmdObj);
        } catch (parseError) {
            // If JSON parsing fails, try to execute as a simple command string
            // Common MongoDB commands that work without eval
            const trimmed = command.trim();

            // Handle db.method() style commands (mongosh syntax)
            if (trimmed.match(/^db\./i)) {
                const dbMethod = trimmed.substring(3).trim(); // Remove "db."

                // Handle collection methods with collection name (e.g., db.collection.find())
                if (dbMethod.match(/^[\w]+\./)) {
                    const match = dbMethod.match(/^([\w]+)\.([\w]+)(.*)$/i);
                    if (match) {
                        const colName = match[1];
                        const method = match[2].toLowerCase();
                        const args = match[3];

                        const col = db.collection(colName);

                        if (method === 'find') {
                            // Parse filter and options from args
                            let filter = {};
                            let limit = 10;

                            // Try to extract filter from find(...)
                            const filterMatch = args.match(/find\(([^)]*)\)/i);
                            if (filterMatch && filterMatch[1].trim()) {
                                try {
                                    filter = JSON.parse(filterMatch[1]);
                                } catch (e) {
                                    // If filter can't be parsed, use empty filter
                                }
                            }

                            // Try to extract limit from .limit(...)
                            const limitMatch = args.match(/limit\((\d+)\)/i);
                            if (limitMatch) {
                                limit = parseInt(limitMatch[1]);
                            }

                            result = await col.find(filter).limit(limit).toArray();
                        } else if (method === 'findone') {
                            let filter = {};
                            const filterMatch = args.match(/findOne\(([^)]*)\)/i);
                            if (filterMatch && filterMatch[1].trim()) {
                                try {
                                    filter = JSON.parse(filterMatch[1]);
                                } catch (e) { }
                            }
                            result = await col.findOne(filter);
                        } else if (method === 'countdocuments') {
                            let filter = {};
                            const filterMatch = args.match(/countDocuments\(([^)]*)\)/i);
                            if (filterMatch && filterMatch[1].trim()) {
                                try {
                                    filter = JSON.parse(filterMatch[1]);
                                } catch (e) { }
                            }
                            result = await col.countDocuments(filter);
                        } else if (method === 'aggregate') {
                            let pipeline = [];
                            const pipelineMatch = args.match(/aggregate\(([^)]*)\)/i);
                            if (pipelineMatch && pipelineMatch[1].trim()) {
                                try {
                                    pipeline = JSON.parse(pipelineMatch[1]);
                                } catch (e) { }
                            }
                            result = await col.aggregate(pipeline).toArray();
                        } else if (method === 'createindex') {
                            let indexSpec = {};
                            const indexMatch = args.match(/createIndex\(([^)]*)\)/i);
                            if (indexMatch && indexMatch[1].trim()) {
                                try {
                                    indexSpec = JSON.parse(indexMatch[1]);
                                } catch (e) { }
                            }
                            result = await col.createIndex(indexSpec);
                        } else if (method === 'drop') {
                            result = await col.drop();
                        } else {
                            throw new Error(`Unsupported collection method: ${method}. Try: find(), findOne(), countDocuments(), aggregate(), createIndex(), drop()`);
                        }
                    } else {
                        throw new Error(`Invalid collection method syntax. Use: db.collectionName.method()`);
                    }
                } else if (dbMethod.match(/^adminCommand\(/i)) {
                    const match = dbMethod.match(/adminCommand\(([^)]*)\)/i);
                    if (match) {
                        try {
                            const cmdObj = JSON.parse(match[1]);
                            const adminDb = req.dbClient.db().admin();
                            result = await adminDb.command(cmdObj);
                        } catch (e) {
                            throw new Error('Invalid adminCommand syntax. Use: db.adminCommand({ command: "value" })');
                        }
                    } else {
                        throw new Error('Invalid adminCommand syntax. Use: db.adminCommand({ command: "value" })');
                    }
                } else if (dbMethod.match(/^runCommand\(/i)) {
                    const match = dbMethod.match(/runCommand\(([^)]*)\)/i);
                    if (match) {
                        try {
                            const cmdObj = JSON.parse(match[1]);
                            result = await db.command(cmdObj);
                        } catch (e) {
                            throw new Error('Invalid runCommand syntax. Use: db.runCommand({ command: "value" })');
                        }
                    } else {
                        throw new Error('Invalid runCommand syntax. Use: db.runCommand({ command: "value" })');
                    }
                } else if (dbMethod.match(/^listDatabases\(\)/i)) {
                    const adminDb = req.dbClient.db().admin();
                    result = await adminDb.listDatabases();
                } else if (dbMethod.match(/^listCollections\(\)/i)) {
                    result = await db.listCollections().toArray();
                } else if (dbMethod.match(/^stats\(\)/i)) {
                    result = await db.stats();
                } else if (dbMethod.match(/^serverStatus\(\)/i)) {
                    const adminDb = req.dbClient.db().admin();
                    result = await adminDb.serverStatus();
                } else if (dbMethod.match(/^dropDatabase\(\)/i)) {
                    result = await db.dropDatabase();
                } else if (dbMethod.match(/^createCollection\(/i)) {
                    const match = dbMethod.match(/createCollection\(['"](\w+)['"]\)/i);
                    if (match) {
                        result = await db.createCollection(match[1]);
                    } else {
                        throw new Error('Invalid createCollection syntax. Use: db.createCollection("name")');
                    }
                } else if (dbMethod.match(/^dropCollection\(/i)) {
                    const match = dbMethod.match(/dropCollection\(['"](\w+)['"]\)/i);
                    if (match) {
                        result = await db.collection(match[1]).drop();
                    } else {
                        throw new Error('Invalid dropCollection syntax. Use: db.dropCollection("name")');
                    }
                } else {
                    throw new Error(`Unsupported db method: ${dbMethod}. Try: db.listDatabases(), db.listCollections(), db.stats(), db.serverStatus(), db.dropDatabase(), db.createCollection("name"), db.dropCollection("name"), db.collectionName.find(), db.collectionName.findOne(), db.collectionName.countDocuments(), db.collectionName.aggregate(), db.collectionName.createIndex(), db.collectionName.drop()`);
                }
            } else {
                // Handle simple commands without db. prefix
                const lowerTrimmed = trimmed.toLowerCase();

                if (lowerTrimmed === 'stats' || lowerTrimmed === 'dbstats') {
                    result = await db.stats();
                } else if (lowerTrimmed === 'serverstatus') {
                    const adminDb = req.dbClient.db().admin();
                    result = await adminDb.serverStatus();
                } else if (lowerTrimmed.startsWith('listdatabases')) {
                    const adminDb = req.dbClient.db().admin();
                    result = await adminDb.listDatabases();
                } else if (lowerTrimmed.startsWith('listcollections')) {
                    result = await db.listCollections().toArray();
                } else if (lowerTrimmed.startsWith('dropdatabase')) {
                    result = await db.dropDatabase();
                } else if (lowerTrimmed.startsWith('createcollection')) {
                    const match = lowerTrimmed.match(/createcollection\s+(\w+)/);
                    if (match) {
                        result = await db.createCollection(match[1]);
                    } else {
                        throw new Error('Invalid createCollection syntax. Use: createCollection <name>');
                    }
                } else if (lowerTrimmed.startsWith('dropcollection')) {
                    const match = lowerTrimmed.match(/dropcollection\s+(\w+)/);
                    if (match) {
                        result = await db.collection(match[1]).drop();
                    } else {
                        throw new Error('Invalid dropCollection syntax. Use: dropCollection <name>');
                    }
                } else {
                    throw new Error(`Unsupported command: ${command}. Try using mongosh syntax: db.collectionName.find(), db.listDatabases(), db.stats(), etc.`);
                }
            }
        }

        res.json({
            success: true,
            result: result,
            executionTime: Date.now() - startTime
        });
    } catch (e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

// Export database as JSON
app.post('/api/export/database', withMongo, async (req, res) => {
    try {
        const { dbName, format = 'json' } = req.body;
        if (!dbName) return res.status(400).json({ error: 'Database name is required' });

        const db = req.dbClient.db(dbName);
        const collections = await db.listCollections().toArray();

        const exportData = {
            database: dbName,
            exportedAt: new Date().toISOString(),
            collections: []
        };

        for (const colInfo of collections) {
            const col = db.collection(colInfo.name);
            const docs = await col.find({}).toArray();
            exportData.collections.push({
                name: colInfo.name,
                documents: docs
            });
        }

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${dbName}_${Date.now()}.json"`);
            res.send(JSON.stringify(exportData, null, 2));
        } else {
            res.status(400).json({ error: 'Unsupported format. Use "json"' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export collection
app.post('/api/export/collection', withMongo, async (req, res) => {
    try {
        const { dbName, colName, format = 'json', filter = {} } = req.body;
        if (!dbName || !colName) return res.status(400).json({ error: 'Database and collection names are required' });

        const db = req.dbClient.db(dbName);
        const col = db.collection(colName);

        const docs = await col.find(filter).toArray();

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${dbName}_${colName}_${Date.now()}.json"`);
            res.send(JSON.stringify(docs, null, 2));
        } else if (format === 'csv') {
            // Convert to CSV
            if (docs.length === 0) {
                res.setHeader('Content-Type', 'text/csv');
                res.send('');
                return;
            }

            const headers = Object.keys(docs[0]);
            const csvRows = [headers.join(',')];

            for (const doc of docs) {
                const row = headers.map(header => {
                    const value = doc[header];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                    return `"${String(value).replace(/"/g, '""')}"`;
                });
                csvRows.push(row.join(','));
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${dbName}_${colName}_${Date.now()}.csv"`);
            res.send(csvRows.join('\n'));
        } else {
            res.status(400).json({ error: 'Unsupported format. Use "json" or "csv"' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Import collection from file
app.post('/api/import/collection/:dbName/:colName', upload.single('file'), withMongo, async (req, res) => {
    try {
        const { dbName, colName } = req.params;

        // Get the file from the request
        if (!req.file && !req.body.data) {
            return res.status(400).json({ error: 'No file or data provided' });
        }

        const db = req.dbClient.db(dbName);
        const col = db.collection(colName);

        let data;
        if (req.file) {
            // Handle multipart form data
            const fileContent = req.file.buffer.toString('utf-8');
            data = JSON.parse(fileContent);
        } else {
            // Handle JSON body
            data = req.body.data;
        }

        // Validate data format
        if (!Array.isArray(data)) {
            return res.status(400).json({ error: 'Data must be an array of documents' });
        }

        // Insert documents
        if (data.length > 0) {
            const result = await col.insertMany(data);
            res.json({
                success: true,
                insertedCount: result.insertedCount
            });
        } else {
            res.json({ success: true, insertedCount: 0 });
        }
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