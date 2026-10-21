// addons/dashboard/public/modules/configManager.js

const ConfigManager = {
  loadConfigEditor() {
    const container = document.getElementById('config-editor');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Lade Konfiguration...</div>';
    
    fetch('/get-config')
      .then(res => res.json())
      .then(config => {
        this.renderConfigEditor(container, config);
      })
      .catch(err => {
        console.error("Error loading configuration:", err);
        container.innerHTML = '<p class="error">Fehler beim Laden der Konfiguration.</p>';
      });
  },

  renderConfigEditor(container, config) {
    const configEditor = document.createElement('div');
    configEditor.className = 'config-editor-container';
    
    const jsonEditor = document.createElement('textarea');
    jsonEditor.id = 'config-json-editor';
    jsonEditor.className = 'config-json-editor';
    jsonEditor.rows = 15;
    jsonEditor.value = JSON.stringify(config, null, 2);
    
    const saveBtn = document.createElement('button');
    saveBtn.id = 'save-config';
    saveBtn.className = 'submit-button';
    saveBtn.textContent = 'Konfiguration speichern';
    
    const statusMsg = document.createElement('div');
    statusMsg.id = 'config-status-message';
    statusMsg.className = 'config-status';
    
    configEditor.appendChild(jsonEditor);
    configEditor.appendChild(saveBtn);
    configEditor.appendChild(statusMsg);
    
    container.innerHTML = '';
    container.appendChild(configEditor);
    
    // Event-Listener für Save-Button
    saveBtn.addEventListener('click', () => this.saveConfiguration());
  },

  saveConfiguration() {
    const jsonEditor = document.getElementById('config-json-editor');
    const statusMsg = document.getElementById('config-status-message');
    
    if (!jsonEditor || !statusMsg) return;
    
    let configData;
    try {
      configData = JSON.parse(jsonEditor.value);
      this.updateStatusMessage(statusMsg, "Speichere Konfiguration...", "config-status status-pending");
    } catch (err) {
      this.updateStatusMessage(statusMsg, "Ungültiges JSON Format: " + err.message, "config-status status-error");
      return;
    }
    
    fetch('/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.updateStatusMessage(statusMsg, "Konfiguration erfolgreich gespeichert!", "config-status status-success");
        } else {
          this.updateStatusMessage(statusMsg, "Fehler beim Speichern: " + (data.error || "Unbekannter Fehler"), "config-status status-error");
        }
      })
      .catch(err => {
        console.error("Config save error:", err);
        this.updateStatusMessage(statusMsg, "Fehler beim Speichern: " + err.message, "config-status status-error");
      });
  },

  updateStatusMessage(element, text, className) {
    if (!element) return;
    element.textContent = text;
    element.className = className;
  },

  validateConfigData(configData) {
    // Grundlegende Validierung der Konfigurationsdaten
    if (!configData.port || typeof configData.port !== 'number') {
      throw new Error('Port muss eine Zahl sein');
    }
    
    if (!configData.adminRoleId || typeof configData.adminRoleId !== 'string') {
      throw new Error('adminRoleId ist erforderlich');
    }
    
    if (configData.port < 1 || configData.port > 65535) {
      throw new Error('Port muss zwischen 1 und 65535 liegen');
    }
    
    return true;
  }
};