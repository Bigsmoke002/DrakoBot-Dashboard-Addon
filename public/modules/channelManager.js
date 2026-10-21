// addons/dashboard/public/modules/channelManager.js

const ChannelManager = {
  loadChannels(selectedServerId) {
    if (!selectedServerId) return;
    
    const container = document.getElementById('channels-list');
    container.innerHTML = '<div class="loading">Lade Kanäle...</div>';
    
    fetch(`/channels/${selectedServerId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(categories => {
        container.innerHTML = '';
        
        if (!categories || categories.length === 0) {
          container.innerHTML = '<p>Keine Kanäle gefunden.</p>';
          return;
        }
        
        categories.forEach(category => {
          const categoryDiv = this.createCategoryElement(category);
          container.appendChild(categoryDiv);
        });
      })
      .catch(err => {
        console.error("Error loading channels:", err);
        container.innerHTML = `<div class="error">Fehler beim Laden der Kanäle: ${err.message}</div>`;
      });
  },

  createCategoryElement(category) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'channel-category';
    
    const categoryHeader = document.createElement('h3');
    categoryHeader.className = 'category-header';
    categoryHeader.textContent = category.name;
    categoryDiv.appendChild(categoryHeader);
    
    if (category.channels && category.channels.length > 0) {
      category.channels.forEach(ch => {
        const channelDiv = this.createChannelElement(ch);
        categoryDiv.appendChild(channelDiv);
      });
    } else {
      const noChannels = document.createElement('p');
      noChannels.textContent = 'Keine Kanäle in dieser Kategorie';
      noChannels.style.fontStyle = 'italic';
      noChannels.style.color = '#666';
      categoryDiv.appendChild(noChannels);
    }
    
    return categoryDiv;
  },

  createChannelElement(ch) {
    const channelDiv = document.createElement('div');
    channelDiv.className = 'channel-item';
    
    const channelHeader = document.createElement('div');
    channelHeader.className = 'channel-header';
    
    const typeIcon = document.createElement('span');
    typeIcon.className = 'channel-type-icon';
    
    // Channel-Typ-Icons und Styling
    if (ch.type === 0 || ch.type === 5) { // TEXT/NEWS
      typeIcon.textContent = '#';
      typeIcon.className += ' text-channel';
    } else if (ch.type === 2) { // VOICE
      typeIcon.textContent = '🔊';
      typeIcon.className += ' voice-channel';
    } else if (ch.type === 4) { // CATEGORY
      typeIcon.textContent = '📁';
      typeIcon.className += ' category-channel';
    } else {
      typeIcon.textContent = '📄';
      typeIcon.className += ' other-channel';
    }
    
    channelHeader.appendChild(typeIcon);
    
    const channelInfo = document.createElement('div');
    channelInfo.className = 'channel-info';
    
    const channelName = document.createElement('span');
    channelName.className = 'channel-name';
    channelName.textContent = ch.name;
    channelInfo.appendChild(channelName);
    
    const channelId = document.createElement('span');
    channelId.className = 'channel-id';
    channelId.textContent = `ID: ${ch.id}`;
    channelInfo.appendChild(channelId);
    
    channelHeader.appendChild(channelInfo);
    channelDiv.appendChild(channelHeader);
    
    // Channel-spezifische Details
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'channel-details';
    
    // Text-Channel spezifische Elemente
    if ((ch.type === 0 || ch.type === 5)) {
      this.addTextChannelDetails(detailsDiv, ch);
    }
    
    // Voice-Channel spezifische Elemente
    if (ch.type === 2) {
      this.addVoiceChannelDetails(detailsDiv, ch);
    }
    
    if (detailsDiv.children.length > 0) {
      channelDiv.appendChild(detailsDiv);
    }
    
    return channelDiv;
  },

  addTextChannelDetails(container, channel) {
    // Topic anzeigen
    if (channel.topic) {
      const topicDiv = document.createElement('div');
      topicDiv.className = 'channel-topic';
      topicDiv.innerHTML = `<strong>Thema:</strong> ${this.escapeHtml(channel.topic)}`;
      container.appendChild(topicDiv);
    }
    
    // Letzte Nachricht
    if (channel.lastMessage) {
      const lastMsg = document.createElement('div');
      lastMsg.className = 'channel-last-message';
      lastMsg.innerHTML = `
        <strong>Letzte Nachricht:</strong><br>
        <span class="message-author">${this.escapeHtml(channel.lastMessage.author)}</span>: 
        ${this.escapeHtml(channel.lastMessage.content.substring(0, 100))}${channel.lastMessage.content.length > 100 ? '...' : ''}
        <span class="message-time">(${window.dashboardGlobals.formatTimestamp(channel.lastMessage.timestamp)})</span>
      `;
      container.appendChild(lastMsg);
    }
    
    // NSFW und Slow Mode
    const settingsDiv = document.createElement('div');
    settingsDiv.className = 'channel-settings';
    
    if (channel.nsfw) {
      const nsfwSpan = document.createElement('span');
      nsfwSpan.className = 'nsfw-badge';
      nsfwSpan.textContent = 'NSFW';
      settingsDiv.appendChild(nsfwSpan);
    }
    
    if (channel.rateLimitPerUser && channel.rateLimitPerUser > 0) {
      const slowModeSpan = document.createElement('span');
      slowModeSpan.className = 'slow-mode-badge';
      slowModeSpan.textContent = `Slow Mode: ${channel.rateLimitPerUser}s`;
      settingsDiv.appendChild(slowModeSpan);
    }
    
    if (settingsDiv.children.length > 0) {
      container.appendChild(settingsDiv);
    }
  },

  addVoiceChannelDetails(container, channel) {
    // Voice-Channel Einstellungen
    const voiceSettingsDiv = document.createElement('div');
    voiceSettingsDiv.className = 'voice-settings';
    
    if (channel.bitrate) {
      const bitrateSpan = document.createElement('span');
      bitrateSpan.className = 'bitrate-info';
      bitrateSpan.textContent = `Bitrate: ${channel.bitrate / 1000}kbps`;
      voiceSettingsDiv.appendChild(bitrateSpan);
    }
    
    if (channel.userLimit && channel.userLimit > 0) {
      const limitSpan = document.createElement('span');
      limitSpan.className = 'user-limit-info';
      limitSpan.textContent = `Limit: ${channel.userLimit} Benutzer`;
      voiceSettingsDiv.appendChild(limitSpan);
    }
    
    if (voiceSettingsDiv.children.length > 0) {
      container.appendChild(voiceSettingsDiv);
    }
    
    // Aktuelle Mitglieder
    if (channel.members) {
      const membersDiv = this.createVoiceMembersElement(channel.members);
      container.appendChild(membersDiv);
    }
  },

  createVoiceMembersElement(members) {
    const membersDiv = document.createElement('div');
    membersDiv.className = 'channel-members';
    
    const membersTitle = document.createElement('div');
    membersTitle.className = 'members-title';
    membersTitle.textContent = `Mitglieder (${members.length}):`;
    membersDiv.appendChild(membersTitle);
    
    if (members.length > 0) {
      const membersList = document.createElement('div');
      membersList.className = 'members-list';
      
      members.forEach(member => {
        const memberEl = this.createVoiceMemberElement(member);
        membersList.appendChild(memberEl);
      });
      
      membersDiv.appendChild(membersList);
    } else {
      const noMembers = document.createElement('div');
      noMembers.className = 'no-members';
      noMembers.textContent = 'Keine aktiven Benutzer';
      membersDiv.appendChild(noMembers);
    }
    
    return membersDiv;
  },

  createVoiceMemberElement(member) {
    const memberEl = document.createElement('div');
    memberEl.className = 'voice-member';
    
    const memberAvatar = document.createElement('img');
    memberAvatar.className = 'member-avatar';
    memberAvatar.src = member.avatar;
    memberAvatar.alt = member.tag;
    memberAvatar.onerror = () => {
      memberAvatar.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
    };
    memberEl.appendChild(memberAvatar);
    
    const memberInfo = document.createElement('div');
    memberInfo.className = 'member-info';
    
    const memberName = document.createElement('span');
    memberName.className = 'member-name';
    memberName.textContent = member.tag;
    memberInfo.appendChild(memberName);
    
    // Voice-Status anzeigen
    const voiceStatus = [];
    if (member.muted) voiceStatus.push('🔇');
    if (member.deafened) voiceStatus.push('🔕');
    if (member.streaming) voiceStatus.push('📺');
    
    if (voiceStatus.length > 0) {
      const statusSpan = document.createElement('span');
      statusSpan.className = 'voice-status';
      statusSpan.textContent = voiceStatus.join(' ');
      memberInfo.appendChild(statusSpan);
    }
    
    memberEl.appendChild(memberInfo);
    return memberEl;
  },

  escapeHtml(text) {
    if (typeof text !== 'string') return String(text);
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Refresh-Funktion für manuelle Aktualisierung
  refreshChannels() {
    const selectedServerId = window.dashboardGlobals.selectedServerId();
    if (selectedServerId) {
      this.loadChannels(selectedServerId);
    }
  }
};