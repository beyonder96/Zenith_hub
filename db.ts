export interface ListItem {
    id: number;
    text: string;
    completed: boolean;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
}

export interface Task {
    id: number;
    text: string;
    completed: boolean;
    dueDate?: string; // YYYY-MM-DD
    importance?: 'low' | 'medium' | 'high';
}


const DB_NAME = 'ZenithDB';
const SUPERMARKET_STORE_NAME = 'supermarket';
const PRODUCTIVITY_STORE_NAME = 'productivityTasks';
const DB_VERSION = 3;

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
            if (!dbInstance.objectStoreNames.contains(SUPERMARKET_STORE_NAME)) {
                dbInstance.createObjectStore(SUPERMARKET_STORE_NAME, { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains(PRODUCTIVITY_STORE_NAME)) {
                dbInstance.createObjectStore(PRODUCTIVITY_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

// Supermarket functions
export const getItems = async (): Promise<ListItem[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SUPERMARKET_STORE_NAME], 'readonly');
        const store = transaction.objectStore(SUPERMARKET_STORE_NAME);
        const request = store.getAll();

        request.onerror = (event) => reject('Error fetching items: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve(request.result);
    });
};

export const addItem = async (item: ListItem): Promise<ListItem> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SUPERMARKET_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SUPERMARKET_STORE_NAME);
        const request = store.add(item);

        request.onerror = (event) => reject('Error adding item: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve(item);
    });
};

export const updateItem = async (item: ListItem): Promise<ListItem> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SUPERMARKET_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SUPERMARKET_STORE_NAME);
        const request = store.put(item);

        request.onerror = (event) => reject('Error updating item: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve(item);
    });
};

export const deleteItem = async (id: number): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SUPERMARKET_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SUPERMARKET_STORE_NAME);
        const request = store.delete(id);
        
        request.onerror = (event) => reject('Error deleting item: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve();
    });
};

export const clearAllItems = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SUPERMARKET_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SUPERMARKET_STORE_NAME);
        const request = store.clear();
        
        request.onerror = (event) => reject('Error clearing store: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve();
    });
};

// Productivity Task functions
export const getTasks = async (): Promise<Task[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PRODUCTIVITY_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PRODUCTIVITY_STORE_NAME);
        const request = store.getAll();

        request.onerror = (event) => reject('Error fetching tasks: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve(request.result);
    });
};

export const addTask = async (task: Task): Promise<Task> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PRODUCTIVITY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PRODUCTIVITY_STORE_NAME);
        const request = store.add(task);

        request.onerror = (event) => reject('Error adding task: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve(task);
    });
};

export const updateTask = async (task: Task): Promise<Task> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PRODUCTIVITY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PRODUCTIVITY_STORE_NAME);
        const request = store.put(task);

        request.onerror = (event) => reject('Error updating task: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve(task);
    });
};

export const deleteTask = async (id: number): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PRODUCTIVITY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PRODUCTIVITY_STORE_NAME);
        const request = store.delete(id);
        
        request.onerror = (event) => reject('Error deleting task: ' + (event.target as IDBRequest).error);
        request.onsuccess = () => resolve();
    });
};