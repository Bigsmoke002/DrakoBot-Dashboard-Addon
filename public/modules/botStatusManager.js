// addons/dashboard/public/modules/botStatusManager.js

const BotStatusManager = {
  loadBotStatus() {
    const container = document.getElementById('bot-status');
    if (!container) return;
    const panel = container.querySelector('.panel');
    if (!panel) return;
    
    panel.innerHTML = this.createBotStatusForm();
    this.setupBotStatusEventListeners();
  },

  createBotStatusForm() {
    return `
      <form id="bot-status-form">
        <div class="form-group">
          <label for="bot-status-select">Status:</label>
          <select id="bot-status-select">
            <option value="online">Online</option>
            <option value="idle">Idle</option>
            <option value="dnd">DND</option>
            <option value="invisible">Invisible</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="bot-activity-input">Aktivität (optional):</label>
          <input type="text" id="bot-activity-input" placeholder="z.B. Musik hören..." />
        </div>
        
        <button type="submit" class="submit-button">Status ändern</button>
      </form>
      <div id="bot-status-message"></div>
    `;
  },

  setupBotStatusEventListeners() {
    const form = document.getElementById('bot-status-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleBotStatusSubmit();
    });
  },

  handleBotStatusSubmit() {
    const status = document.getElementById('bot-status-select').value;
    const activity = document.getElementById('bot-activity-input').value;
    const statusMsg = document.getElementById('bot-status-message');
    
    this.updateStatusMessage(statusMsg, "Ändere Bot-Status...", "status-pending");
    
    fetch(`/bot-status?status=${encodeURIComponent(status)}&activity=${encodeURIComponent(activity)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success || data.status) {
          this.updateStatusMessage(statusMsg, "Bot Status erfolgreich geändert.", "status-success");
        } else {
          this.updateStatusMessage(statusMsg, "Fehler beim Ändern des Bot Status.", "status-error");
        }
      })
      .catch(err => {
        console.error("Bot status change error:", err);
        this.updateStatusMessage(statusMsg, "Fehler beim Ändern des Bot Status: " + err.message, "status-error");
      });
  },

  updateStatusMessage(element, text, className) {
    if (!element) return;
    element.textContent = text;
    element.className = className;
  }
};