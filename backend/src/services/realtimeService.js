const EventEmitter = require('events');

class RealtimeService extends EventEmitter {
  constructor() {
    super();
    // Allow high number of local event listeners
    this.setMaxListeners(1000);
    // Active SSE client connections: channel -> Set of response objects
    this.clients = new Map();
  }

  /**
   * Register a new client for a specific channel
   * @param {string} channel
   * @param {object} res Express response object
   * @returns {Function} Unsubscribe cleanup function
   */
  subscribe(channel, res) {
    if (!this.clients.has(channel)) {
      this.clients.set(channel, new Set());
    }
    const channelClients = this.clients.get(channel);
    channelClients.add(res);

    // Keep-alive heartbeat every 30s
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (e) {
        clearInterval(heartbeat);
      }
    }, 30000);

    const cleanup = () => {
      clearInterval(heartbeat);
      channelClients.delete(res);
      if (channelClients.size === 0) {
        this.clients.delete(channel);
      }
    };

    res.on('close', cleanup);
    res.on('finish', cleanup);

    return cleanup;
  }

  /**
   * Broadcast an event payload to all local subscribers of a channel
   * @param {string} channel e.g., 'submission:xyz', 'event:abc'
   * @param {string} eventType e.g., 'COMMENT_CREATED', 'ANNOUNCEMENT_POSTED'
   * @param {object} data
   */
  publish(channel, eventType, data) {
    const payload = {
      channel,
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    };

    // 1. Emit internal Node.js event
    this.emit(channel, payload);
    this.emit('message', payload);

    // 2. Broadcast to active SSE HTTP connections
    const channelClients = this.clients.get(channel);
    if (channelClients && channelClients.size > 0) {
      const sseMessage = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
      for (const client of channelClients) {
        try {
          client.write(sseMessage);
        } catch (err) {
          channelClients.delete(client);
        }
      }
    }
  }

  /**
   * Get active connection statistics
   */
  getStats() {
    let totalConnections = 0;
    const channels = {};
    for (const [channel, clients] of this.clients.entries()) {
      channels[channel] = clients.size;
      totalConnections += clients.size;
    }
    return {
      totalConnections,
      channels,
    };
  }
}

// Export singleton instance
const realtimeService = new RealtimeService();
module.exports = realtimeService;
