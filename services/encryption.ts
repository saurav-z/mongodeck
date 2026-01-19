import { EncryptionKey } from '../types';

const STORAGE_KEY = 'mongodeck_encryption_key';

// Generate a random encryption key
export const generateEncryptionKey = (): EncryptionKey => {
  const key = Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 256)
  );
  const iv = Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 256)
  );
  
  return {
    key: btoa(String.fromCharCode(...key)),
    iv: btoa(String.fromCharCode(...iv))
  };
};

// Get or create encryption key
export const getEncryptionKey = (): EncryptionKey => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  const newKey = generateEncryptionKey();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newKey));
  return newKey;
};

// Simple XOR encryption (for demonstration - in production use Web Crypto API)
export const encrypt = (data: string, key: EncryptionKey): string => {
  const keyBytes = Uint8Array.from(atob(key.key), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(key.iv), c => c.charCodeAt(0));
  
  const dataBytes = new TextEncoder().encode(data);
  const encrypted = new Uint8Array(dataBytes.length);
  
  for (let i = 0; i < dataBytes.length; i++) {
    const keyIndex = (i + ivBytes[i % ivBytes.length]) % keyBytes.length;
    encrypted[i] = dataBytes[i] ^ keyBytes[keyIndex];
  }
  
  return btoa(String.fromCharCode(...encrypted));
};

// Simple XOR decryption
export const decrypt = (encryptedData: string, key: EncryptionKey): string => {
  const keyBytes = Uint8Array.from(atob(key.key), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(key.iv), c => c.charCodeAt(0));
  
  const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const decrypted = new Uint8Array(encryptedBytes.length);
  
  for (let i = 0; i < encryptedBytes.length; i++) {
    const keyIndex = (i + ivBytes[i % ivBytes.length]) % keyBytes.length;
    decrypted[i] = encryptedBytes[i] ^ keyBytes[keyIndex];
  }
  
  return new TextDecoder().decode(decrypted);
};

// Secure storage for connections
export const saveEncryptedConnections = (connections: any[]): void => {
  const key = getEncryptionKey();
  const data = JSON.stringify(connections);
  const encrypted = encrypt(data, key);
  localStorage.setItem('mongodeck_encrypted_connections', encrypted);
};

export const loadEncryptedConnections = (): any[] => {
  const key = getEncryptionKey();
  const encrypted = localStorage.getItem('mongodeck_encrypted_connections');
  
  if (!encrypted) return [];
  
  try {
    const decrypted = decrypt(encrypted, key);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt connections:', error);
    return [];
  }
};

// Legacy support for unencrypted data
export const migrateLegacyConnections = (): void => {
  const legacy = localStorage.getItem('mongodeck_saved_connections');
  if (legacy) {
    try {
      const connections = JSON.parse(legacy);
      if (connections.length > 0) {
        saveEncryptedConnections(connections);
        localStorage.removeItem('mongodeck_saved_connections');
        console.log('Migrated legacy connections to encrypted storage');
      }
    } catch (error) {
      console.error('Failed to migrate legacy connections:', error);
    }
  }
};
