const express = require('express');
const WebSocket = require('ws');
const { createClient } = require('pg-listen');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 4003;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const PG_CONNECTION = {
  connectionString: process.env.DATABASE_URL || 'postgresql://nextmavens:Elishiba@95@nextmavens-db-m4sxnf.1.mvuvh68efk7jnvynmv8r2jm2u:5432/nextmavens'
};

// Store for active connections
const connections = new Map(); // connectionId -> { ws, userId, tenantId, subscriptions }
const channelSubscriptions = new Map(); // channelName -> Set of connectionIds

// PostgreSQL NOTIFY/LISTEN client
const pgClient = createClient(PG_CONNECTION);

// JWT verification middleware
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// PostgreSQL notification handler
const handlePostgresNotification = async (payload) => {
  try {
    const { channel, payload: data } = payload;
    const notification = JSON.parse(data);

    console.log(`[PostgreSQL] Channel: ${channel}, Payload:`, notification);

    // Find all connections subscribed to this channel
    const subscribers = channelSubscriptions.get(channel);
    if (subscribers) {
      const message = JSON.stringify({
        type: 'postgres_change',
        payload: {
          data: notification.data,
          event: notification.event || 'INSERT',
          schema: notification.schema || 'public',
          table: notification.table,
          timestamp: new Date().toISOString()
        }
      });

      subscribers.forEach(connId => {
        const connection = connections.get(connId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
          // Check tenant isolation
          if (!notification.tenantId || connection.tenantId === notification.tenantId) {
            connection.ws.send(message);
          }
        }
      });
    }
  } catch (error) {
    console.error('[PostgreSQL] Notification error:', error);
  }
};

// Broadcast to all connections in a tenant
const broadcastToTenant = (tenantId, message, excludeConnectionId = null) => {
  connections.forEach((connection, connId) => {
    if (connection.tenantId === tenantId && connId !== excludeConnectionId) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
      }
    }
  });
};

// Broadcast to all connections subscribed to a channel
const broadcastToChannel = (channel, message) => {
  const subscribers = channelSubscriptions.get(channel);
  if (subscribers) {
    subscribers.forEach(connId => {
      const connection = connections.get(connId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
      }
    });
  }
};

// Presence system
const presenceState = new Map(); // channel -> Map of userId -> presence data

