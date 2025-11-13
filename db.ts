export interface ListItem {
    id: number;
    text: string;
    completed: boolean;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
}

const DB_NAME = 'ZenithDB';
const STORE_NAME = 'supermarket';
const DB_VERSION = 1;

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB error:', (event.target as IDBRequest).error);
            reject('Error opening database');
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBRequest).result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const getItems = async (): Promise<ListItem[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = (event) => reject('Error fetching items: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve(request.result);
    });
};

export const addItem = async (item: ListItem): Promise<ListItem> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(item);

        request.onerror = (event) => reject('Error adding item: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve(item);
    });
};

export const updateItem = async (item: ListItem): Promise<ListItem> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(item);

        request.onerror = (event) => reject('Error updating item: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve(item);
    });
};

export const deleteItem = async (id: number): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onerror = (event) => reject('Error deleting item: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve();
    });
};

export const clearAllItems = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        
        request.onerror = (event) => reject('Error clearing store: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve();
    });
};
