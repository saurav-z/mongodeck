import { Database, Document, ServerStatus, QueryOptions, ConnectionConfig, CommandResult, DbExportConfig, CollectionExportConfig } from '../types';

const API_URL = '/api';

// Store the active configuration in memory to maintain connection context
let activeConfig: ConnectionConfig | null = null;

const getHeaders = () => {
    if (!activeConfig) throw new Error("Not connected");
    
    let uri = '';
    if (activeConfig.mode === 'uri' && activeConfig.uri) {
        uri = activeConfig.uri;
    } else {
        const auth = activeConfig.username ? `${activeConfig.username}:${activeConfig.password}@` : '';
        uri = `mongodb://${auth}${activeConfig.host || 'localhost'}:${activeConfig.port || '27017'}/${activeConfig.authDatabase || 'admin'}`;
    }

    return {
        'Content-Type': 'application/json',
        'x-mongo-uri': uri
    };
};

export const connect = async (config: ConnectionConfig): Promise<void> => {
    // Construct URI for testing connection
    let uri = '';
    if (config.mode === 'uri' && config.uri) {
        uri = config.uri;
    } else {
        const auth = config.username ? `${config.username}:${config.password}@` : '';
        uri = `mongodb://${auth}${config.host || 'localhost'}:${config.port || '27017'}/${config.authDatabase || 'admin'}`;
    }

    const res = await fetch(`${API_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Connection failed');
    }

    activeConfig = config;
};

export const getDatabases = async (): Promise<Database[]> => {
    const res = await fetch(`${API_URL}/databases`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const getServerStatus = async (): Promise<ServerStatus> => {
    const res = await fetch(`${API_URL}/status`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const getCollections = async (dbName: string): Promise<any[]> => {
    const res = await fetch(`${API_URL}/collections/${dbName}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const createCollection = async (dbName: string, colName: string): Promise<void> => {
    const res = await fetch(`${API_URL}/collection/${dbName}`, { 
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ collectionName: colName })
    });
    if (!res.ok) throw new Error(await res.text());
};

export const dropDatabase = async (dbName: string): Promise<void> => {
    const res = await fetch(`${API_URL}/database/${dbName}`, { 
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
};

export const dropCollection = async (dbName: string, colName: string): Promise<void> => {
    const res = await fetch(`${API_URL}/collection/${dbName}/${colName}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
};

export const truncateCollection = async (dbName: string, colName: string): Promise<void> => {
    const res = await fetch(`${API_URL}/collection/${dbName}/${colName}/truncate`, {
        method: 'POST',
        headers: getHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
};

export const bulkCollectionsAction = async (dbName: string, action: 'drop' | 'truncate', collections: string[]): Promise<any> => {
    const res = await fetch(`${API_URL}/collections/${dbName}/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action, collections })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const getDocuments = async (
    dbName: string, 
    colName: string, 
    filter: any = {}, 
    options: QueryOptions = {}
): Promise<{docs: Document[], total: number}> => {
    const res = await fetch(`${API_URL}/documents/${dbName}/${colName}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ filter, ...options })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const insertDocument = async (dbName: string, colName: string, doc: any): Promise<void> => {
    const res = await fetch(`${API_URL}/document/${dbName}/${colName}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ doc })
    });
    if (!res.ok) throw new Error(await res.text());
};

export const updateDocument = async (dbName: string, colName: string, id: string, newDoc: any): Promise<void> => {
    const res = await fetch(`${API_URL}/document/${dbName}/${colName}/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ update: newDoc })
    });
    if (!res.ok) throw new Error(await res.text());
};

export const deleteDocument = async (dbName: string, colName: string, id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/document/${dbName}/${colName}/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
};

export const executeCommand = async (command: string): Promise<CommandResult> => {
    const res = await fetch(`${API_URL}/command`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ command })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const exportDatabase = async (config: DbExportConfig): Promise<Blob> => {
    const res = await fetch(`${API_URL}/export/database`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
};

export const exportCollection = async (config: CollectionExportConfig): Promise<Blob> => {
    const res = await fetch(`${API_URL}/export/collection`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
};

export const importCollection = async (dbName: string, colName: string, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/import/collection/${dbName}/${colName}`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData
    });
    if (!res.ok) throw new Error(await res.text());
};