const updatePresence = (channel, userId, tenantId, data) => {
  if (!presenceState.has(channel)) {
    presenceState.set(channel, new Map());
  }

  const channelState = presenceState.get(channel);
  const existingState = channelState.get(userId);

  const presenceData = {
    ...data,
    user_id: userId,
    tenant_id: tenantId,
    online_at: existingState?.online_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  channelState.set(userId, presenceData);

  // Broadcast presence update to channel subscribers
  broadcastToChannel(channel, {
    type: 'presence',
    event: 'sync',
    payload: {
      [userId]: presenceData
    }
  });
};

const removePresence = (userId) => {
  presenceState.forEach((channelState, channel) => {
    if (channelState.has(userId)) {
      channelState.delete(userId);

      broadcastToChannel(channel, {
        type: 'presence',
        event: 'leave',
        payload: {
          user_id: userId,
          left_at: new Date().toISOString()
        }
      });
    }
  });
};

// Get presence state for a channel
const getPresenceState = (channel) => {
  const state = presenceState.get(channel);
  if (!state) return {};

  const result = {};
  state.forEach((data, userId) => {
    result[userId] = data;
  });
  return result;
};

// Initialize PostgreSQL LISTEN
const initializePostgresListener = async () => {
  try {
    await pgClient.connect();
    console.log('[PostgreSQL] Connected for LISTEN/NOTIFY');

    pgClient.notifications.on('error', (error) => {
      console.error('[PostgreSQL] Notification error:', error);
    });

    pgClient.notifications.on(handlePostgresNotification);

    // Listen to all channels dynamically
    pgClient.on('connected', () => {
      console.log('[PostgreSQL] Listener connected');
    });

    pgClient.on('error', (error) => {
      console.error('[PostgreSQL] Client error:', error);
    });

  } catch (error) {
    console.error('[PostgreSQL] Connection error:', error);
  }
};

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrade
wss.on('connection', (ws, req, tokenData) => {
  const connectionId = uuidv4();
  const { userId, tenantId, role } = tokenData;

  console.log(`[WebSocket] Connection ${connectionId} - User: ${userId}, Tenant: ${tenantId}`);

  // Initialize connection
  connections.set(connectionId, {
    ws,
    userId,
    tenantId,
    role,
    subscriptions: new Set()
  });

  // Send welcome message
  ws.send(JSON.stringify({
    event: 'system',
    type: 'connected',
    connectionId,
    timestamp: new Date().toISOString()
  }));

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      const connection = connections.get(connectionId);

      if (!connection) {
        ws.send(JSON.stringify({ error: 'Connection not found' }));
        return;
      }

      switch (message.type) {
        case 'subscribe':
          // Subscribe to PostgreSQL channel
          const channel = message.channel;
          if (channel) {
            // Add to channel subscriptions
            if (!channelSubscriptions.has(channel)) {
              channelSubscriptions.set(channel, new Set());

              // Subscribe to PostgreSQL notifications for this channel
              await pgClient.notify(channel, JSON.stringify({
                event: 'subscribe',
                data: { connectionId, userId }
              }));
            }

            channelSubscriptions.get(channel).add(connectionId);
            connection.subscriptions.add(channel);

            // Also listen in PostgreSQL
            await pgClient.listen(channel);

            ws.send(JSON.stringify({
              event: 'subscribed',
              channel,
              timestamp: new Date().toISOString()
            }));

            console.log(`[WebSocket] ${connectionId} subscribed to ${channel}`);
          }
          break;

        case 'unsubscribe':
          const unsubChannel = message.channel;
          if (unsubChannel && connection.subscriptions.has(unsubChannel)) {
            connection.subscriptions.delete(unsubChannel);

            const subs = channelSubscriptions.get(unsubChannel);
            if (subs) {
              subs.delete(connectionId);
              if (subs.size === 0) {
                channelSubscriptions.delete(unsubChannel);
                await pgClient.unlisten(unsubChannel);
              }
            }

            ws.send(JSON.stringify({
              event: 'unsubscribed',
              channel: unsubChannel,
              timestamp: new Date().toISOString()
            }));

            console.log(`[WebSocket] ${connectionId} unsubscribed from ${unsubChannel}`);
          }
          break;

        case 'broadcast':
          // Broadcast to other connections in the same tenant
          const broadcastMsg = message.payload;
          if (broadcastMsg) {
            broadcastToTenant(tenantId, {
              type: 'broadcast',
              event: broadcastMsg.event || 'message',
              payload: broadcastMsg,
              from: userId
            }, connectionId);

            ws.send(JSON.stringify({
              event: 'broadcast_sent',
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'presence':
          // Handle presence updates
          const presenceChannel = message.channel || 'presence';
          const presenceData = message.payload;

          updatePresence(presenceChannel, userId, tenantId, {
            ...presenceData,
            online: true
          });

          // Send current presence state to user
          ws.send(JSON.stringify({
            type: 'presence',
            event: 'state',
            channel: presenceChannel,
            payload: getPresenceState(presenceChannel)
          }));
          break;

        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;

        default:
          ws.send(JSON.stringify({
            error: 'Unknown message type',
            type: message.type
          }));
      }
    } catch (error) {
      console.error('[WebSocket] Message error:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`[WebSocket] Connection ${connectionId} closed`);

    // Remove from all channel subscriptions
    const connection = connections.get(connectionId);
    if (connection) {
      connection.subscriptions.forEach(channel => {
        const subs = channelSubscriptions.get(channel);
        if (subs) {
          subs.delete(connectionId);
          if (subs.size === 0) {
            channelSubscriptions.delete(channel);
          }
        }
      });

      // Remove presence
      removePresence(userId);
    }

    connections.delete(connectionId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[WebSocket] Connection ${connectionId} error:`, error);
  });
});

// HTTP server
const server = app.listen(PORT, () => {
  console.log(`Realtime Service running on port ${PORT}`);
});

// Handle WebSocket upgrade
server.on('upgrade', (req, socket, head) => {
  const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const tokenData = verifyToken(token);
  if (!tokenData) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, tokenData);
  });
});

// HTTP routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'realtime-service',
    connections: connections.size,
    channels: channelSubscriptions.size,
    timestamp: new Date().toISOString()
  });
});

// Helper endpoint to trigger PostgreSQL notifications
app.post('/api/notify', async (req, res) => {
  try {
    const { channel, data, tenantId } = req.body;

    if (!channel) {
      return res.status(400).json({ error: 'Channel is required' });
    }

    await pgClient.notify(channel, JSON.stringify({
      event: 'insert',
      data,
      tenantId
    }));

    res.json({ success: true, channel });
  } catch (error) {
    console.error('[HTTP] Notify error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Get stats
app.get('/api/stats', (req, res) => {
  const stats = {
    connections: connections.size,
    channels: Array.from(channelSubscriptions.keys()).map(channel => ({
      name: channel,
      subscribers: channelSubscriptions.get(channel).size
    })),
    presence: {}
  };

  presenceState.forEach((state, channel) => {
    stats.presence[channel] = state.size;
  });

  res.json(stats);
});

// Initialize PostgreSQL listener
initializePostgresListener().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[System] SIGTERM received, shutting down...');

  // Close all WebSocket connections
  connections.forEach((connection) => {
    connection.ws.close();
  });

  // Close PostgreSQL client
  await pgClient.close();

  // Close server
  server.close(() => {
    console.log('[System] Server closed');
    process.exit(0);
  });
});

module.exports = { app, wss, pgClient };
