const fs = require('node:fs');
const path = require('node:path');

const RING_SIZE = 500;

// Mirrors the old launcher's `| tee dev.log`: everything the vite child prints
// lands in <root>/dev.log, plus an in-memory ring buffer for error dialogs.
class Logger {
  constructor() {
    this.ring = [];
    this.stream = null;
    this.logPath = null;
  }

  attachFile(root) {
    this.logPath = path.join(root, 'dev.log');
    try {
      this.stream = fs.createWriteStream(this.logPath, { flags: 'a' });
      this.stream.on('error', () => { this.stream = null; });
    } catch {
      this.stream = null;
    }
  }

  write(chunk) {
    const text = chunk.toString();
    if (this.stream) this.stream.write(text);
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      this.ring.push(line);
      if (this.ring.length > RING_SIZE) this.ring.shift();
    }
  }

  line(message) {
    this.write(`[shell] ${message}\n`);
  }

  tail(n = 200) {
    return this.ring.slice(-n).join('\n');
  }
}

module.exports = { Logger };
