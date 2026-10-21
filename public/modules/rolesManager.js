// addons/dashboard/public/modules/rolesManager.js

const RolesManager = {
  handleRolesUpdate(roles) {
    const list = document.getElementById('roles-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (!roles || roles.length === 0) {
      list.innerHTML = '<p>Keine Rollen gefunden.</p>';
      return;
    }
    
    // Sortiere Rollen nach Position (höchste zuerst)
    const sortedRoles = roles.sort((a, b) => (b.position || 0) - (a.position || 0));
    
    sortedRoles.forEach(role => {
      const card = this.createRoleCard(role);
      list.appendChild(card);
    });
  },

  createRoleCard(role) {
    const card = document.createElement('div');
    card.className = 'role-card';
    
    // Header mit Rolle und Farbe
    const header = this.createRoleHeader(role);
    card.appendChild(header);
    
    // Basis-Informationen
    const info = this.createRoleInfo(role);
    card.appendChild(info);
    
    // Berechtigungen
    const permissions = this.createPermissionsList(role.permissions);
    card.appendChild(permissions);
    
    return card;
  },

  createRoleHeader(role) {
    const header = document.createElement('div');
    header.className = 'role-header';
    
    const nameSpan = document.createElement('h4');
    nameSpan.textContent = role.name;
    nameSpan.style.margin = '0';
    
    // Farbe anzeigen wenn vorhanden
    if (role.color) {
      const colorIndicator = document.createElement('span');
      colorIndicator.className = 'role-color-indicator';
      colorIndicator.style.backgroundColor = `#${role.color.toString(16).padStart(6, '0')}`;
      colorIndicator.style.width = '20px';
      colorIndicator.style.height = '20px';
      colorIndicator.style.borderRadius = '50%';
      colorIndicator.style.display = 'inline-block';
      colorIndicator.style.marginLeft = '10px';
      colorIndicator.style.border = '1px solid #ccc';
      
      header.appendChild(nameSpan);
      header.appendChild(colorIndicator);
    } else {
      header.appendChild(nameSpan);
    }
    
    return header;
  },

  createRoleInfo(role) {
    const info = document.createElement('div');
    info.className = 'role-info';
    
    const idP = document.createElement('p');
    idP.innerHTML = `<strong>ID:</strong> <code>${role.id}</code>`;
    info.appendChild(idP);
    
    if (role.position !== undefined) {
      const positionP = document.createElement('p');
      positionP.innerHTML = `<strong>Position:</strong> ${role.position}`;
      info.appendChild(positionP);
    }
    
    if (role.memberCount !== undefined) {
      const membersP = document.createElement('p');
      membersP.innerHTML = `<strong>Mitglieder:</strong> ${role.memberCount}`;
      info.appendChild(membersP);
    }
    
    if (role.mentionable !== undefined) {
      const mentionableP = document.createElement('p');
      mentionableP.innerHTML = `<strong>Erwähnbar:</strong> ${role.mentionable ? 'Ja' : 'Nein'}`;
      info.appendChild(mentionableP);
    }
    
    if (role.hoist !== undefined) {
      const hoistP = document.createElement('p');
      hoistP.innerHTML = `<strong>Separat anzeigen:</strong> ${role.hoist ? 'Ja' : 'Nein'}`;
      info.appendChild(hoistP);
    }
    
    return info;
  },

  createPermissionsList(permissions) {
    const container = document.createElement('div');
    container.className = 'role-permissions';
    
    const title = document.createElement('h5');
    title.textContent = 'Berechtigungen:';
    title.style.marginBottom = '10px';
    container.appendChild(title);
    
    if (!permissions || permissions.length === 0) {
      const noPerms = document.createElement('p');
      noPerms.textContent = 'Keine besonderen Berechtigungen';
      noPerms.style.fontStyle = 'italic';
      noPerms.style.color = '#666';
      container.appendChild(noPerms);
      return container;
    }
    
    // Gruppiere Berechtigungen nach Kategorien
    const categorizedPerms = this.categorizePermissions(permissions);
    
    Object.entries(categorizedPerms).forEach(([category, perms]) => {
      if (perms.length === 0) return;
      
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'permission-category';
      
      const categoryTitle = document.createElement('h6');
      categoryTitle.textContent = category;
      categoryTitle.style.marginBottom = '5px';
      categoryTitle.style.color = '#7B5FDA';
      categoryDiv.appendChild(categoryTitle);
      
      const permsList = document.createElement('ul');
      permsList.style.marginLeft = '15px';
      permsList.style.marginBottom = '10px';
      
      perms.forEach(perm => {
        const li = document.createElement('li');
        li.textContent = this.translatePermission(perm);
        li.style.fontSize = '0.9em';
        permsList.appendChild(li);
      });
      
      categoryDiv.appendChild(permsList);
      container.appendChild(categoryDiv);
    });
    
    return container;
  },

  categorizePermissions(permissions) {
    const categories = {
      'Allgemein': [],
      'Text-Kanäle': [],
      'Voice-Kanäle': [],
      'Mitglieder': [],
      'Administrator': []
    };
    
    permissions.forEach(perm => {
      if (perm.includes('ADMINISTRATOR')) {
        categories['Administrator'].push(perm);
      } else if (perm.includes('VOICE') || perm.includes('SPEAK') || perm.includes('STREAM')) {
        categories['Voice-Kanäle'].push(perm);
      } else if (perm.includes('MESSAGE') || perm.includes('EMBED') || perm.includes('ATTACH') || perm.includes('EMOJI')) {
        categories['Text-Kanäle'].push(perm);
      } else if (perm.includes('MEMBER') || perm.includes('KICK') || perm.includes('BAN') || perm.includes('ROLE')) {
        categories['Mitglieder'].push(perm);
      } else {
        categories['Allgemein'].push(perm);
      }
    });
    
    return categories;
  },

  translatePermission(permission) {
    const translations = {
      'CREATE_INSTANT_INVITE': 'Einladungen erstellen',
      'KICK_MEMBERS': 'Mitglieder kicken',
      'BAN_MEMBERS': 'Mitglieder bannen',
      'ADMINISTRATOR': 'Administrator',
      'MANAGE_CHANNELS': 'Kanäle verwalten',
      'MANAGE_GUILD': 'Server verwalten',
      'ADD_REACTIONS': 'Reaktionen hinzufügen',
      'VIEW_AUDIT_LOG': 'Audit-Log einsehen',
      'PRIORITY_SPEAKER': 'Prioritätssprecher',
      'STREAM': 'Video übertragen',
      'VIEW_CHANNEL': 'Kanäle anzeigen',
      'SEND_MESSAGES': 'Nachrichten senden',
      'SEND_TTS_MESSAGES': 'Text-zu-Sprache verwenden',
      'MANAGE_MESSAGES': 'Nachrichten verwalten',
      'EMBED_LINKS': 'Links einbetten',
      'ATTACH_FILES': 'Dateien anhängen',
      'READ_MESSAGE_HISTORY': 'Nachrichtenverlauf lesen',
      'MENTION_EVERYONE': '@everyone verwenden',
      'USE_EXTERNAL_EMOJIS': 'Externe Emojis verwenden',
      'VIEW_GUILD_INSIGHTS': 'Server-Insights anzeigen',
      'CONNECT': 'Verbinden',
      'SPEAK': 'Sprechen',
      'MUTE_MEMBERS': 'Mitglieder stummschalten',
      'DEAFEN_MEMBERS': 'Mitgliedern das Hören entziehen',
      'MOVE_MEMBERS': 'Mitglieder verschieben',
      'USE_VAD': 'Sprachaktivierung verwenden',
      'CHANGE_NICKNAME': 'Nickname ändern',
      'MANAGE_NICKNAMES': 'Nicknames verwalten',
      'MANAGE_ROLES': 'Rollen verwalten',
      'MANAGE_WEBHOOKS': 'Webhooks verwalten',
      'MANAGE_EMOJIS': 'Emojis verwalten'
    };
    
    return translations[permission] || permission.replace(/_/g, ' ');
  }
};