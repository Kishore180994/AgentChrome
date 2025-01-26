// Simplified recording implementation without external dependencies
interface Action {
  type: string;
  timestamp: number;
  data?: any;
}

class SimpleRecorder {
  private actions: Action[] = [];
  private isRecording: boolean = false;
  private debug: boolean;

  constructor(config: { debug?: boolean; autoStart?: boolean }) {
    this.debug = config.debug || false;
    if (config.autoStart) {
      this.start();
    }
  }

  start() {
    this.isRecording = true;
    if (this.debug) {
      console.log('Recording started');
    }
  }

  stop() {
    this.isRecording = false;
    if (this.debug) {
      console.log('Recording stopped');
    }
  }

  addAction(type: string, data?: any) {
    if (!this.isRecording) return;
    
    const action: Action = {
      type,
      timestamp: Date.now(),
      data
    };
    
    this.actions.push(action);
    
    if (this.debug) {
      console.log('Action recorded:', action);
    }
  }

  getActions() {
    return [...this.actions];
  }

  clear() {
    this.actions = [];
    if (this.debug) {
      console.log('Actions cleared');
    }
  }
}

// Initialize recorder with default configuration
const recorder = new SimpleRecorder({
  debug: process.env.NODE_ENV === 'development',
  autoStart: false,
});

// Export helper functions for common operations
export const startRecording = () => recorder.start();
export const stopRecording = () => recorder.stop();
export const getRecordedActions = () => recorder.getActions();
export const clearRecordedActions = () => recorder.clear();
export const recordAction = (type: string, data?: any) => recorder.addAction(type, data);