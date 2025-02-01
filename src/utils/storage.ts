interface StorageData {
  openaiKey?: string;
  geminiKey?: string;
  aiProvider?: "openai" | "gemini";
  [key: string]: any;
}

class Storage {
  private isExtension: boolean;

  constructor() {
    this.isExtension =
      typeof chrome !== "undefined" && chrome.storage !== undefined;
  }

  async get(keys: string[]): Promise<StorageData> {
    if (this.isExtension) {
      // Use Chrome storage
      return new Promise((resolve) => {
        chrome.storage.sync.get(keys, (result) => {
          resolve(result as StorageData);
        });
      });
    } else {
      // Use localStorage, but parse JSON
      const result: StorageData = {};
      keys.forEach((key) => {
        const rawValue = localStorage.getItem(key);
        if (rawValue !== null) {
          try {
            result[key] = JSON.parse(rawValue);
          } catch {
            // Fallback if it was plain text, not JSON
            result[key] = rawValue;
          }
        } else {
          result[key] = undefined;
        }
      });
      return result;
    }
  }

  async set(data: StorageData): Promise<void> {
    if (this.isExtension) {
      // Use Chrome storage
      return new Promise((resolve) => {
        chrome.storage.sync.set(data, () => {
          resolve();
        });
      });
    } else {
      // Use localStorage, but JSON-stringify objects/arrays
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          // Safely store any type of data as a JSON string
          localStorage.setItem(key, JSON.stringify(value));
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
