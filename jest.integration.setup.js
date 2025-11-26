require('@testing-library/jest-dom');

// Mock Web Worker for integration tests
class WorkerMock {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(msg) {
    // Mock worker behavior - simulate async response
    if (msg.type === 'load') {
      // Simulate progress updates during model loading
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              requestId: msg.requestId,
              status: 'loading',
              progress: 25,
              message: 'Downloading model...'
            }
          });
        }
      }, 10);
      
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              requestId: msg.requestId,
              status: 'loading',
              progress: 50,
              message: 'Loading model...'
            }
          });
        }
      }, 20);
      
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              requestId: msg.requestId,
              status: 'loading',
              progress: 75,
              message: 'Initializing...'
            }
          });
        }
      }, 30);
      
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              requestId: msg.requestId,
              status: 'ready',
              message: 'Model loaded successfully'
            }
          });
        }
      }, 40);
      
    } else if (msg.type === 'transcribe') {
      // Simulate progress
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              requestId: msg.requestId,
              status: 'progress',
              progress: 50,
              message: 'Processing...'
            }
          });
        }
      }, 20);
      
      // Simulate completion
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              requestId: msg.requestId,
              status: 'complete',
              result: {
                text: 'Mock transcription result',
                chunks: [],
                duration: 1000
              }
            }
          });
        }
      }, 40);
    }
  }

  addEventListener(event, handler) {
    if (event === 'message') {
      this.onmessage = handler;
    } else if (event === 'error') {
      this.onerror = handler;
    }
  }

  removeEventListener(event, handler) {
    if (event === 'message') {
      this.onmessage = null;
    } else if (event === 'error') {
      this.onerror = null;
    }
  }

  terminate() {
    this.onmessage = null;
    this.onerror = null;
  }
}

global.Worker = WorkerMock;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Polyfill Blob.arrayBuffer() for jsdom
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function() {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock AudioContext for audio processing tests
class MockAudioContext {
  constructor() {
    this.sampleRate = 16000;
  }

  decodeAudioData(arrayBuffer) {
    return Promise.resolve({
      duration: 1.0,
      sampleRate: 16000,
      numberOfChannels: 1,
      length: 16000,
      getChannelData: (channel) => new Float32Array(16000)
    });
  }

  close() {
    return Promise.resolve();
  }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

