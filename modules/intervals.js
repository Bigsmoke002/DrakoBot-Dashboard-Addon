// addons/dashboard/modules/intervals.js

const os = require('os');

function setupIntervals(client, collections, sqliteDb, io, config, sharedData) {
  
  // Sichere Funktion zum Aktualisieren der allUsers Collection
  async function updateAllUsersCollectionSafe(user, guildId, collections) {
    try {
      const existingUser = await collections.allUsers.findOne({ userId: user.id });
      
      const userData = {
        userId: user.id,
        username: user.username,
        discriminator: user.discriminator,
        tag: user.tag,
        avatar: user.avatar,
        status: user.status,
        activities: user.activities,
        lastSeen: new Date().toISOString(),
        isBot: user.isBot
      };

      if (existingUser) {
        // User existiert bereits - nur Updates
        const guilds = existingUser.guilds || [];
        if (!guilds.includes(guildId)) {
          guilds.push(guildId);
        }
        
        await collections.allUsers.updateOne(
          { userId: user.id },
          { 
            $set: {
              ...userData,
              guilds: guilds
            }
          }
        );
      } else {
        // Neuer User - kompletter Eintrag
        await collections.allUsers.insertOne({
          ...userData,
          guilds: [guildId],
          firstSeen: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error in updateAllUsersCollectionSafe:", err);
    }
  }
  
  // Server-Statistiken alle Minute aktualisieren
  setInterval(() => {
    client.guilds.cache.forEach(async (guild) => {
      const allMembers = guild.members.cache;
      const bots = allMembers.filter(member => member.user.bot).size;
      const humans = allMembers.size - bots;

      const serverInfo = {
        name: guild.name,
        id: guild.id,
        createdAt: guild.createdAt.toISOString(),
        ownerId: guild.ownerId,
        description: guild.description || '',
        boostLevel: guild.premiumTier,
        region: guild.preferredLocale
      };

      const now = Date.now();
      const t24 = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const t7  = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      const t30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

      try {
        const count24Add = await collections.memberLogs.countDocuments({ 
          guild_id: guild.id, 
          event_type: 'guildMemberAdd', 
          timestamp: { $gte: t24 } 
        });
        const count24Remove = await collections.memberLogs.countDocuments({ 
          guild_id: guild.id, 
          event_type: 'guildMemberRemove', 
          timestamp: { $gte: t24 } 
        });
        const stats24 = { joined: count24Add, left: count24Remove, net: count24Add - count24Remove };

        const count7Add = await collections.memberLogs.countDocuments({ 
          guild_id: guild.id, 
          event_type: 'guildMemberAdd', 
          timestamp: { $gte: t7 } 
        });
        const count7Remove = await collections.memberLogs.countDocuments({ 
          guild_id: guild.id, 
          event_type: 'guildMemberRemove', 
          timestamp: { $gte: t7 } 
        });
        const stats7 = { joined: count7Add, left: count7Remove, net: count7Add - count7Remove };

        const count30Add = await collections.memberLogs.countDocuments({ 
          guild_id: guild.id, 
          event_type: 'guildMemberAdd', 
          timestamp: { $gte: t30 } 
        });
        const count30Remove = await collections.memberLogs.countDocuments({ 
          guild_id: guild.id, 
          event_type: 'guildMemberRemove', 
          timestamp: { $gte: t30 } 
        });
        const stats30 = { joined: count30Add, left: count30Remove, net: count30Add - count30Remove };

        const statsData = {
          guild_id: guild.id,
          memberCount: allMembers.size,
          memberStats: {
            total: allMembers.size,
            humans: humans,
            bots: bots
          },
          serverInfo,
          stats24,
          stats7,
          stats30,
          updatedAt: new Date().toISOString()
        };
        
        await collections.serverStats.updateOne(
          { guild_id: guild.id }, 
          { $set: statsData }, 
          { upsert: true }
        );
      } catch (err) {
        console.error("Error updating server stats for guild", guild.id, err);
      }
    });
    
    updateHistoricalServers();
  }, 60 * 1000);

  // Historische Server verfolgen
  async function updateHistoricalServers() {
    try {
      const knownServers = await collections.historicalServers.find({}).toArray();
      const knownServerIds = new Set(knownServers.map(s => s.id));
      const currentServerIds = new Set(client.guilds.cache.map(g => g.id));
      
      // Server, die nicht mehr aktiv sind
      for (const serverId of knownServerIds) {
        if (!currentServerIds.has(serverId)) {
          const server = knownServers.find(s => s.id === serverId);
          if (server && !server.left) {
            await collections.historicalServers.updateOne(
              { id: serverId },
              { $set: { left: true, leftAt: new Date().toISOString() } }
            );
          }
        } else {
          await collections.historicalServers.updateOne(
            { id: serverId },
            { $set: { left: false, leftAt: null } }
          );
        }
      }
      
      // Neue Server hinzufügen
      for (const [guildId, guild] of client.guilds.cache) {
        if (!knownServerIds.has(guildId)) {
          await collections.historicalServers.insertOne({
            id: guildId,
            name: guild.name,
            joined: true,
            joinedAt: new Date().toISOString(),
            left: false,
            leftAt: null,
            memberCount: guild.memberCount,
            region: guild.preferredLocale,
            ownerId: guild.ownerId
          });
        } else {
          await collections.historicalServers.updateOne(
            { id: guildId },
            { 
              $set: { 
                name: guild.name,
                memberCount: guild.memberCount,
                region: guild.preferredLocale,
                ownerId: guild.ownerId,
                lastUpdated: new Date().toISOString()
              }
            }
          );
        }
      }
    } catch (err) {
      console.error("Error updating historical servers:", err);
    }
  }

  // Aktive Channel-Updates alle 5 Sekunden
  setInterval(function() {
    client.guilds.cache.forEach(function(guild) {
      const categories = {};
      
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
      
      categories['uncategorized'] = {
        id: 'uncategorized',
        name: 'Ohne Kategorie',
        textChannels: [],
        voiceChannels: []
      };
      
      guild.channels.cache.forEach(function(ch) {
        if (ch.type === 0 || ch.type === 5) { // GUILD_TEXT oder GUILD_NEWS
          const textChannel = {
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
          const members = [];
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
          
          const voiceChannel = {
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
      
      if (
        categories['uncategorized'].textChannels.length === 0 && 
        categories['uncategorized'].voiceChannels.length === 0
      ) {
        delete categories['uncategorized'];
      }
      
      io.emit('activeUpdate', { guildId: guild.id, activeData: Object.values(categories) });
    });
  }, 5000);

  // User Status Updates mit konfigurierbaren Intervallen
  setInterval(function() {
    client.guilds.cache.forEach(function(guild) {
      // Prüfe das konfigurierte Intervall für diesen Server
      const guildInterval = sharedData.userStatusUpdateIntervals.get(guild.id) || config.userStatusUpdateInterval || 10;
      
      // Überspringe wenn das Intervall auf 0 (aus) gesetzt ist
      if (guildInterval === 0) return;
      
      // Prüfe ob genug Zeit vergangen ist (vereinfachte Implementierung)
      const now = Date.now();
      const lastUpdate = sharedData.lastUserStatusUpdate?.get(guild.id) || 0;
      
      if (now - lastUpdate < guildInterval * 1000) return;
      
      // Aktualisiere Timestamp
      if (!sharedData.lastUserStatusUpdate) {
        sharedData.lastUserStatusUpdate = new Map();
      }
      sharedData.lastUserStatusUpdate.set(guild.id, now);

      const users = guild.members.cache.map(function(member) {
        return {
          id: member.id,
          tag: member.user.tag,
          avatar: member.user.displayAvatarURL({ dynamic: true }),
          status: member.presence ? member.presence.status : 'offline',
          activities: member.presence
            ? member.presence.activities.map(function(a) { 
                return a.type === 'CUSTOM' ? (a.state || a.name) : a.name; 
              })
            : [],
          username: member.user.username,
          discriminator: member.user.discriminator,
          nickname: member.nickname,
          isBot: member.user.bot
        };
      });
      
      io.emit('userStatusUpdate', { guildId: guild.id, users: users });
      
      // Update users in MongoDB
      users.forEach(function(user) {
        collections.users.updateOne(
          { id: user.id }, 
          { $set: user }, 
          { upsert: true }, 
          function(err) {
            if (err) console.error("Error updating user in MongoDB:", err);
          }
        );

        // Update allUsers collection - sichere Methode ohne Konflikte
        updateAllUsersCollectionSafe(user, guild.id, collections).catch(err => 
          console.error("Error updating allUsers:", err)
        );
      });
    });
  }, 5000); // Prüfe alle 5 Sekunden, aber respektiere individuelle Intervalle

  // Audit Log alle 30 Sekunden
  setInterval(function() {
    client.guilds.cache.forEach(async function(guild) {
      try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 10 });
        const entries = auditLogs.entries.map(function(entry) {
          const executorAvatar = entry.executor.displayAvatarURL({ dynamic: true });
          return {
            action: entry.action,
            executor: entry.executor.tag,
            executorAvatar: executorAvatar,
            target: entry.target ? (entry.target.tag || entry.target.id) : 'N/A',
            reason: entry.reason || "Kein Grund angegeben",
            createdAt: entry.createdAt,
            changes: entry.changes || []
          };
        });
        
        io.emit('auditLogUpdate', { guildId: guild.id, entries: entries });
        
        entries.forEach(function(entry) {
          collections.auditLogs.insertOne({
            guild_id: guild.id,
            event_type: 'auditLog',
            data: entry,
            timestamp: new Date().toISOString()
          }, function(err) {
            if (err) console.error("Error inserting audit log into MongoDB:", err);
          });
        });
      } catch (error) {
        console.error(`Error fetching audit logs for guild ${guild.id}:`, error);
      }
    });
  }, 30000);

  // Rollen alle 30 Sekunden
  setInterval(function() {
    client.guilds.cache.forEach(function(guild) {
      const roles = guild.roles.cache.map(function(role) {
        return {
          id: role.id,
          name: role.name,
          permissions: role.permissions.toArray()
        };
      });
      io.emit('rolesUpdate', { guildId: guild.id, roles: roles });
    });
  }, 30000);

  // Performance Monitoring alle 2 Sekunden
  setInterval(function() {
    const memoryUsage = process.memoryUsage();
    const loadAvg = os.loadavg();
    const cpuUsage = process.cpuUsage();
    
    const performanceData = {
      timestamp: new Date().toISOString(),
      memoryUsage: memoryUsage,
      loadAvg: loadAvg,
      cpuUsage: cpuUsage
    };
    
    sharedData.performanceHistory.push(performanceData);
    
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    sharedData.performanceHistory = sharedData.performanceHistory.filter(function(item) {
      return new Date(item.timestamp).getTime() >= cutoff;
    });
    
    const count = sharedData.performanceHistory.length;
    let totalMemoryRSS = 0, totalMemoryHeap = 0, totalCpuUser = 0, totalCpuSystem = 0;
    
    sharedData.performanceHistory.forEach(function(item) {
      totalMemoryRSS  += item.memoryUsage.rss;
      totalMemoryHeap += item.memoryUsage.heapUsed;
      totalCpuUser    += item.cpuUsage.user;
      totalCpuSystem  += item.cpuUsage.system;
    });
    
    const summary = {
      avgMemoryRSS:  count ? totalMemoryRSS  / count : 0,
      avgMemoryHeap: count ? totalMemoryHeap / count : 0,
      avgCpuUser:    count ? totalCpuUser    / count : 0,
      avgCpuSystem:  count ? totalCpuSystem  / count : 0
    };
    
    const performancePayload = {
      current: performanceData,
      summary: summary
    };

    // MongoDB-Statistiken
    Promise.all([
      collections.messageLogs.estimatedDocumentCount(),
      collections.auditLogs.estimatedDocumentCount(),
      collections.presenceLogs.estimatedDocumentCount(),
      collections.memberLogs.estimatedDocumentCount(),
      collections.users.estimatedDocumentCount(),
      collections.serverStats.estimatedDocumentCount(),
      collections.userActivities.estimatedDocumentCount(),
      collections.allUsers.estimatedDocumentCount()
    ]).then(function(counts) {
      const [msgCount, auditCount, presenceCount, memberCount, userCount, serverStatsCount, userActivitiesCount, allUsersCount] = counts;
      
      const totalLogCount = msgCount + auditCount + presenceCount + memberCount + userActivitiesCount;
      const mongodbInfo = {
        totalStorageSize: 0, // Vereinfacht
        logCount: totalLogCount,
        userCount: userCount,
        serverStatsCount: serverStatsCount,
        userActivitiesCount: userActivitiesCount,
        allUsersCount: allUsersCount
      };
      
      performancePayload.dbInfo = { mongodb: mongodbInfo, sqlite: {} };
      io.emit('performanceUpdate', performancePayload);
    }).catch(function(err) {
      performancePayload.dbInfo = { mongodb: { error: err.toString() }, sqlite: {} };
      io.emit('performanceUpdate', performancePayload);
    });
  }, 2000);

  // Task Manager alle 15 Sekunden
  setInterval(function() {
    const handles = process._getActiveHandles().map(function(handle, index) { 
      return { index: index, type: handle.constructor.name }; 
    });
    io.emit('taskManagerUpdate', handles);
  }, 15000);
}

module.exports = { setupIntervals };