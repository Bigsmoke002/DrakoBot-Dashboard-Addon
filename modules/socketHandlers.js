// addons/dashboard/modules/socketHandlers.js

function setupSocketHandlers(io, client, collections, sqliteDb, sharedData) {
  
  io.on('connection', function(socket) {
    console.log('New client connected');
    
    // Initiale Daten senden
    socket.emit('initialLog', sharedData.eventLog);
    
    // Server-Liste senden (aktive und historische)
    sendServerList(socket, client, collections);
    
    // Socket-Events für Live-Updates
    socket.on('subscribeToUserHistory', function(data) {
      const guildId = data.guildId;
      const userId = data.userId;
      console.log(`Client subscribed to history for user ${userId} in guild ${guildId}`);
      socket.join(`userHistory-${guildId}-${userId}`);
    });
    
    socket.on('unsubscribeFromUserHistory', function(data) {
      const guildId = data.guildId;
      const userId = data.userId;
      console.log(`Client unsubscribed from history for user ${userId} in guild ${guildId}`);
      socket.leave(`userHistory-${guildId}-${userId}`);
    });
    
    socket.on('subscribeToUserActivities', function(guildId) {
      console.log(`Client subscribed to activities for guild ${guildId}`);
      socket.join(`activities-${guildId}`);
    });
    
    socket.on('unsubscribeFromUserActivities', function(guildId) {
      console.log(`Client unsubscribed from activities for guild ${guildId}`);
      socket.leave(`activities-${guildId}`);
    });
    
    // Handler für requestActiveUpdate Event (für den Aktive-Tab)
    socket.on('requestActiveUpdate', function(data) {
      const guildId = data.guildId;
      if (!guildId || !client.guilds.cache.get(guildId)) {
        return socket.emit('activeUpdate', { guildId, activeData: [] });
      }
      
      const guild = client.guilds.cache.get(guildId);
      const categories = {};
      
      // Sammle alle Kategorien
      guild.channels.cache.forEach(function(ch) {
        if (ch.type === 4) { // GUILD_CATEGORY
          categories[ch.id] = {
            id: ch.id,
            name: ch.name,
            textChannels: [],
            voiceChannels: []
          };
        }
      });
      
      // Erstelle "Ohne Kategorie" für Kanäle ohne Kategorie
      categories['uncategorized'] = {
        id: 'uncategorized',
        name: 'Ohne Kategorie',
        textChannels: [],
        voiceChannels: []
      };
      
      // Fülle die Kategorien mit Kanälen
      guild.channels.cache.forEach(function(ch) {
        if (ch.type === 0 || ch.type === 5) { // GUILD_TEXT oder GUILD_NEWS
          var textChannel = {
            id: ch.id,
            name: ch.name,
            type: ch.type,
            lastMessage: ch.lastMessage ? {
              content: ch.lastMessage.content,
              author: ch.lastMessage.author.tag,
              timestamp: ch.lastMessage.createdTimestamp
            } : null
          };
          
          if (ch.parentId && categories[ch.parentId]) {
            categories[ch.parentId].textChannels.push(textChannel);
          } else {
            categories['uncategorized'].textChannels.push(textChannel);
          }
        }
        
        if (ch.type === 2) { // GUILD_VOICE
          var members = [];
          ch.members.forEach(function(member) {
            members.push({
              id: member.id,
              tag: member.user.tag,
              avatar: member.user.displayAvatarURL({ dynamic: true }),
              muted: member.voice.mute || member.voice.selfMute,
              deafened: member.voice.deaf || member.voice.selfDeaf,
              streaming: member.voice.streaming
            });
          });
          
          var voiceChannel = {
            id: ch.id,
            name: ch.name,
            type: ch.type,
            members: members
          };
          
          if (ch.parentId && categories[ch.parentId]) {
            categories[ch.parentId].voiceChannels.push(voiceChannel);
          } else {
            categories['uncategorized'].voiceChannels.push(voiceChannel);
          }
        }
      });
      
      // Entferne leere Kategorien
      Object.keys(categories).forEach(function(key) {
        if (
          categories[key].textChannels.length === 0 && 
          categories[key].voiceChannels.length === 0 &&
          key !== 'uncategorized'
        ) {
          delete categories[key];
        }
      });
      
      // Entferne "Ohne Kategorie" wenn leer
      if (
        categories['uncategorized'].textChannels.length === 0 && 
        categories['uncategorized'].voiceChannels.length === 0
      ) {
        delete categories['uncategorized'];
      }
      
      console.log(`Sending activeUpdate for guild ${guildId} with ${Object.keys(categories).length} categories`);
      
      socket.emit('activeUpdate', { guildId: guildId, activeData: Object.values(categories) });
    });

    // Handler für Update-Intervall-Änderung
    socket.on('setUpdateInterval', function(data) {
      const { guildId, interval } = data;
      if (guildId && interval !== undefined) {
        sharedData.userStatusUpdateIntervals.set(guildId, interval);
        console.log(`Update interval for guild ${guildId} set to ${interval} seconds`);
        socket.emit('updateIntervalSet', { success: true, guildId, interval });
      }
    });
  });
}

function sendServerList(socket, client, collections) {
  const servers = [];
  client.guilds.cache.forEach(function(guild) {
    servers.push({ id: guild.id, name: guild.name, active: true });
  });
  
  // Füge historische Server hinzu
  collections.historicalServers.find({ left: true }).toArray()
    .then(function(historicalServers) {
      historicalServers.forEach(function(server) {
        if (!servers.some(function(s) { return s.id === server.id; })) {
          servers.push({ 
            id: server.id, 
            name: server.name, 
            active: false, 
            leftAt: server.leftAt 
          });
        }
      });
      socket.emit('serverListUpdate', servers);
    })
    .catch(function(err) {
      console.error("Error getting historical servers:", err);
      socket.emit('serverListUpdate', servers); // Sende zumindest die aktiven Server
    });
}

module.exports = { setupSocketHandlers };