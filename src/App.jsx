import React, { useState, useEffect } from 'react';
import { User, Plus, Gamepad2, Zap, Trophy, Users, Copy, ExternalLink } from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
// Function to get real balance
const GORBAGANA_RPC = 'https://rpc.gorbagana.wtf';
const connection = new Connection(GORBAGANA_RPC, 'confirmed');

const getRealBalance = async (publicKeyString) => {
  try {
    const publicKey = new PublicKey(publicKeyString);
    const balance = await connection.getBalance(publicKey);
    // Convert lamports to GORB (assuming 1 GORB = 1 SOL equivalent)
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
};

const generateConsistentUserData = (publicKeyString) => {
  // Create a consistent hash from the wallet address
  let hash = 0;
  for (let i = 0; i < publicKeyString.length; i++) {
    const char = publicKeyString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Make hash positive and convert to string
  const positiveHash = Math.abs(hash).toString();

  // Generate consistent user ID (first 8 characters of wallet address + hash suffix)
  const userId = `user_${publicKeyString.slice(0, 8)}_${positiveHash.slice(-4)}`;

  // Generate consistent invite code (based on wallet address)
  const inviteCode = publicKeyString.slice(0, 4).toUpperCase() + positiveHash.slice(-4);

  // Generate consistent username number (based on hash)
  const usernameNumber = (Math.abs(hash) % 9000) + 1000; // Ensures 4-digit number
  const username = `Player${usernameNumber}`;

  return {
    userId,
    inviteCode,
    username
  };
};


const GorbaganaGamingPlatform = () => {
  const [showGameSelectionModal, setShowGameSelectionModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [gameRoom, setGameRoom] = useState(null);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedWalletType, setConnectedWalletType] = useState('');
  const [friends, setFriends] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showGameInviteModal, setShowGameInviteModal] = useState(false);
  const [gameInvite, setGameInvite] = useState(null);
  const [showFriendTabs, setShowFriendTabs] = useState('friends'); // 'friends' or 'requests'
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});


  // Generate mock leaderboard data
  useEffect(() => {
    const mockLeaderboard = [
      { username: "GorbKing", totalSpent: 15420, wins: 127, gamesPlayed: 203, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=king" },
      { username: "TokenMaster", totalSpent: 12850, wins: 98, gamesPlayed: 167, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=master" },
      { username: "ChainChampion", totalSpent: 11200, wins: 89, gamesPlayed: 145, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=champion" },
      { username: "DeFiDegen", totalSpent: 9750, wins: 76, gamesPlayed: 132, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=defi" },
      { username: "CryptoGamer", totalSpent: 8900, wins: 65, gamesPlayed: 118, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=crypto" },
      { username: "BlockchainBoss", totalSpent: 7650, wins: 58, gamesPlayed: 104, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=boss" },
      { username: "SolanaSlayer", totalSpent: 6800, wins: 52, gamesPlayed: 97, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=solana" },
      { username: "TestnetTitan", totalSpent: 5950, wins: 41, gamesPlayed: 83, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=titan" },
      { username: "GorbLegend", totalSpent: 4200, wins: 34, gamesPlayed: 69, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=legend" },
      { username: "TrashTreasure", totalSpent: 3650, wins: 28, gamesPlayed: 55, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=treasure" }
    ];
    setLeaderboard(mockLeaderboard);
  }, []);

  useEffect(() => {
    if (isConnected && currentUser) {
      // Connect to WebSocket server
      const ws = new WebSocket(
        process.env.NODE_ENV === 'production' 
          ? 'wss://gorbagana-mini-games.vercel.app/api/websocket'
          : 'ws://localhost:8080'
          
      );

      ws.onopen = () => {
        console.log('Connected to server');
        // Register user with server
        ws.send(JSON.stringify({
          type: 'register',
          user: {
            id: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar,
            inviteCode: currentUser.inviteCode,
            wallet: currentUser.wallet
          }
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      };

      ws.onclose = () => {
        console.log('Disconnected from server');
      };

      setSocket(ws);

      return () => {
        ws.close();
      };
    }
  }, [isConnected, currentUser]);
  useEffect(() => {
    const checkConnection = async () => {
      // Check Backpack connection
      if (window.backpack && window.backpack.isConnected) {
        try {
          const publicKey = window.backpack.publicKey;
          if (publicKey) {
            const publicKeyString = typeof publicKey === 'string' ? publicKey : publicKey.toString();
            const balance = await getRealBalance(publicKeyString);

            // Generate consistent user data
            const { userId, inviteCode, username } = generateConsistentUserData(publicKeyString);

            const user = {
              id: userId,
              wallet: publicKeyString,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${publicKeyString}`,
              username: username,
              inviteCode: inviteCode,
              balance: balance,
              gamesPlayed: 0,
              wins: 0
            };

            setCurrentUser(user);
            setIsConnected(true);
            setConnectedWalletType('Backpack');
            console.log('Auto-reconnected to Backpack');
          }
        } catch (error) {
          console.log('Auto-reconnect to Backpack failed:', error);
        }
      }

      // Check Phantom connection
      if (window.solana && window.solana.isConnected) {
        try {
          const publicKey = window.solana.publicKey;
          if (publicKey) {
            const publicKeyString = publicKey.toString();
            const balance = await getRealBalance(publicKeyString);

            // Generate consistent user data
            const { userId, inviteCode, username } = generateConsistentUserData(publicKeyString);

            const user = {
              id: userId,
              wallet: publicKeyString,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${publicKeyString}`,
              username: username,
              inviteCode: inviteCode,
              balance: balance,
              gamesPlayed: 0,
              wins: 0
            };

            setCurrentUser(user);
            setIsConnected(true);
            setConnectedWalletType('Phantom');
            console.log('Auto-reconnected to Phantom');
          }
        } catch (error) {
          console.log('Auto-reconnect to Phantom failed:', error);
        }
      }
    };


    const timer = setTimeout(checkConnection, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Your existing functions continue below...

  // Simulated wallet connection
  const connectPhantom = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      alert('Phantom wallet is not installed. Please install it from phantom.app');
      return;
    }

    try {
      setIsConnecting(true);
      const response = await window.solana.connect();
      const publicKeyString = response.publicKey.toString();

      // Generate consistent user data
      const { userId, inviteCode, username } = generateConsistentUserData(publicKeyString);

      const user = {
        id: userId,
        wallet: publicKeyString,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${publicKeyString}`,
        username: username,
        inviteCode: inviteCode,
        balance: await getRealBalance(publicKeyString),
        gamesPlayed: 0,
        wins: 0
      };

      setCurrentUser(user);
      setIsConnected(true);
      setConnectedWalletType('Phantom');
      setShowWalletDropdown(false);
    } catch (error) {
      console.error('Error connecting to Phantom:', error);
      alert('Failed to connect to Phantom wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectBackpack = async () => {
    if (!window.backpack || !window.backpack.isBackpack) {
      alert('Backpack wallet is not installed. Please install it from backpack.app');
      return;
    }

    try {
      setIsConnecting(true);

      const result = await window.backpack.connect();
      console.log('Backpack connect result:', result);

      let publicKey;
      if (result && result.publicKey) {
        publicKey = result.publicKey;
      } else {
        publicKey = window.backpack.publicKey;
      }

      if (!publicKey) {
        throw new Error('No public key received from Backpack wallet');
      }

      const publicKeyString = typeof publicKey === 'string' ? publicKey : publicKey.toString();
      console.log('Connected to Backpack with public key:', publicKeyString);

      // Generate consistent user data
      const { userId, inviteCode, username } = generateConsistentUserData(publicKeyString);

      const user = {
        id: userId,
        wallet: publicKeyString,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${publicKeyString}`,
        username: username,
        inviteCode: inviteCode,
        balance: await getRealBalance(publicKeyString),
        gamesPlayed: 0,
        wins: 0
      };

      setCurrentUser(user);
      setIsConnected(true);
      setConnectedWalletType('Backpack');
      setShowWalletDropdown(false);

    } catch (error) {
      console.error('Error connecting to Backpack:', error);

      if (error.message.includes('User rejected')) {
        alert('Connection cancelled by user');
      } else if (error.message.includes('already connected')) {
        alert('Wallet is already connected. Please refresh the page and try again.');
      } else {
        alert(`Failed to connect to Backpack wallet: ${error.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };



  const disconnectWallet = async () => {
    try {
      if (connectedWalletType === 'Backpack' && window.backpack) {
        await window.backpack.disconnect();
      } else if (connectedWalletType === 'Phantom' && window.solana) {
        await window.solana.disconnect();
      }
    } catch (error) {
      console.log('Disconnect error (this is usually normal):', error);
    }

    setIsConnected(false);
    setCurrentUser(null);
    setCurrentScreen('home');
    setConnectedWalletType('');
  };

  const addFriend = () => {
    if (friendCode.trim() && socket) {
      // Send friend request to server
      socket.send(JSON.stringify({
        type: 'sendFriendRequest',
        targetInviteCode: friendCode.toUpperCase(),
        from: {
          id: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
          inviteCode: currentUser.inviteCode
        }
      }));

      setFriendCode('');
      alert('Friend request sent!');
    }
  };
  const acceptFriendRequest = (request) => {
    if (socket) {
      // Send acceptance to server
      socket.send(JSON.stringify({
        type: 'acceptFriendRequest',
        requestId: request.id,
        targetUserId: request.fromUserId,
        user: {
          id: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
          inviteCode: currentUser.inviteCode
        }
      }));

      // Add to local friends
      const newFriend = {
        id: request.fromUserId,
        username: request.username,
        avatar: request.avatar,
        online: true, // They're online since they sent the request
        inviteCode: request.inviteCode
      };

      setFriends([...friends, newFriend]);
      setFriendRequests(friendRequests.filter(req => req.id !== request.id));
    }
  };

  const rejectFriendRequest = (request) => {
    if (socket) {
      // Send rejection to server
      socket.send(JSON.stringify({
        type: 'rejectFriendRequest',
        requestId: request.id,
        targetUserId: request.fromUserId
      }));

      setFriendRequests(friendRequests.filter(req => req.id !== request.id));
    }
  };


  const acceptGameInvite = () => {
    if (gameInvite && socket) {
      socket.send(JSON.stringify({
        type: 'acceptGameInvite',
        targetUserId: gameInvite.friend.id,
        gameType: gameInvite.gameType,
        user: {
          id: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
          inviteCode: currentUser.inviteCode
        }
      }));

      setShowGameInviteModal(false);
      setGameInvite(null);
    }
  };

  const declineGameInvite = () => {
    if (gameInvite && socket) {
      socket.send(JSON.stringify({
        type: 'rejectGameInvite',
        targetUserId: gameInvite.friend.id,
        user: {
          id: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
          inviteCode: currentUser.inviteCode
        }
      }));
    }

    setShowGameInviteModal(false);
    setGameInvite(null);
  };
  const inviteFriend = (friend) => {
    setSelectedFriend(friend);
    setShowGameSelectionModal(true);
  };
  const sendGameInviteWithType = (gameType) => {
    if (selectedFriend && socket) {
      socket.send(JSON.stringify({
        type: 'sendGameInvite',
        targetUserId: selectedFriend.id,
        gameType: gameType,
        stake: games.find(g => g.id === gameType).minStake,
        from: {
          id: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
          inviteCode: currentUser.inviteCode
        }
      }));

      alert(`${games.find(g => g.id === gameType).name} invite sent to ${selectedFriend.username}!`);
      setShowGameSelectionModal(false);
      setSelectedFriend(null);
    }
  };

  const selectGame = (gameType) => {
    setGameRoom({
      id: 'room_' + Math.random().toString(36).substr(2, 9),
      gameType,
      players: [currentUser],
      status: 'waiting',
      stake: 10
    });
    setCurrentScreen('gameRoom');
  };

  const startGame = () => {
    setGameRoom({ ...gameRoom, status: 'playing' });
    setCurrentScreen('game');
  };

  const games = [
    {
      id: 'connect4',
      name: '4-in-a-Row',
      description: 'Classic strategy game',
      icon: '🔴',
      minStake: 5,
      maxPlayers: 2
    },
    {
      id: 'reaction',
      name: 'Reaction Speed',
      description: 'First to click wins',
      icon: '⚡',
      minStake: 3,
      maxPlayers: 2
    },
    {
      id: 'guess',
      name: 'Number Duel',
      description: 'Guess the closest number',
      icon: '🎯',
      minStake: 5,
      maxPlayers: 2
    },
    {
      id: 'rps',
      name: 'Rock Paper Scissors',
      description: 'Classic showdown',
      icon: '✂️',
      minStake: 2,
      maxPlayers: 2
    },
    {
      id: 'minesweeper',
      name: 'Minesweeper',
      description: 'Find all the mines',
      icon: '💣',
      minStake: 4,
      maxPlayers: 2
    },
    {
      id: 'tictactoe',
      name: 'Tic Tac Toe',
      description: 'Classic X and O',
      icon: '❌',
      minStake: 3,
      maxPlayers: 2
    },
    {
      id: 'memory',
      name: 'Memory Match',
      description: 'Match the pairs',
      icon: '🧠',
      minStake: 4,
      maxPlayers: 2
    },
    {
      id: 'numberguess',
      name: 'Number Guessing',
      description: 'Guess the secret number',
      icon: '🔢',
      minStake: 3,
      maxPlayers: 2
    }
  ];

  // Game Components
  const Connect4Game = () => {
    const [board, setBoard] = useState(Array(6).fill(null).map(() => Array(7).fill(null)));
    const [currentPlayer, setCurrentPlayer] = useState(1);
    const [winner, setWinner] = useState(null);

    const dropPiece = (col) => {
      if (winner) return;

      const newBoard = [...board];
      for (let row = 5; row >= 0; row--) {
        if (!newBoard[row][col]) {
          newBoard[row][col] = currentPlayer;
          setBoard(newBoard);

          // Check for winner (simplified)
          if (checkWinner(newBoard, row, col, currentPlayer)) {
            setWinner(currentPlayer);
          } else {
            setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
          }
          break;
        }
      }
    };

    const checkWinner = (board, row, col, player) => {
      // Simplified winner check - you'd implement full logic here
      return false;
    };

    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="text-lg font-bold">
          {winner ? `Player ${winner} Wins!` : `Player ${currentPlayer}'s Turn`}
        </div>
        <div className="grid grid-cols-7 gap-1 bg-blue-600 p-4 rounded-lg">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => dropPiece(colIndex)}
                className={`w-10 h-10 rounded-full border-2 ${cell === 1 ? 'bg-red-500' :
                  cell === 2 ? 'bg-yellow-500' :
                    'bg-white hover:bg-gray-200'
                  }`}
              />
            ))
          )}
        </div>
      </div>
    );
  };
  const handleServerMessage = (data) => {
    switch (data.type) {
      case 'friendRequest':
        // Incoming friend request
        setFriendRequests(prev => [...prev, {
          id: data.requestId,
          username: data.from.username,
          avatar: data.from.avatar,
          inviteCode: data.from.inviteCode,
          fromUserId: data.from.id,
          timestamp: new Date().toISOString()
        }]);

        // Show notification
        alert(`${data.from.username} sent you a friend request!`);
        break;

      case 'friendRequestAccepted':
        // Your friend request was accepted
        setFriends(prev => [...prev, {
          id: data.user.id,
          username: data.user.username,
          avatar: data.user.avatar,
          online: true,
          inviteCode: data.user.inviteCode
        }]);
        alert(`${data.user.username} accepted your friend request!`);
        break;

      case 'friendRequestRejected':
        alert(`Your friend request was rejected.`);
        break;

      case 'gameInvite':
        // Incoming game invite
        setGameInvite({
          friend: data.from,
          gameType: data.gameType,
          timestamp: new Date().toISOString()
        });
        setShowGameInviteModal(true);
        break;

      case 'gameInviteAccepted':
        // Your game invite was accepted
        setGameRoom({
          id: data.roomId,
          gameType: data.gameType,
          players: [currentUser, data.user],
          status: 'waiting',
          stake: data.stake,
          opponent: data.user
        });
        setCurrentScreen('gameRoom');
        break;

      case 'gameInviteRejected':
        alert(`${data.user.username} declined your game invite.`);
        break;

      case 'onlineUsers':
        setOnlineUsers(data.users);
        break;

      case 'userOnline':
        setOnlineUsers(prev => ({ ...prev, [data.userId]: data.user }));
        // Update friends online status
        setFriends(prev => prev.map(friend =>
          friend.id === data.userId ? { ...friend, online: true } : friend
        ));
        break;

      case 'userOffline':
        setOnlineUsers(prev => {
          const newUsers = { ...prev };
          delete newUsers[data.userId];
          return newUsers;
        });
        // Update friends online status
        setFriends(prev => prev.map(friend =>
          friend.id === data.userId ? { ...friend, online: false } : friend
        ));
        break;
    }
  };

  const ReactionGame = () => {
    const [gameState, setGameState] = useState('waiting');
    const [startTime, setStartTime] = useState(null);
    const [reactionTime, setReactionTime] = useState(null);

    const startReaction = () => {
      setGameState('waiting');
      const delay = Math.random() * 3000 + 1000; // 1-4 seconds
      setTimeout(() => {
        setGameState('ready');
        setStartTime(Date.now());
      }, delay);
    };

    const handleClick = () => {
      if (gameState === 'ready') {
        const time = Date.now() - startTime;
        setReactionTime(time);
        setGameState('finished');
      }
    };

    return (
      <div className="flex flex-col items-center space-y-6">
        <div className="text-xl font-bold">Reaction Speed Test</div>
        <div
          className={`w-64 h-64 rounded-lg flex items-center justify-center text-white font-bold text-xl cursor-pointer ${gameState === 'waiting' ? 'bg-red-500' :
            gameState === 'ready' ? 'bg-green-500' :
              'bg-blue-500'
            }`}
          onClick={handleClick}
        >
          {gameState === 'waiting' && 'Wait for Green...'}
          {gameState === 'ready' && 'CLICK NOW!'}
          {gameState === 'finished' && `${reactionTime}ms`}
        </div>
        {gameState === 'finished' ? (
          <button
            onClick={startReaction}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Play Again
          </button>
        ) : gameState === 'waiting' ? null : (
          <button
            onClick={startReaction}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Start Game
          </button>
        )}
      </div>
    );
  };

  // Main Render
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center space-y-6">
            <div className="text-4xl font-bold text-white mb-2">🗑️ Gorbagana Gaming</div>
            <p className="text-gray-300">Connect your Backpack wallet to start playing multiplayer games on the fastest testnet!</p>

            <div className="space-y-4">
              <div className="relative">
                <button
                  onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                  disabled={isConnecting}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isConnecting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Connecting...
                    </div>
                  ) : (
                    <>
                      Connect Wallet
                      <span className="ml-2">▼</span>
                    </>
                  )}
                </button>

                {showWalletDropdown && !isConnecting && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={connectPhantom}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center text-black"
                    >
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-sm">P</span>
                      </div>
                      <div>
                        <div className="font-semibold">Phantom</div>
                        {!window.solana?.isPhantom && (
                          <div className="text-xs text-red-500">Not installed</div>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={connectBackpack}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center rounded-b-lg text-black"
                    >
                      <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-sm">B</span>
                      </div>
                      <div>
                        <div className="font-semibold">Backpack</div>
                        {!window.backpack?.isBackpack && (
                          <div className="text-xs text-red-500">Not installed</div>
                        )}
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Click outside to close dropdown */}
              {showWalletDropdown && (
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setShowWalletDropdown(false)}
                />
              )}

              <a
                href="https://faucet.gorbagana.wtf/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 text-blue-400 hover:text-blue-300"
              >
                <ExternalLink size={16} />
                <span>Get Testnet Tokens</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">🗑️ Gorbagana Gaming</h1>
            <div className="text-sm text-gray-300">
              Balance: {currentUser?.balance} GORB
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="https://faucet.gorbagana.wtf/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Get Testnet Tokens
            </a>
            <div className="flex items-center space-x-2">
              <img src={currentUser?.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
              <span className="text-white">{currentUser?.username}</span>
            </div>
            <button
              onClick={disconnectWallet}
              className="text-gray-400 hover:text-white"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {currentScreen === 'home' && (
          <div className="relative min-h-screen bg-gradient-to-br from-purple-800 via-blue-800 to-indigo-900">
            {/* Main Character Display - Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {/* Main Avatar */}
                <div className="mb-8">
                  <div className="relative inline-block">
                    <img
                      src={currentUser?.avatar}
                      alt="Avatar"
                      className="w-48 h-48 rounded-full border-4 border-blue-400 shadow-xl"
                    />
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{currentUser?.wins}</span>
                    </div>
                  </div>
                </div>

                {/* Player Info */}
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold text-white">{currentUser?.username}</h2>
                  <div className="flex items-center justify-center space-x-2 text-gray-300">
                    <span>ID: {currentUser?.inviteCode}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(currentUser?.inviteCode)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="text-yellow-400 font-semibold text-lg">
                    {currentUser?.balance} GORB • {currentUser?.gamesPlayed} Games Played
                  </div>
                </div>
              </div>
            </div>

            {/* Friends Button - Left Side */}
            <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
              <div className="relative">
                <button
                  onClick={() => setCurrentScreen('friends')}
                  className="w-16 h-16 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center shadow-lg transition-all"
                >
                  <Users className="text-white" size={24} />
                </button>
                {friends.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{friends.length}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Game Mode Selector - Bottom Right */}
            <div className="absolute bottom-8 right-8">
              <button
                onClick={() => setCurrentScreen('gameSelect')}
                className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all"
              >
                <div className="flex items-center space-x-3">
                  <Gamepad2 size={24} />
                  <span>SELECT MODE</span>
                </div>
                <div className="text-xs opacity-90 mt-1">Choose Your Game</div>
              </button>
            </div>

            {/* Top Stats Bar */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
              <div className="bg-black bg-opacity-50 rounded-full px-6 py-3 flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Trophy className="text-yellow-400" size={20} />
                  <span className="text-white font-bold">{currentUser?.wins} Wins</span>
                </div>
                <div className="w-px h-6 bg-white bg-opacity-30"></div>
                <div className="flex items-center space-x-2">
                  <Zap className="text-blue-400" size={20} />
                  <span className="text-white font-bold">{currentUser?.gamesPlayed} Games</span>
                </div>
                <div className="w-px h-6 bg-white bg-opacity-30"></div>
                <button
                  onClick={() => setCurrentScreen('leaderboard')}
                  className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <Trophy className="text-orange-400" size={20} />
                  <span className="font-bold">Leaderboard</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Friends Screen */}
        {currentScreen === 'friends' && (
          <div className="max-w-md mx-auto">
            <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Friends</h3>
                <button
                  onClick={() => setCurrentScreen('home')}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex mb-6 bg-black/30 rounded-xl p-1">
                <button
                  onClick={() => setShowFriendTabs('friends')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${showFriendTabs === 'friends'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Friends ({friends.length})
                </button>
                <button
                  onClick={() => setShowFriendTabs('requests')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors relative ${showFriendTabs === 'requests'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Requests ({friendRequests.length})
                  {friendRequests.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </button>
              </div>

              {/* Friends Tab */}
              {showFriendTabs === 'friends' && (
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {friends.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <Users size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No friends yet. Send some requests!</p>
                    </div>
                  ) : (
                    friends.map(friend => (
                      <div key={friend.id} className="flex items-center space-x-4 p-3 bg-black/30 rounded-xl">
                        <div className="relative">
                          <img src={friend.avatar} alt="Friend" className="w-12 h-12 rounded-full" />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${friend.online ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{friend.username}</div>
                          <div className={`text-sm ${friend.online ? 'text-green-400' : 'text-gray-400'}`}>
                            {friend.online ? 'Online' : 'Offline'}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => inviteFriend(friend, 'connect4')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                          >
                            Invite
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Friend Requests Tab */}
              {showFriendTabs === 'requests' && (
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {friendRequests.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <Users size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No friend requests</p>
                    </div>
                  ) : (
                    friendRequests.map(request => (
                      <div key={request.id} className="flex items-center space-x-4 p-3 bg-black/30 rounded-xl">
                        <img src={request.avatar} alt="Request" className="w-12 h-12 rounded-full" />
                        <div className="flex-1">
                          <div className="text-white font-medium">{request.username}</div>
                          <div className="text-gray-400 text-sm">ID: {request.inviteCode}</div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => acceptFriendRequest(request)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => rejectFriendRequest(request.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg transition-colors text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add Friend Input */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  placeholder="Enter friend code..."
                  className="w-full px-4 py-3 bg-black/40 border border-white/30 rounded-xl text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                />
                <button
                  onClick={addFriend}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
                >
                  Send Friend Request
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Game Invite Modal */}
        {showGameInviteModal && gameInvite && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-bold text-white">Game Invite!</h3>
                <div className="flex items-center justify-center space-x-4">
                  <img src={currentUser?.avatar} alt="You" className="w-16 h-16 rounded-full" />
                  <div className="text-white font-bold text-lg">VS</div>
                  <img src={gameInvite.friend.avatar} alt="Friend" className="w-16 h-16 rounded-full" />
                </div>
                <div className="text-white">
                  <div className="font-semibold">{gameInvite.friend.username}</div>
                  <div className="text-gray-400 text-sm">
                    wants to play {games.find(g => g.id === gameInvite.gameType)?.name}
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={acceptGameInvite}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={declineGameInvite}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Selection Modal for Inviting Friends */}
        {showGameSelectionModal && selectedFriend && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Choose Game to Play with {selectedFriend.username}
                </h2>
                <button
                  onClick={() => {
                    setShowGameSelectionModal(false);
                    setSelectedFriend(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {games.map(game => (
                  <button
                    key={game.id}
                    onClick={() => sendGameInviteWithType(game.id)}
                    className="group p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10 rounded-2xl hover:border-white/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                  >
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{game.icon}</div>
                    <div className="text-white font-bold text-xl mb-2">{game.name}</div>
                    <div className="text-gray-400 text-sm mb-3">{game.description}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 font-semibold">{game.minStake} GORB</span>
                      <span className="text-gray-400 text-xs">{game.maxPlayers} Players</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Screen */}
        {currentScreen === 'leaderboard' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-black bg-opacity-50 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <Trophy className="text-yellow-400" size={32} />
                  <h2 className="text-3xl font-bold text-white">GORBAGANA Leaderboard</h2>
                </div>
                <button
                  onClick={() => setCurrentScreen('home')}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {leaderboard.map((player, index) => (
                  <div
                    key={player.username}
                    className={`flex items-center space-x-4 p-4 rounded-xl transition-all ${index < 3
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 shadow-lg'
                      : 'bg-black bg-opacity-30 hover:bg-opacity-40'
                      }`}
                  >
                    {/* Rank */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-yellow-600 text-black' :
                          'bg-gray-600 text-white'
                      }`}>
                      {index === 0 ? '👑' : index + 1}
                    </div>

                    {/* Avatar */}
                    <img
                      src={player.avatar}
                      alt={player.username}
                      className="w-12 h-12 rounded-full border-2 border-white"
                    />

                    {/* Player Info */}
                    <div className="flex-1">
                      <div className="text-white font-bold text-lg">{player.username}</div>
                      <div className="text-gray-300 text-sm">
                        {player.wins} wins • {player.gamesPlayed} games
                      </div>
                    </div>

                    {/* GORB Spent */}
                    <div className="text-right">
                      <div className="text-yellow-400 font-bold text-xl">
                        {player.totalSpent.toLocaleString()} GORB
                      </div>
                      <div className="text-gray-400 text-sm">Total Spent</div>
                    </div>

                    {/* Special Badges */}
                    {index === 0 && (
                      <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                        GORB KING
                      </div>
                    )}
                    {index === 1 && (
                      <div className="bg-gray-400 text-black px-3 py-1 rounded-full text-xs font-bold">
                        SILVER SPENDER
                      </div>
                    )}
                    {index === 2 && (
                      <div className="bg-yellow-600 text-black px-3 py-1 rounded-full text-xs font-bold">
                        BRONZE BURNER
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Your Rank */}
              <div className="mt-8 p-4 bg-blue-600 bg-opacity-30 rounded-xl border border-blue-400">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={currentUser?.avatar}
                      alt="You"
                      className="w-10 h-10 rounded-full border-2 border-blue-400"
                    />
                    <div>
                      <div className="text-white font-bold">Your Rank: #47</div>
                      <div className="text-gray-300 text-sm">Keep playing to climb higher!</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-400 font-bold text-lg">
                      {Math.floor(Math.random() * 500 + 100)} GORB
                    </div>
                    <div className="text-gray-400 text-sm">Total Spent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Selection Modal */}
        {currentScreen === 'gameSelect' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white">Select Game Mode</h2>
                <button
                  onClick={() => setCurrentScreen('home')}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {games.map(game => (
                  <button
                    key={game.id}
                    onClick={() => selectGame(game.id)}
                    className="group p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-white/10 rounded-2xl hover:border-white/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                  >
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{game.icon}</div>
                    <div className="text-white font-bold text-xl mb-2">{game.name}</div>
                    <div className="text-gray-400 text-sm mb-3">{game.description}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 font-semibold">{game.minStake} GORB</span>
                      <span className="text-gray-400 text-xs">{game.maxPlayers} Players</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentScreen === 'gameRoom' && gameRoom && (
          <div className="max-w-2xl mx-auto bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-white">
                {games.find(g => g.id === gameRoom.gameType)?.name} Room
              </h2>

              <div className="text-lg text-gray-300">
                Stake: {gameRoom.stake} GORB per player
              </div>

              {/* Player vs Player Display */}
              <div className="flex items-center justify-center space-x-8">
                <div className="text-center">
                  <img src={currentUser?.avatar} alt="You" className="w-20 h-20 rounded-full mx-auto mb-2 border-4 border-blue-400" />
                  <div className="text-white font-bold">{currentUser?.username}</div>
                  <div className="text-blue-400 text-sm">You</div>
                </div>

                <div className="text-4xl font-bold text-white">VS</div>

                {gameRoom.opponent ? (
                  <div className="text-center">
                    <img src={gameRoom.opponent.avatar} alt="Opponent" className="w-20 h-20 rounded-full mx-auto mb-2 border-4 border-red-400" />
                    <div className="text-white font-bold">{gameRoom.opponent.username}</div>
                    <div className="text-green-400 text-sm">Ready</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-2 border-4 border-gray-400">
                      <Plus className="text-gray-400" size={32} />
                    </div>
                    <div className="text-gray-400 font-bold">Waiting...</div>
                    <div className="text-gray-500 text-sm">For opponent</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <button
                  onClick={startGame}
                  disabled={!gameRoom.opponent}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Start Game
                </button>

                <button
                  onClick={() => setCurrentScreen('home')}
                  className="px-8 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </div>
        )}
        {currentScreen === 'game' && gameRoom && (
          <div className="max-w-4xl mx-auto bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                {games.find(g => g.id === gameRoom.gameType)?.name}
              </h2>
              <div className="text-gray-300">Prize Pool: {gameRoom.stake * 2} GORB</div>
            </div>

            {gameRoom.gameType === 'connect4' && <Connect4Game />}
            {gameRoom.gameType === 'reaction' && <ReactionGame />}
            {gameRoom.gameType === 'guess' && (
              <div className="text-center text-white">Number Guessing Game Coming Soon!</div>
            )}
            {gameRoom.gameType === 'rps' && (
              <div className="text-center text-white">Rock Paper Scissors Coming Soon!</div>
            )}
            {gameRoom.gameType === 'minesweeper' && (
              <div className="text-center text-white">Minesweeper Game Coming Soon!</div>
            )}
            {gameRoom.gameType === 'tictactoe' && (
              <div className="text-center text-white">Tic Tac Toe Game Coming Soon!</div>
            )}
            {gameRoom.gameType === 'memory' && (
              <div className="text-center text-white">Memory Match Game Coming Soon!</div>
            )}
            {gameRoom.gameType === 'numberguess' && (
              <div className="text-center text-white">Number Guessing Game Coming Soon!</div>
            )}

            <div className="mt-8 text-center">
              <button
                onClick={() => setCurrentScreen('home')}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Leave Game
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GorbaganaGamingPlatform;