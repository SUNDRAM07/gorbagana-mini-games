import { WebSocketServer } from 'ws';

let wss;
const users = new Map();
const usersByInviteCode = new Map();

export default function handler(req, res) {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
    
    wss.on('connection', (ws) => {
      console.log('New client connected');
      
      ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'register':
            users.set(data.user.id, { ws, userData: data.user });
            usersByInviteCode.set(data.user.inviteCode, data.user.id);
            broadcastOnlineUsers();
            break;

          case 'sendFriendRequest':
            const targetUserId = usersByInviteCode.get(data.targetInviteCode);
            if (targetUserId && users.has(targetUserId)) {
              const targetUser = users.get(targetUserId);
              targetUser.ws.send(JSON.stringify({
                type: 'friendRequest',
                requestId: 'req_' + Math.random().toString(36).substr(2, 9),
                from: data.from
              }));
            }
            break;

          case 'acceptFriendRequest':
            if (users.has(data.targetUserId)) {
              const targetUser = users.get(data.targetUserId);
              targetUser.ws.send(JSON.stringify({
                type: 'friendRequestAccepted',
                user: data.user
              }));
            }
            break;

          case 'rejectFriendRequest':
            if (users.has(data.targetUserId)) {
              const targetUser = users.get(data.targetUserId);
              targetUser.ws.send(JSON.stringify({
                type: 'friendRequestRejected'
              }));
            }
            break;

          case 'sendGameInvite':
            if (users.has(data.targetUserId)) {
              const targetUser = users.get(data.targetUserId);
              targetUser.ws.send(JSON.stringify({
                type: 'gameInvite',
                gameType: data.gameType,
                stake: data.stake,
                from: data.from
              }));
            }
            break;

          case 'acceptGameInvite':
            if (users.has(data.targetUserId)) {
              const targetUser = users.get(data.targetUserId);
              targetUser.ws.send(JSON.stringify({
                type: 'gameInviteAccepted',
                roomId: 'room_' + Math.random().toString(36).substr(2, 9),
                gameType: data.gameType,
                stake: data.stake,
                user: data.user
              }));
            }
            break;

          case 'rejectGameInvite':
            if (users.has(data.targetUserId)) {
              const targetUser = users.get(data.targetUserId);
              targetUser.ws.send(JSON.stringify({
                type: 'gameInviteRejected',
                user: data.user
              }));
            }
            break;
        }
      });

      ws.on('close', () => {
        for (const [userId, userData] of users.entries()) {
          if (userData.ws === ws) {
            users.delete(userId);
            usersByInviteCode.delete(userData.userData.inviteCode);
            broadcastUserOffline(userId);
            break;
          }
        }
      });
    });
  }

  if (req.headers.upgrade === 'websocket') {
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      wss.emit('connection', ws);
    });
  } else {
    res.status(200).json({ message: 'WebSocket server ready' });
  }
}

function broadcastOnlineUsers() {
  const onlineUsers = {};
  for (const [userId, userData] of users.entries()) {
    onlineUsers[userId] = userData.userData;
  }

  for (const [userId, userData] of users.entries()) {
    userData.ws.send(JSON.stringify({
      type: 'onlineUsers',
      users: onlineUsers
    }));
  }
}

function broadcastUserOffline(userId) {
  for (const [_, userData] of users.entries()) {
    userData.ws.send(JSON.stringify({
      type: 'userOffline',
      userId: userId
    }));
  }
}