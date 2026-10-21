// addons/dashboard/modules/otherEndpoints.js

const fs = require('fs');

function setupOtherEndpoints(appServer, client, collections, sqliteDb, config, configPath, sharedData) {
  
  // Historische Server abrufen
  appServer.get('/historical-servers', async (req, res) => {
    try {
      const servers = await collections.historicalServers.find({}).toArray();
      res.send(servers);
    } catch (err) {
      res.status(500).send({ error: err.message });
    }
  });

  // Benutzernamenänderungen abrufen
  appServer.get('/username-changes/:guildId/:userId', (req, res) => {
    const { guildId, userId } = req.params;
    sqliteDb.all(`
      SELECT * FROM usernameChanges 
      WHERE guild_id = ? AND user_id = ? 
      ORDER BY timestamp DESC
    `, [guildId, userId], (err, rows) => {
      if (err) {
        console.error(`Error fetching username changes:`, err);
        return res.status(500).json({ error: "Error reading username changes", details: err.toString() });
      }
      res.json(rows);
    });
  });

  // Benutzeraktivitäten abrufen
  appServer.get('/user-activities/:guildId', async (req, res) => {
    const guildId = req.params.guildId;
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || 'all';
    const userFilter = req.query.user || '';
    const daysFilter = req.query.days || 'all';
    
    const filter = { guild_id: guildId };
    
    if (type !== 'all') {
      if (type === 'message') {
        filter.type = { $in: ['messageCreate', 'messageDelete', 'messageUpdate'] };
      } else if (type === 'voice') {
        filter.type = { $in: ['voiceJoin', 'voiceLeave', 'voiceMove', 'voiceState'] };
      } else if (type === 'role') {
        filter.type = { $in: ['roleAdd', 'roleRemove', 'roleUpdate'] };
      } else if (type === 'presence') {
        filter.type = 'presenceUpdate';
      } else if (type === 'username') {
        filter.type = { $in: ['usernameChange', 'nicknameChange'] };
      } else if (type === 'join') {
        filter.type = { $in: ['guildMemberAdd', 'guildMemberRemove'] };
      } else {
        filter.type = type;
      }
    }
    
    if (userFilter) {
      filter.user = { $regex: userFilter, $options: 'i' };
    }
    
    if (daysFilter !== 'all') {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(daysFilter));
      filter.timestamp = { $gte: daysAgo.toISOString() };
    }
    
    try {
      const stats = {
        total: await collections.userActivities.countDocuments(filter),
        messages: await collections.userActivities.countDocuments({ 
          ...filter, 
          type: { $in: ['messageCreate', 'messageDelete', 'messageUpdate'] } 
        }),
        voice: await collections.userActivities.countDocuments({ 
          ...filter, 
          type: { $in: ['voiceJoin', 'voiceLeave', 'voiceMove', 'voiceState'] } 
        }),
        roles: await collections.userActivities.countDocuments({ 
          ...filter, 
          type: { $in: ['roleAdd', 'roleRemove', 'roleUpdate'] } 
        }),
        presence: await collections.userActivities.countDocuments({ 
          ...filter, 
          type: 'presenceUpdate' 
        })
      };
      
      const activities = await collections.userActivities
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();
      
      const totalCount = await collections.userActivities.countDocuments(filter);
      const hasMore = offset + limit < totalCount;
      
      res.json({ activities, stats, hasMore });
    } catch (err) {
      console.error("Error fetching user activities:", err);
      res.status(500).json({ error: "Fehler beim Abrufen der Benutzeraktivitäten" });
    }
  });

  // Export von Benutzeraktivitäten als CSV
  appServer.get('/export-user-activities/:guildId', async (req, res) => {
    const guildId = req.params.guildId;
    const type = req.query.type || 'all';
    const userFilter = req.query.user || '';
    const daysFilter = req.query.days || 'all';
    
    const filter = { guild_id: guildId };
    
    if (type !== 'all') {
      // ... Filter-Logik wie oben
    }
    
    if (userFilter) {
      filter.user = { $regex: userFilter, $options: 'i' };
    }
    
    if (daysFilter !== 'all') {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(daysFilter));
      filter.timestamp = { $gte: daysAgo.toISOString() };
    }
    
    try {
      const activities = await collections.userActivities
        .find(filter)
        .sort({ timestamp: -1 })
        .toArray();
      
      let csv = "Timestamp,User,Type,Channel,Details\n";
      activities.forEach(activity => {
        const timestamp = activity.timestamp;
        const user = (activity.user || '').replace(/"/g, '""');
        const type = activity.type || '';
        const channel = (activity.channel || '').replace(/"/g, '""');
        let details = '';
        
        if (activity.details) {
          if (typeof activity.details === 'string') {
            details = activity.details.replace(/"/g, '""');
          } else {
            details = JSON.stringify(activity.details).replace(/"/g, '""');
          }
        }
        
        csv += `"${timestamp}","${user}","${type}","${channel}","${details}"\n`;
      });
      
      res.setHeader('Content-disposition', 'attachment; filename=user_activities_export.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } catch (err) {
      console.error("Error exporting user activities:", err);
      res.status(500).send("Fehler beim Exportieren der Benutzeraktivitäten");
    }
  });

  // Konfiguration abrufen
  appServer.get('/get-config', (req, res) => {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      res.json(config);
    } catch (err) {
      console.error("Error reading config:", err);
      res.status(500).json({ error: "Error reading configuration file" });
    }
  });

  // Konfiguration speichern
  appServer.post('/save-config', (req, res) => {
    try {
      const newConfig = req.body;
      
      if (!newConfig.port || !newConfig.adminRoleId) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required configuration fields (port, adminRoleId)" 
        });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
      Object.assign(config, newConfig);
      
      res.json({ success: true, message: "Configuration saved successfully" });
    } catch (err) {
      console.error("Error saving config:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Logs laden
  appServer.get('/logs/:guildId/:eventType', (req, res) => {
    const { guildId, eventType } = req.params;
    let coll;
    
    switch(eventType) {
      case 'messageCreate':
      case 'messageDelete':
        coll = collections.messageLogs;
        break;
      case 'auditLog':
        coll = collections.auditLogs;
        break;
      case 'presenceUpdate':
        return res.status(400).send("Presence logs are stored in SQLite for history.");
      case 'guildMemberAdd':
      case 'guildMemberRemove':
        coll = collections.memberLogs;
        break;
      case 'usernameChange':
        return sqliteDb.all(`SELECT * FROM usernameChanges WHERE guild_id = ? ORDER BY timestamp DESC LIMIT 100`, [guildId], (err, rows) => {
          if (err) return res.status(500).send("Error reading username changes from SQLite.");
          res.send(rows);
        });
      default:
        coll = collections.messageLogs;
    }
    
    coll.find({ guild_id: guildId, event_type: eventType })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray((err, docs) => {
        if (err) return res.status(500).send("Error reading logs from MongoDB.");
        res.send(docs);
      });
  });

  // Export Logs als CSV
  appServer.get('/export-logs/:guildId/:eventType', (req, res) => {
    const { guildId, eventType } = req.params;
    // ... Implementierung wie im Original
  });

  // Server-Liste
  appServer.get('/serverList', (req, res) => {
    const servers = [];
    client.guilds.cache.forEach(guild => {
      servers.push({ id: guild.id, name: guild.name, active: true });
    });
    
    collections.historicalServers.find({ left: true }).toArray()
      .then(historicalServers => {
        historicalServers.forEach(server => {
          if (!servers.some(s => s.id === server.id)) {
            servers.push({ 
              id: server.id, 
              name: server.name, 
              active: false, 
              leftAt: server.leftAt 
            });
          }
        });
        res.send(servers);
      })
      .catch(err => {
        console.error("Error getting historical servers:", err);
        res.send(servers);
      });
  });

  // User History (Presence) – aus SQLite abrufen
  appServer.get('/presence-history/:guildId/:userId', (req, res) => {
    const { guildId, userId } = req.params;
    sqliteDb.all(`SELECT * FROM userHistory WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC`, [guildId, userId], (err, rows) => {
      if (err) {
        console.error(`Error fetching presence history:`, err);
        return res.status(500).json({ error: "Error reading user history from SQLite", details: err.toString() });
      }
      res.json(rows);
    });
  });

  // Konfig-Update (Legacy)
  appServer.get('/update-config', (req, res) => {
    const newConfig = { ...config };
    if (req.query.port) newConfig.port = parseInt(req.query.port);
    if (req.query.adminRoleId) newConfig.adminRoleId = req.query.adminRoleId;
    if (req.query.socketIoClient) newConfig.socketIoClient = req.query.socketIoClient;
    
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    Object.assign(config, newConfig);
    
    const newSocketUrl = config.socketIoClient === "cdn" ?
      "https://cdn.socket.io/4.5.1/socket.io.min.js" :
      "/socket.io/socket.io.js";
    
    res.send({ success: true, config: newConfig, socketIoSourceUrl: newSocketUrl });
  });
}

module.exports = { setupOtherEndpoints };