// addons/dashboard/modules/discordEvents.js

function setupDiscordEvents(client, collections, sqliteDb, io, sharedData) {
  
  // Event-Logging-Funktion
  function logEvent(guildId, eventType, data) {
    const timestamp = new Date().toISOString();
    const eventEntry = { guild_id: guildId, event_type: eventType, data: data, timestamp: timestamp };
    sharedData.eventLog.push(eventEntry);
    io.emit('newEvent', eventEntry);
    
    if (!guildId) return;
    
    switch(eventType) {
      case 'messageCreate':
      case 'messageDelete':
        collections.messageLogs.insertOne(eventEntry, function(err) {
          if (err) console.error("Error inserting message log:", err);
        });
        break;
      case 'auditLog':
        collections.auditLogs.insertOne(eventEntry, function(err) {
          if (err) console.error("Error inserting audit log:", err);
        });
        break;
      case 'presenceUpdate':
        sqliteDb.run(
          `INSERT INTO userHistory (guild_id, user_id, old_status, new_status, activities, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
          [guildId, data.id, data.oldStatus, data.newStatus, JSON.stringify(data.activities), timestamp],
          function(err) {
            if (err) console.error("Error inserting user history into SQLite:", err);
          }
        );
        break;
      case 'usernameChange':
        sqliteDb.run(
          `INSERT INTO usernameChanges (
            guild_id, user_id, 
            old_username, new_username, 
            old_discriminator, new_discriminator, 
            old_nickname, new_nickname, 
            timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            guildId, data.id, 
            data.oldUsername, data.newUsername, 
            data.oldDiscriminator, data.newDiscriminator, 
            data.oldNickname, data.newNickname, 
            timestamp
          ],
          function(err) {
            if (err) console.error("Error inserting username change into SQLite:", err);
          }
        );
        io.emit('usernameChange', { guildId: guildId, userId: data.id, change: data, timestamp: timestamp });
        break;
      case 'guildMemberAdd':
      case 'guildMemberRemove':
        collections.memberLogs.insertOne(eventEntry, function(err) {
          if (err) console.error("Error inserting member log:", err);
        });
        break;
      default:
        collections.messageLogs.insertOne(eventEntry, function(err) {
          if (err) console.error("Error inserting log:", err);
        });
    }
  }

  // Funktion zum Aktualisieren der allUsers Collection
  async function updateAllUsersCollection(member, guildId) {
    try {
      // Erst prüfen, ob der User bereits existiert
      const existingUser = await collections.allUsers.findOne({ userId: member.id });
      
      const userData = {
        userId: member.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        tag: member.user.tag,
        avatar: member.user.displayAvatarURL({ dynamic: true }),
        isBot: member.user.bot,
        status: member.presence?.status || 'offline',
        activities: member.presence?.activities.map(a => a.name) || [],
        lastSeen: new Date().toISOString()
      };

      if (existingUser) {
        // User existiert bereits - nur Updates
        const guilds = existingUser.guilds || [];
        if (!guilds.includes(guildId)) {
          guilds.push(guildId);
        }
        
        await collections.allUsers.updateOne(
          { userId: member.id },
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
      console.error("Error updating allUsers collection:", err);
    }
  }

  // Funktion zum Speichern des aktuellen Benutzernamens
  function storeCurrentUsername(guild, member) {
    const userId = member.id;
    const guildId = guild.id;
    const key = `${guildId}-${userId}`;
    
    const currentData = {
      username: member.user.username,
      discriminator: member.user.discriminator,
      nickname: member.nickname
    };
    
    if (!sharedData.usernameMappings.has(key)) {
      sharedData.usernameMappings.set(key, currentData);
    }
  }

  // Prüfen auf Namensänderungen
  function checkUsernameChange(guild, member) {
    const userId = member.id;
    const guildId = guild.id;
    const key = `${guildId}-${userId}`;
    
    if (!sharedData.usernameMappings.has(key)) {
      storeCurrentUsername(guild, member);
      return;
    }
    
    const oldData = sharedData.usernameMappings.get(key);
    const newData = {
      username: member.user.username,
      discriminator: member.user.discriminator,
      nickname: member.nickname
    };
    
    let hasChanges = false;
    if (oldData.username !== newData.username) hasChanges = true;
    if (oldData.discriminator !== newData.discriminator) hasChanges = true;
    if (oldData.nickname !== newData.nickname) hasChanges = true;
    
    if (hasChanges) {
      logEvent(guildId, 'usernameChange', {
        id: userId,
        oldUsername: oldData.username,
        newUsername: newData.username,
        oldDiscriminator: oldData.discriminator,
        newDiscriminator: newData.discriminator,
        oldNickname: oldData.nickname,
        newNickname: newData.nickname
      });
      
      sharedData.usernameMappings.set(key, newData);
    }
  }

  // Discord-Events
  client.on('messageCreate', function(message) {
    if (!message.guild) return;
    
    logEvent(message.guild.id, 'messageCreate', {
      channel: message.channel.name,
      author: message.author.tag,
      content: message.content
    });
    
    const activity = {
      guild_id: message.guild.id,
      type: 'messageCreate',
      user: message.author.tag,
      userId: message.author.id,
      channel: message.channel.name,
      channelId: message.channel.id,
      details: message.content,
      timestamp: new Date().toISOString()
    };
    
    collections.userActivities.insertOne(activity).catch(err => {
      console.error("Error inserting message activity:", err);
    });

    // Aktualisiere allUsers Collection
    if (message.member) {
      updateAllUsersCollection(message.member, message.guild.id);
    }
  });
  
  client.on('messageDelete', function(message) {
    if (!message.guild) return;
    
    logEvent(message.guild.id, 'messageDelete', {
      channel: message.channel ? message.channel.name : 'Unknown',
      author: message.author ? message.author.tag : 'Unknown',
      content: message.content || 'No content'
    });
    
    const activity = {
      guild_id: message.guild.id,
      type: 'messageDelete',
      user: message.author ? message.author.tag : 'Unknown',
      userId: message.author ? message.author.id : null,
      channel: message.channel ? message.channel.name : 'Unknown',
      channelId: message.channel ? message.channel.id : null,
      details: message.content || 'No content',
      timestamp: new Date().toISOString()
    };
    
    collections.userActivities.insertOne(activity).catch(err => {
      console.error("Error inserting message delete activity:", err);
    });
  });
  
  client.on('guildMemberAdd', function(member) {
    if (!member.guild) return;
    
    storeCurrentUsername(member.guild, member);
    updateAllUsersCollection(member, member.guild.id);
    
    logEvent(member.guild.id, 'guildMemberAdd', {
      user: member.user.tag,
      id: member.id,
      status: member.presence ? member.presence.status : 'offline'
    });
    
    const activity = {
      guild_id: member.guild.id,
      type: 'guildMemberAdd',
      user: member.user.tag,
      userId: member.id,
      details: {
        status: member.presence ? member.presence.status : 'offline',
        createdAt: member.user.createdAt.toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    collections.userActivities.insertOne(activity).catch(err => {
      console.error("Error inserting guild member add activity:", err);
    });
  });
  
  client.on('guildMemberRemove', function(member) {
    if (!member.guild) return;
    
    logEvent(member.guild.id, 'guildMemberRemove', {
      user: member.user.tag,
      id: member.id
    });
    
    const activity = {
      guild_id: member.guild.id,
      type: 'guildMemberRemove',
      user: member.user.tag,
      userId: member.id,
      timestamp: new Date().toISOString()
    };
    
    collections.userActivities.insertOne(activity).catch(err => {
      console.error("Error inserting guild member remove activity:", err);
    });
  });
  
  client.on('presenceUpdate', function(oldPresence, newPresence) {
    if (!newPresence.guild) return;
    
    const activities = newPresence.activities.map(function(a) {
      return a.type === 'CUSTOM' ? (a.state || a.name) : a.name;
    });
    
    logEvent(newPresence.guild.id, 'presenceUpdate', {
      user: newPresence.user.tag,
      id: newPresence.user.id,
      oldStatus: oldPresence ? oldPresence.status : 'offline',
      newStatus: newPresence.status,
      activities: activities
    });
    
    // Aktualisiere allUsers Collection bei Presence-Updates
    const member = newPresence.member;
    if (member) {
      updateAllUsersCollection(member, newPresence.guild.id);
    }
    
    if (oldPresence && oldPresence.status !== newPresence.status) {
      const activity = {
        guild_id: newPresence.guild.id,
        type: 'presenceUpdate',
        user: newPresence.user.tag,
        userId: newPresence.user.id,
        oldStatus: oldPresence ? oldPresence.status : 'offline',
        newStatus: newPresence.status,
        details: { activities: activities },
        timestamp: new Date().toISOString()
      };
      
      collections.userActivities.insertOne(activity).catch(err => {
        console.error("Error inserting presence update activity:", err);
      });
    }
  });
  
  // Voice-Aktivitäten tracken
  client.on('voiceStateUpdate', function(oldState, newState) {
    if (!newState.guild) return;
    
    const userId = newState.member.user.id;
    const userTag = newState.member.user.tag;
    const guildId = newState.guild.id;
    
    // Voice-Join Event
    if (!oldState.channelId && newState.channelId) {
      const channel = newState.channel.name;
      const channelId = newState.channelId;
      
      const activity = {
        guild_id: guildId,
        type: 'voiceJoin',
        user: userTag,
        userId: userId,
        channel: channel,
        channelId: channelId,
        details: {
          muted: newState.mute,
          deafened: newState.deaf,
          streaming: newState.streaming,
          selfMuted: newState.selfMute,
          selfDeafened: newState.selfDeaf
        },
        timestamp: new Date().toISOString()
      };
      
      collections.userActivities.insertOne(activity).catch(err => {
        console.error("Error inserting voice join activity:", err);
      });
      
      logEvent(guildId, 'voiceJoin', {
        user: userTag,
        id: userId,
        channel: channel
      });
    }
    // Voice-Leave Event
    else if (oldState.channelId && !newState.channelId) {
      const channel = oldState.channel.name;
      const channelId = oldState.channelId;
      
      const activity = {
        guild_id: guildId,
        type: 'voiceLeave',
        user: userTag,
        userId: userId,
        channel: channel,
        channelId: channelId,
        timestamp: new Date().toISOString()
      };
      
      collections.userActivities.insertOne(activity).catch(err => {
        console.error("Error inserting voice leave activity:", err);
      });
      
      logEvent(guildId, 'voiceLeave', {
        user: userTag,
        id: userId,
        channel: channel
      });
    }
    // Channel-Wechsel
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const oldChannel = oldState.channel.name;
      const newChannel = newState.channel.name;
      
      const activity = {
        guild_id: guildId,
        type: 'voiceMove',
        user: userTag,
        userId: userId,
        channel: newChannel,
        channelId: newState.channelId,
        oldChannel: oldChannel,
        oldChannelId: oldState.channelId,
        timestamp: new Date().toISOString()
      };
      
      collections.userActivities.insertOne(activity).catch(err => {
        console.error("Error inserting voice move activity:", err);
      });
      
      logEvent(guildId, 'voiceMove', {
        user: userTag,
        id: userId,
        oldChannel: oldChannel,
        newChannel: newChannel
      });
    }
    // Status-Änderungen im Voice-Channel
    else if (oldState.channelId && newState.channelId && 
             (oldState.mute !== newState.mute || 
              oldState.deaf !== newState.deaf || 
              oldState.streaming !== newState.streaming || 
              oldState.selfMute !== newState.selfMute || 
              oldState.selfDeaf !== newState.selfDeaf)) {
      
      const channel = newState.channel.name;
      
      const activity = {
        guild_id: guildId,
        type: 'voiceState',
        user: userTag,
        userId: userId,
        channel: channel,
        channelId: newState.channelId,
        details: {
          muted: newState.mute,
          deafened: newState.deaf,
          streaming: newState.streaming,
          selfMuted: newState.selfMute,
          selfDeafened: newState.selfDeaf,
          oldMuted: oldState.mute,
          oldDeafened: oldState.deaf,
          oldStreaming: oldState.streaming,
          oldSelfMuted: oldState.selfMute,
          oldSelfDeafened: oldState.selfDeaf
        },
        timestamp: new Date().toISOString()
      };
      
      collections.userActivities.insertOne(activity).catch(err => {
        console.error("Error inserting voice state activity:", err);
      });
      
      logEvent(guildId, 'voiceState', {
        user: userTag,
        id: userId,
        channel: channel,
        muted: newState.mute,
        deafened: newState.deaf,
        streaming: newState.streaming
      });
    }
  });
  
  // Rollenaktivitäten tracken
  client.on('guildMemberUpdate', function(oldMember, newMember) {
    if (!newMember.guild) return;
    
    const userId = newMember.user.id;
    const userTag = newMember.user.tag;
    const guildId = newMember.guild.id;
    
    // Prüfen auf Rollenänderungen
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    
    // Hinzugefügte Rollen
    const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
    if (addedRoles.size > 0) {
      addedRoles.forEach(role => {
        const activity = {
          guild_id: guildId,
          type: 'roleAdd',
          user: userTag,
          userId: userId,
          role: role.name,
          roleId: role.id,
          timestamp: new Date().toISOString()
        };
        
        collections.userActivities.insertOne(activity).catch(err => {
          console.error("Error inserting role add activity:", err);
        });
        
        logEvent(guildId, 'roleAdd', {
          user: userTag,
          id: userId,
          role: role.name,
          roleId: role.id
        });
      });
    }
    
    // Entfernte Rollen
    const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
    if (removedRoles.size > 0) {
      removedRoles.forEach(role => {
        const activity = {
          guild_id: guildId,
          type: 'roleRemove',
          user: userTag,
          userId: userId,
          role: role.name,
          roleId: role.id,
          timestamp: new Date().toISOString()
        };
        
        collections.userActivities.insertOne(activity).catch(err => {
          console.error("Error inserting role remove activity:", err);
        });
        
        logEvent(guildId, 'roleRemove', {
          user: userTag,
          id: userId,
          role: role.name,
          roleId: role.id
        });
      });
    }
    
    // Nickname-Änderungen
    if (oldMember.nickname !== newMember.nickname) {
      const activity = {
        guild_id: guildId,
        type: 'nicknameChange',
        user: userTag,
        userId: userId,
        oldNickname: oldMember.nickname,
        newNickname: newMember.nickname,
        timestamp: new Date().toISOString()
      };
      
      collections.userActivities.insertOne(activity).catch(err => {
        console.error("Error inserting nickname change activity:", err);
      });
    }

    // Prüfe auf Namensänderungen für jedes Member-Update
    checkUsernameChange(newMember.guild, newMember);
  });

  // Event für Benutzernamensänderungen
  client.on('userUpdate', function(oldUser, newUser) {
    if (oldUser.username !== newUser.username || oldUser.discriminator !== newUser.discriminator) {
      client.guilds.cache.forEach(function(guild) {
        const member = guild.members.cache.get(newUser.id);
        if (member) {
          logEvent(guild.id, 'usernameChange', {
            id: newUser.id,
            oldUsername: oldUser.username,
            newUsername: newUser.username,
            oldDiscriminator: oldUser.discriminator,
            newDiscriminator: newUser.discriminator,
            oldNickname: null,
            newNickname: null
          });
          
          const activity = {
            guild_id: guild.id,
            type: 'usernameChange',
            user: newUser.tag,
            userId: newUser.id,
            oldUsername: oldUser.username,
            newUsername: newUser.username,
            oldDiscriminator: oldUser.discriminator,
            newDiscriminator: newUser.discriminator,
            timestamp: new Date().toISOString()
          };
          
          collections.userActivities.insertOne(activity).catch(err => {
            console.error("Error inserting username change activity:", err);
          });

          // Aktualisiere allUsers Collection
          updateAllUsersCollection(member, guild.id);
        }
      });
    }
  });
}

module.exports = { setupDiscordEvents };