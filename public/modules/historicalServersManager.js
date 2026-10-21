// addons/dashboard/public/modules/historicalServersManager.js

const HistoricalServersManager = {
  loadHistoricalServers() {
    const container = document.getElementById('old-servers-list');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Lade historische Server...</div>';
    
    fetch('/historical-servers')
      .then(res => res.json())
      .then(servers => {
        const inactiveServers = servers.filter(server => server.left);
        this.renderOldServers(inactiveServers);
      })
      .catch(err => {
        console.error("Error loading historical servers:", err);
        container.innerHTML = '<p>Fehler beim Laden der historischen Server.</p>';
      });
  },

  renderOldServers(servers) {
    const container = document.getElementById('old-servers-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (servers.length === 0) {
      const noServers = document.createElement('p');
      noServers.textContent = 'Keine alten Server gefunden.';
      container.appendChild(noServers);
      return;
    }
    
    const table = this.createOldServersTable(servers);
    container.appendChild(table);
  },

  createOldServersTable(servers) {
    const table = document.createElement('table');
    table.className = 'old-servers-table';
    
    // Header erstellen
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Name', 'Server ID', 'Verlassen am', 'Letzte Mitgliederzahl', 'Region'];
    
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Body erstellen
    const tbody = document.createElement('tbody');
    servers.forEach(server => {
      const row = this.createServerRow(server);
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    return table;
  },

  createServerRow(server) {
    const row = document.createElement('tr');
    
    // Server Name
    const nameCell = document.createElement('td');
    nameCell.textContent = server.name;
    nameCell.className = 'server-name';
    row.appendChild(nameCell);
    
    // Server ID
    const idCell = document.createElement('td');
    idCell.textContent = server.id;
    idCell.className = 'server-id';
    idCell.style.fontFamily = 'monospace';
    row.appendChild(idCell);
    
    // Verlassen am
    const leftAtCell = document.createElement('td');
    if (server.leftAt) {
      leftAtCell.textContent = new Date(server.leftAt).toLocaleString();
    } else {
      leftAtCell.textContent = 'Unbekannt';
    }
    leftAtCell.className = 'left-at';
    row.appendChild(leftAtCell);
    
    // Mitgliederzahl
    const memberCountCell = document.createElement('td');
    memberCountCell.textContent = server.memberCount || 'Unbekannt';
    memberCountCell.className = 'member-count';
    row.appendChild(memberCountCell);
    
    // Region
    const regionCell = document.createElement('td');
    regionCell.textContent = server.region || 'Unbekannt';
    regionCell.className = 'region';
    row.appendChild(regionCell);
    
    return row;
  },

  formatServerData(server) {
    return {
      ...server,
      formattedLeftAt: server.leftAt ? new Date(server.leftAt).toLocaleString() : 'Unbekannt',
      formattedJoinedAt: server.joinedAt ? new Date(server.joinedAt).toLocaleString() : 'Unbekannt',
      memberCount: server.memberCount || 0,
      region: server.region || 'Unbekannt'
    };
  },

  exportHistoricalServers() {
    fetch('/historical-servers')
      .then(res => res.json())
      .then(servers => {
        const inactiveServers = servers.filter(server => server.left);
        this.downloadAsCSV(inactiveServers);
      })
      .catch(err => {
        console.error("Error exporting historical servers:", err);
        alert('Fehler beim Exportieren der historischen Server');
      });
  },

  downloadAsCSV(servers) {
    const headers = ['Name', 'Server ID', 'Beigetreten', 'Verlassen', 'Mitgliederzahl', 'Region', 'Owner ID'];
    let csv = headers.join(',') + '\n';
    
    servers.forEach(server => {
      const row = [
        `"${server.name.replace(/"/g, '""')}"`,
        server.id,
        server.joinedAt ? new Date(server.joinedAt).toISOString() : '',
        server.leftAt ? new Date(server.leftAt).toISOString() : '',
        server.memberCount || 0,
        `"${(server.region || '').replace(/"/g, '""')}"`,
        server.ownerId || ''
      ];
      csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historical_servers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};