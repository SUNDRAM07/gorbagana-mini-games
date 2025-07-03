import WebSocket, { WebSocketServer } from 'ws';

const server = new WebSocketServer({ port: 8080 });

const users = new Map(); // userId -> { ws, userData }
const usersByInviteCode = new Map(); // inviteCode -> userId

server.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'register':
                users.set(data.user.id, { ws, userData: data.user });
                usersByInviteCode.set(data.user.inviteCode, data.user.id);

                // Broadcast online users
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
        // Remove user from online users
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

console.log('WebSocket server running on port 8080');