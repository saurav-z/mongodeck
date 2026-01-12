export interface Document {
  _id: string;
  [key: string]: any;
}

export interface Collection {
  name: string;
  docs: Document[];
}

export interface Database {
  name: string;
  collections: Collection[];
  sizeOnDisk?: number;
}

export interface ConnectionConfig {
  mode: 'standard' | 'uri';
  uri?: string;
  name: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  authDatabase?: string;
}

export interface QueryOptions {
  sort?: { [key: string]: 1 | -1 };
  limit?: number;
  skip?: number;
}

export enum ViewMode {
  TABLE = 'TABLE',
  JSON = 'JSON',
  CARD = 'CARD'
}

export interface ServerStatus {
  version: string;
  uptime: number;
  connections: number;
  memoryUsage: number;
}