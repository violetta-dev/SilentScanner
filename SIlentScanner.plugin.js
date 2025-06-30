/**
 * @name SilentScanner
 * @version 2.3.0
 * @description Notifica ghost ping (toast arancione), nomine (toast azzurro), DM (toast verde). UI semplice, robusto, fail-safe. Developed by Vix.
 * @author Vix (Viola/Nicola, idea by te)
 * @updateUrl https://TUA-URL-PUBBLICA/SilentScanner.plugin.js
 */

const SilentScannerConfigKey = "SilentScanner";
const DEFAULT_SETTINGS = {
  monitoredNames: [],
  enableGhostPing: true,
  enableNameScan: true,
  dmAlerts: true,
  channelWhitelist: [],
  channelBlacklist: [],
  guildWhitelist: [],
  guildBlacklist: [],
  ignoreBots: true,
  ignoreRoleIds: [],
};

const COLOR_PALETTE = {
  azzurro: "#3fa3ff",
  arancione: "#ffa048",
  rosso: "#e94242",
  verde: "#25d366",
  viola: "#a56eff",
  grigio: "#5c6773",
};

function getTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function showErrorAndDisable(reason) {
  BdApi.showToast(
    "SilentScanner: plugin non compatibile con questa nuova versione di Discord – <a href='https://t.me/vixhelix' target='_blank' style='color:#fff;text-decoration:underline;'>contatta Vix qui per update</a>",
    {type: "error", timeout: 15000}
  );
  throw new Error("SilentScanner STOPPED: " + reason);
}

function safeFindModule(propsArr, altCheck) {
  let mod = null;
  try {
    mod = BdApi.findModuleByProps(...propsArr);
    if (!mod && altCheck) mod = BdApi.findModule(altCheck);
    if (!mod) showErrorAndDisable("Modulo Discord assente: " + propsArr.join(", "));
  } catch (e) {
    showErrorAndDisable("Errore cercando: " + propsArr.join(", "));
  }
  return mod;
}

