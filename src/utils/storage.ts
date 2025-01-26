interface StorageData {
  openaiKey?: string;
  geminiKey?: string;
  aiProvider?: 'openai' | 'gemini';
  [key: string]: any;
}

class Storage {
  private isExtension: boolean;

  constructor() {
    this.isExtension = typeof chrome !== 'undefined' && chrome.storage !== undefined;
  }

  async get(keys: string[]): Promise<StorageData> {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.sync.get(keys, (result) => {
          resolve(result as StorageData);
        });
      });
    } else {
      const result: StorageData = {};
      keys.forEach((key) => {
        result[key] = localStorage.getItem(key);
      });
      return result;
    }
  }

  async set(data: StorageData): Promise<void> {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.sync.set(data, () => {
          resolve();
        });
      });
    } else {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          localStorage.setItem(key, value);
        } else {
          localStorage.removeItem(key);
        }
      });
    }
  }

  async remove(keys: string[]): Promise<void> {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.sync.remove(keys, () => {
          resolve();
        });
      });
    } else {
      keys.forEach((key) => {
        localStorage.removeItem(key);
      });
    }
  }

  async clear(): Promise<void> {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.sync.clear(() => {
          resolve();
        });
      });
    } else {
      localStorage.clear();
    }
  }
}

export const storage = new Storage();