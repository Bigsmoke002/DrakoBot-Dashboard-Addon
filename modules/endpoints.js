// addons/dashboard/modules/endpoints.js

const fs = require('fs');

function setupEndpoints(appServer, client, collections, sqliteDb, config, configPath, sharedData) {
  
  // Bot Status ändern
  appServer.get('/bot-status', (req, res) => {
    const status = req.query.status;
    const activity = req.query.activity;
    if (!client.user) return res.status(500).send("Bot user not ready.");
    try {
      client.user.setPresence({
        status: status || 'online',
        activities: activity ? [{ name: activity }] : []
      });
      res.send({ success: true, status, activity });
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  // Channels eines Servers abrufen (FIXED VERSION)
  appServer.get('/channels/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        console.log(`Guild ${guildId} not found`);
        return res.status(404).json({ error: "Guild not found" });
      }

      console.log(`Loading channels for guild: ${guild.name} (${guildId})`);
      
      // Sammle alle Kategorien
      const categories = {};
      
      // Erst alle Kategorien sammeln
      guild.channels.cache.forEach(ch => {
        if (ch.type === 4) { // GUILD_CATEGORY = 4
          categories[ch.id] = {
            id: ch.id,
            name: ch.name,
            position: ch.position,
            channels: []
          };
        }
      });
      
      // Dann alle anderen Kanäle den Kategorien zuordnen
      guild.channels.cache.forEach(ch => {
        if (ch.type !== 4) { // Nicht-Kategorie-Kanäle
          const channelData = {
            id: ch.id,
            name: ch.name,
            type: ch.type,
            position: ch.position
          };
          
          // Text/News Channel spezifische Daten
          if (ch.type === 0 || ch.type === 5) { // GUILD_TEXT oder GUILD_NEWS
            channelData.topic = ch.topic;
            channelData.nsfw = ch.nsfw;
            channelData.rateLimitPerUser = ch.rateLimitPerUser;
            
            // Letzte Nachricht (vorsichtig laden)
            try {
              if (ch.lastMessage) {
                channelData.lastMessage = {
                  content: ch.lastMessage.content || '',
                  author: ch.lastMessage.author ? ch.lastMessage.author.tag : 'Unknown',
                  timestamp: ch.lastMessage.createdTimestamp
                };
              }
            } catch (err) {
              console.log(`Could not load last message for channel ${ch.name}:`, err.message);
            }
          }
          
          // Voice Channel spezifische Daten
          if (ch.type === 2) { // GUILD_VOICE
            channelData.bitrate = ch.bitrate;
            channelData.userLimit = ch.userLimit;
            
            const members = [];
            try {
              ch.members.forEach(member => {
                members.push({
                  id: member.id,
                  tag: member.user.tag,
                  avatar: member.user.displayAvatarURL({ dynamic: true }),
                  muted: member.voice.mute || member.voice.selfMute,
                  deafened: member.voice.deaf || member.voice.selfDeaf,
                  streaming: member.voice.streaming
                });
              });
            } catch (err) {
              console.log(`Could not load voice members for channel ${ch.name}:`, err.message);
            }
            channelData.members = members;
          }
          
          // Kategorie zuordnen
          const categoryId = ch.parentId;
          if (categoryId && categories[categoryId]) {
            categories[categoryId].channels.push(channelData);
          } else {
            // Kanäle ohne Kategorie
            if (!categories['uncategorized']) {
              categories['uncategorized'] = {
                id: 'uncategorized',
                name: 'Ohne Kategorie',
                position: 999,
                channels: []
              };
            }
            categories['uncategorized'].channels.push(channelData);
          }
        }
      });
      
      // Sortiere Kanäle innerhalb jeder Kategorie nach Position
      Object.values(categories).forEach(category => {
        if (category.channels) {
          category.channels.sort((a, b) => (a.position || 0) - (b.position || 0));
        }
      });
      
      // Konvertiere zu Array und sortiere nach Position
      const result = Object.values(categories).sort((a, b) => (a.position || 0) - (b.position || 0));
      
      console.log(`Found ${result.length} categories with channels`);
      res.json(result);
      
    } catch (err) {
      console.error("Error loading channels:", err);
      res.status(500).json({ error: "Internal server error", details: err.message });
    }
  });

  // Server-Statistiken erweitert mit Bot-Zählung
  appServer.get('/server-stats/:guildId', async (req, res) => {
    const guildId = req.params.guildId;
    
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).send("Guild not found.");

      const allMembers = guild.members.cache;
      const bots = allMembers.filter(member => member.user.bot).size;
      const humans = allMembers.size - bots;

      const statsDoc = await collections.serverStats.findOne({ guild_id: guildId });
      if (!statsDoc) return res.status(404).send("No server statistics found.");

      // Erweitere die Statistiken um Bot-Informationen
      statsDoc.memberStats = {
        total: allMembers.size,
        humans: humans,
        bots: bots
      };

      res.json(statsDoc);
    } catch (err) {
      console.error("Error loading server stats:", err);
      res.status(500).json({ error: "Internal server error", details: err.message });
    }
  });

  // Alle User aus der Datenbank (neue Übersicht)
  appServer.get('/all-users', async (req, res) => {
    const searchQuery = req.query.search || '';
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 50;

    try {
      // Erstelle Filter für Suche
      const filter = {};
      if (searchQuery) {
        filter.$or = [
          { username: { $regex: searchQuery, $options: 'i' } },
          { userId: { $regex: searchQuery, $options: 'i' } },
          { tag: { $regex: searchQuery, $options: 'i' } }
        ];
      }

      // Hole Benutzer mit Pagination
      const users = await collections.allUsers
        .find(filter)
        .sort({ lastSeen: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();

      // Zähle Gesamtanzahl für Pagination
      const totalCount = await collections.allUsers.countDocuments(filter);

      // Erweitere Benutzerdaten mit zusätzlichen Informationen
      const enrichedUsers = await Promise.all(users.map(async (user) => {
        // Zähle Namensänderungen
        let nameChangeCount = 0;
        try {
          const nameChanges = await new Promise((resolve, reject) => {
            sqliteDb.get(
              `SELECT COUNT(*) as count FROM usernameChanges WHERE user_id = ?`,
              [user.userId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });
          nameChangeCount = nameChanges?.count || 0;
        } catch (err) {
          console.error("Error counting name changes:", err);
        }

        // Hole Server-Informationen
        const servers = user.guilds ? user.guilds.map(guildId => {
          const guild = client.guilds.cache.get(guildId);
          return guild ? guild.name : `Server ${guildId}`;
        }) : [];

        return {
          ...user,
          nameChangeCount,
          serverNames: servers
        };
      }));

      res.json({
        users: enrichedUsers,
        totalCount,
        hasMore: offset + limit < totalCount
      });

    } catch (err) {
      console.error("Error fetching all users:", err);
      res.status(500).json({ error: "Fehler beim Laden der Benutzer" });
    }
  });

  // User Status Update Intervall setzen
  appServer.post('/set-update-interval', (req, res) => {
    const { guildId, interval } = req.body;
    if (!guildId || interval === undefined) {
      return res.status(400).json({ error: "Guild ID und Intervall erforderlich" });
    }

    sharedData.userStatusUpdateIntervals.set(guildId, interval);
    res.json({ success: true, interval });
  });

  // Aktive Benutzer für Voice und Text
  appServer.get('/active-users/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).send("Guild not found.");

      const activeData = {
        voiceUsers: [],
        recentMessages: []
      };

      // Voice-Benutzer sammeln
      guild.channels.cache.forEach(channel => {
        if (channel.type === 2 && channel.members.size > 0) { // GUILD_VOICE
          channel.members.forEach(member => {
            activeData.voiceUsers.push({
              userId: member.id,
              username: member.user.tag,
              avatar: member.user.displayAvatarURL({ dynamic: true }),
              channelName: channel.name,
              channelId: channel.id,
              status: member.presence?.status || 'offline',
              activities: member.presence?.activities.map(a => a.name) || [],
              muted: member.voice.mute || member.voice.selfMute,
              deafened: member.voice.deaf || member.voice.selfDeaf,
              streaming: member.voice.streaming,
              joinedAt: member.voice.channelId ? Date.now() : null // Vereinfacht
            });
          });
        }
      });

      // Aktuelle Nachrichten aus dem Event-Log (letzte 10 Minuten)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      activeData.recentMessages = sharedData.eventLog
        .filter(event => 
          event.guild_id === guildId && 
          event.event_type === 'messageCreate' &&
          new Date(event.timestamp).getTime() > tenMinutesAgo
        )
        .slice(-20) // Letzte 20 Nachrichten
        .map(event => ({
          username: event.data.author,
          channelName: event.data.channel,
          content: event.data.content.substring(0, 100) + (event.data.content.length > 100 ? '...' : ''),
          timestamp: event.timestamp
        }));

      res.json(activeData);
    } catch (err) {
      console.error("Error loading active users:", err);
      res.status(500).json({ error: "Internal server error", details: err.message });
    }
  });

  // Restliche Endpoints...
  const { setupOtherEndpoints } = require('./otherEndpoints');
  setupOtherEndpoints(appServer, client, collections, sqliteDb, config, configPath, sharedData);
}

module.exports = { setupEndpoints };