module.exports = (() => {
  let messageCache = new Map();
  let currentUser = null;
  let settings = BdApi.loadData(SilentScannerConfigKey, "settings") || DEFAULT_SETTINGS;

  function saveSettings() {
    BdApi.saveData(SilentScannerConfigKey, "settings", settings);
  }

  function showCustomToast(message, color = "#3fa3ff") {
    if (document.querySelectorAll(".silent-toast-vix").length > 4) {
      document.querySelector(".silent-toast-vix")?.remove();
    }
    const toast = document.createElement("div");
    toast.className = "silent-toast-vix";
    toast.style = `
      position: fixed;
      bottom: 32px;
      right: 32px;
      z-index: 9999;
      padding: 18px 28px;
      font-size: 16px;
      font-weight: 500;
      color: #fff;
      background: ${color};
      border-radius: 18px;
      box-shadow: 0 4px 18px 0 rgba(0,0,0,0.28);
      max-width: 410px;
      min-width: 160px;
      line-height: 1.5;
      user-select: text;
      opacity: 0.98;
      border: 2px solid rgba(0,0,0,0.14);
      display: flex;
      align-items: center;
      transition: opacity 0.15s;
      pointer-events: all;
    `;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; }, 14800);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 15000);
  }

  function timeNow() {
    return new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  }

  function getChannelName(id) {
    const ChannelStore = safeFindModule(["getChannel", "hasChannel"], m => m.getAllChannels);
    const ch = ChannelStore.getChannel(id);
    return ch ? (ch.type === 1 ? "[DM]" : `#${ch.name}`) : "Canale sconosciuto";
  }
  function getGuildName(channelId) {
    const ChannelStore = safeFindModule(["getChannel", "hasChannel"], m => m.getAllChannels);
    const GuildStore = safeFindModule(["getGuild", "getGuilds"]);
    const ch = ChannelStore.getChannel(channelId);
    if (!ch) return "Server sconosciuto";
    if (ch.type === 1) return "[DM]";
    if (!ch.guild_id) return "Server sconosciuto";
    const guild = GuildStore.getGuild(ch.guild_id);
    return guild ? guild.name : "Server sconosciuto";
  }

  function containsLinkOrAttachment(msg) {
    if (!msg) return false;
    const urlRegex = /https?:\/\/\S+/i;
    if (urlRegex.test(msg.content || "")) return true;
    if (Array.isArray(msg.attachments) && msg.attachments.length > 0) return true;
    return false;
  }

  function hasRoleToIgnore(user) {
    if (!user || !Array.isArray(settings.ignoreRoleIds) || !user.roles) return false;
    return user.roles.some(rid => settings.ignoreRoleIds.includes(rid));
  }

  function isWhitelisted(channelId, guildId) {
    if (settings.channelWhitelist.length > 0 && !settings.channelWhitelist.includes(channelId)) return false;
    if (settings.guildWhitelist.length > 0 && !settings.guildWhitelist.includes(guildId)) return false;
    if (settings.channelBlacklist.includes(channelId)) return false;
    if (settings.guildBlacklist.includes(guildId)) return false;
    return true;
  }

  function getFieldBg() {
    return getTheme() === "dark" ? "rgba(35,36,40,0.97)" : "#fff";
  }
  function getFieldText() {
    return getTheme() === "dark" ? "#fff" : "#232428";
  }

  return class SilentScanner {
    getName() { return "SilentScanner"; }
    getDescription() { return "Notifica ghost ping (arancione), nomine (azzurro), DM (verde). Developed by Vix."; }
    getVersion() { return "2.3.0"; }
    getAuthor() { return "Vix"; }

    start() {
      const Dispatcher = safeFindModule(["dispatch", "subscribe"]);
      const UserStore = safeFindModule(["getCurrentUser"]);
      const ChannelStore = safeFindModule(["getChannel", "hasChannel"], m => m.getAllChannels);

      currentUser = UserStore?.getCurrentUser();
      if (!currentUser?.id) showErrorAndDisable("UserStore vuoto");

      this.createHandler = (event) => {
        const msg = event.message;
        if (!msg) return;
        if (!msg.author) return;
        if (settings.ignoreBots && msg.author.bot) return;
        if (hasRoleToIgnore(msg.author)) return;

        let channel = ChannelStore.getChannel(msg.channel_id);
        let guildId = channel?.guild_id ?? null;

        if (!isWhitelisted(msg.channel_id, guildId)) return;

        // Ghost Ping
        if (settings.enableGhostPing) {
          const mentions = msg.mentions ?? [];
          const hasMention = mentions.some(u => u?.id === currentUser.id);
          if (hasMention) {
            messageCache.set(msg.id, {
              authorName: msg.author?.username,
              channelId: msg.channel_id,
              timestamp: timeNow(),
              isDM: (channel && channel.type === 1)
            });
            setTimeout(() => messageCache.delete(msg.id), 10 * 60 * 1000);
          }
        }

        // Nome monitorato (nomina)
        if (settings.enableNameScan && Array.isArray(settings.monitoredNames) && settings.monitoredNames.length > 0) {
          const lowerText = (msg.content || "").toLowerCase();
          for (const name of settings.monitoredNames) {
            if (!name || name.length < 2) continue;
            if (lowerText.includes(name.toLowerCase())) {
              // Toast azzurro, se DM verde
              let color = COLOR_PALETTE.azzurro;
              if (channel && channel.type === 1 && settings.dmAlerts) color = COLOR_PALETTE.verde;
              let emoji = containsLinkOrAttachment(msg) ? " ⛓️‍💥" : "";
              showCustomToast(
                `Il nome “${name}” è stato nominato da @${msg.author?.username} in ${getChannelName(msg.channel_id)} su ${getGuildName(msg.channel_id)} alle ${timeNow()}.${emoji}`,
                color
              );
              break;
            }
          }
        }
      };

      // GHOST PING (toast arancione, se DM verde)
      this.deleteHandler = (event) => {
        if (!settings.enableGhostPing) return;
        const msgId = event.id;
        if (!messageCache.has(msgId)) return;
        const data = messageCache.get(msgId);
        let color = COLOR_PALETTE.arancione;
        let channelName = getChannelName(data.channelId);
        if (data.isDM && settings.dmAlerts) color = COLOR_PALETTE.verde;
        showCustomToast(
          `Sei stata menzionata da @${data.authorName} in ${channelName} su ${getGuildName(data.channelId)} alle ${data.timestamp}.`,
          color
        );
        messageCache.delete(msgId);
      };

      Dispatcher.subscribe("MESSAGE_CREATE", this.createHandler);
      Dispatcher.subscribe("MESSAGE_DELETE", this.deleteHandler);
    }

    stop() {
      const Dispatcher = safeFindModule(["dispatch", "subscribe"]);
      Dispatcher.unsubscribe("MESSAGE_CREATE", this.createHandler);
      Dispatcher.unsubscribe("MESSAGE_DELETE", this.deleteHandler);
      messageCache.clear();
    }

    getSettingsPanel() {
      const theme = getTheme();
      const panel = document.createElement("div");
      panel.style.padding = "16px";
      panel.style.background = getFieldBg();
      panel.style.color = getFieldText();
      panel.style.borderRadius = "22px";
      panel.style.maxWidth = "560px";
      panel.style.boxShadow = "0 2px 22px 0 rgba(0,0,0,0.17)";
      panel.style.fontSize = "15px";
      panel.style.lineHeight = "1.6";
      panel.innerHTML = `<h2 style="margin-bottom:12px;">SilentScanner &ndash; Opzioni avanzate</h2>`;

      // Blocchi UI
      const nameBlock = document.createElement("div");
      nameBlock.style.marginBottom = "16px";
      nameBlock.innerHTML = `<b>Nomi/categorie da monitorare (uno per riga):</b>`;
      const namesBox = document.createElement("textarea");
      namesBox.style.width = "100%";
      namesBox.style.minHeight = "68px";
      namesBox.style.marginTop = "6px";
      namesBox.style.borderRadius = "9px";
      namesBox.style.border = "1px solid #444";
      namesBox.style.background = theme === "dark" ? "#232428" : "#f3f5f9";
      namesBox.style.color = theme === "dark" ? "#fff" : "#222";
      namesBox.value = (settings.monitoredNames || []).join("\n");
      namesBox.oninput = () => {
        settings.monitoredNames = namesBox.value.split("\n").map(x => x.trim()).filter(Boolean);
        saveSettings();
      };
      nameBlock.appendChild(namesBox);

      const fnBlock = document.createElement("div");
      fnBlock.style.margin = "14px 0";
      fnBlock.innerHTML = "<b>Funzioni:</b>";
      [
        {lbl: "Attiva rilevamento Ghost Ping (@tuonome eliminato)", key: "enableGhostPing"},
        {lbl: "Attiva monitoraggio nomi/categorie", key: "enableNameScan"},
        {lbl: "Notifica anche nei DM (toast verde)", key: "dmAlerts"},
      ].forEach(opt => {
        const check = document.createElement("input");
        check.type = "checkbox";
        check.checked = settings[opt.key];
        check.id = `ssopt_${opt.key}`;
        check.style.marginRight = "7px";
        check.onchange = () => { settings[opt.key] = check.checked; saveSettings(); };
        const lbl = document.createElement("label");
        lbl.htmlFor = check.id;
        lbl.textContent = opt.lbl;
        lbl.style.marginRight = "14px";
        fnBlock.appendChild(check); fnBlock.appendChild(lbl); fnBlock.appendChild(document.createElement("br"));
      });

      // --- WHITELIST E BLACKLIST CON 4 CAMPI ---
      const wlBlock = document.createElement("div");
      wlBlock.style.margin = "10px 0";
      wlBlock.innerHTML = `<b>Whitelist e blacklist (ID server/canale):</b><br>`;

      const makeInput = (labelTxt, arrKey, ph) => {
        const wrap = document.createElement("div");
        wrap.style.marginBottom = "5px";
        const lab = document.createElement("label");
        lab.textContent = labelTxt;
        lab.style.display = "inline-block";
        lab.style.width = "145px";
        lab.style.fontWeight = "400";
        const txt = document.createElement("input");
        txt.type = "text";
        txt.style.borderRadius = "5px";
        txt.style.margin = "2px 0 2px 0";
        txt.style.padding = "3px 7px";
        txt.style.width = "62%";
        txt.placeholder = ph;
        txt.value = (settings[arrKey] || []).join(",");
        txt.onchange = () => {
          settings[arrKey] = txt.value.split(",").map(x => x.trim()).filter(Boolean);
          saveSettings();
        };
        wrap.appendChild(lab);
        wrap.appendChild(txt);
        return wrap;
      };
      wlBlock.appendChild(makeInput("Whitelist canali", "channelWhitelist", "ID1,ID2..."));
      wlBlock.appendChild(makeInput("Blacklist canali", "channelBlacklist", "ID1,ID2..."));
      wlBlock.appendChild(makeInput("Whitelist server", "guildWhitelist", "ID1,ID2..."));
      wlBlock.appendChild(makeInput("Blacklist server", "guildBlacklist", "ID1,ID2..."));

      const ignBlock = document.createElement("div");
      ignBlock.style.margin = "10px 0";
      ignBlock.innerHTML = "<b>Ignora alert da bot o ruoli:</b>";
      const botCheck = document.createElement("input");
      botCheck.type = "checkbox";
      botCheck.checked = settings.ignoreBots;
      botCheck.id = "ss_ignoreBots";
      botCheck.style.marginRight = "6px";
      botCheck.onchange = () => { settings.ignoreBots = botCheck.checked; saveSettings(); };
      const botLbl = document.createElement("label");
      botLbl.htmlFor = "ss_ignoreBots";
      botLbl.textContent = "Ignora messaggi da bot";
      botLbl.style.marginRight = "12px";
      ignBlock.appendChild(botCheck); ignBlock.appendChild(botLbl);

      const ignRoleLab = document.createElement("span");
      ignRoleLab.textContent = "ID ruoli da ignorare:";
      ignRoleLab.style.marginRight = "7px";
      const ignRoleTxt = document.createElement("input");
      ignRoleTxt.type = "text";
      ignRoleTxt.style.borderRadius = "5px";
      ignRoleTxt.style.margin = "2px 8px 2px 0";
      ignRoleTxt.style.padding = "3px 7px";
      ignRoleTxt.style.width = "44%";
      ignRoleTxt.placeholder = "ID1,ID2...";
      ignRoleTxt.value = (settings.ignoreRoleIds || []).join(",");
      ignRoleTxt.onchange = () => {
        settings.ignoreRoleIds = ignRoleTxt.value.split(",").map(x => x.trim()).filter(Boolean);
        saveSettings();
      };
      ignBlock.appendChild(ignRoleLab); 
      ignBlock.appendChild(ignRoleTxt);

      const footer = document.createElement("div");
      footer.style = "margin-top:28px;font-size:13px;color:#888;text-align:right;font-style:italic;opacity:0.8;";
      footer.innerHTML = "Developed by Vix";

      panel.appendChild(nameBlock);
      panel.appendChild(fnBlock);
      panel.appendChild(wlBlock);
      panel.appendChild(ignBlock);
      panel.appendChild(footer);

      return panel;
    }
  };
})();
