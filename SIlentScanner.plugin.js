/**
 * @name SilentScanner
 * @author Vix (Viola/Nicola)
 * @version 2.4.0
 * @description Notifica ghost ping, nomine, DM – Branding, palette colori, loader animato, toast personalizzabili. Vix Edition.
 * @updateUrl https://TUA-URL-PUBBLICA/SilentScanner.VixEdition.plugin.js
 * @source https://TUA-URL-PUBBLICA/SilentScanner.VixEdition.plugin.js
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
  toastDurationPreset: "medium",
  ghostPingColor: "#ffa048",
  nameMentionColor: "#3fa3ff",
  dmAlertColor: "#25d366",
  extraColor: "#a56eff",
};

const PRESET_PALETTES = [
  {
    name: "Classic",
    ghostPingColor: "#ffa048",
    nameMentionColor: "#3fa3ff",
    dmAlertColor: "#25d366",
    extraColor: "#a56eff"
  },
  {
    name: "Neon",
    ghostPingColor: "#fe2b83",
    nameMentionColor: "#00ffd0",
    dmAlertColor: "#e7ff1e",
    extraColor: "#00ffea"
  },
  {
    name: "Dark",
    ghostPingColor: "#aa5500",
    nameMentionColor: "#3355ff",
    dmAlertColor: "#25d366",
    extraColor: "#222222"
  }
];

const TOAST_DURATIONS = {
  short: 5000,
  medium: 20000,
  long: 50000
};

const PLUGIN_VERSION = "2.4.0";
const PLUGIN_NAME = "SilentScanner";
const PLUGIN_BRANDING = "Powered by Vix";

// Mostra badge loader (solo testo)
function showLoaderBadge() {
  if (document.getElementById("silent-vix-badge")) return;
  const badge = document.createElement("div");
  badge.id = "silent-vix-badge";
  badge.style = `
    position: fixed; bottom: 42px; right: 42px; z-index: 10000;
    background: rgba(28,27,32,0.98); border-radius: 19px; box-shadow: 0 6px 24px 0 #0008;
    padding: 17px 35px 16px 22px; display: flex; align-items: center; opacity: 0; transition: opacity .5s;
    font-family: Arial,sans-serif; color: #fff; font-size: 17px; min-width: 210px; pointer-events:none;
  `;
  badge.innerHTML = `
    <div>
      <b style="font-size:19px;letter-spacing:1px;">SilentScanner</b><br>
      <span style="font-size:14px;opacity:0.72;">v2.4.0 &ndash; Powered by Vix</span>
    </div>
  `;
  document.body.appendChild(badge);
  setTimeout(() => { badge.style.opacity = "1"; }, 80);
  setTimeout(() => { badge.style.opacity = "0"; }, 1580);
  setTimeout(() => { badge.remove(); }, 2400);
}

// Trova moduli Discord
function safeFindModule(propsArr, altCheck) {
  let mod = null;
  try {
    mod = BdApi.findModuleByProps(...propsArr);
    if (!mod && altCheck) mod = BdApi.findModule(altCheck);
    if (!mod) throw new Error();
  } catch (e) {
    BdApi.showToast("SilentScanner: modulo mancante!", {type:"error",timeout:7000});
  }
  return mod;
}

module.exports = (() => {
  let messageCache = new Map();
  let currentUser = null;
  let settings = BdApi.loadData(SilentScannerConfigKey, "settings") || DEFAULT_SETTINGS;

  // Correggi mancanze settings
  if (!settings.toastDurationPreset) settings.toastDurationPreset = "medium";
  if (!settings.ghostPingColor) settings.ghostPingColor = "#ffa048";
  if (!settings.nameMentionColor) settings.nameMentionColor = "#3fa3ff";
  if (!settings.dmAlertColor) settings.dmAlertColor = "#25d366";
  if (!settings.extraColor) settings.extraColor = "#a56eff";

  function saveSettings() {
    BdApi.saveData(SilentScannerConfigKey, "settings", settings);
  }

// Funzione helper per convertire hex in rgba con alpha personalizzato
function hexToRgba(hex, alpha = 1) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

function showCustomToast(message, color, branding=PLUGIN_BRANDING) {
  if (!document.getElementById("silent-toast-style")) {
    const style = document.createElement("style");
    style.id = "silent-toast-style";
    style.textContent = `
      @keyframes silentToastIn {
        from { transform: translateY(24px); opacity: 0; }
        to { transform: translateY(0); opacity: 0.98; }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.querySelectorAll(".silent-toast-vix").length > 4)
    document.querySelector(".silent-toast-vix")?.remove();

  const toast = document.createElement("div");
  toast.className = "silent-toast-vix";

  toast.style = `
    position: fixed !important; 
    bottom: 32px !important; 
    right: 32px !important; 
    z-index: 9999 !important;
    padding: 16px 36px 14px 22px; 
    font-size: 16px; 
    font-weight: 500;
    color: #fff; 
    background-color: ${hexToRgba(color, 0.75)};
    backdrop-filter: blur(5px);
    border-radius: 18px;
    box-shadow: 0 8px 28px 0 rgba(0,0,0,0.19);
    width: 420px; 
    min-height: 77px; 
    line-height: 1.5; 
    user-select: text; 
    opacity: 0.98;
    border: 2px solid rgba(0,0,0,0.14);
    display: flex; 
    align-items: flex-start; 
    font-family: Arial,sans-serif;
    transition: opacity 0.18s; 
    pointer-events: all;
    transform: translateY(24px); 
    opacity: 0;
    animation: silentToastIn 0.42s cubic-bezier(.43,.19,.31,1.33) forwards;
    position: relative;
  `;

  toast.innerHTML = `
    <span style="position:absolute;top:10px;right:14px;font-size:20px;cursor:pointer;opacity:0.48;color:#ccc;transition:opacity 0.25s ease-in-out;" title="Chiudi" aria-label="Chiudi" role="button" onmouseenter="this.style.opacity='0.85'" onmouseleave="this.style.opacity='0.48'">&times;</span>
    <div style="flex:1;">
      ${message}
      <div style="border-top:1px solid #ffffff33; margin:10px 0 0 0;"></div>
      <div style="font-size:12px;margin-top:4px;text-align:left;opacity:.68;letter-spacing:.2px;line-height:1.1;">
        <span style="font-weight:400;">${branding}</span>
      </div>
    </div>
  `;

  toast.querySelector("span").onclick = () => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  };

  const duration = TOAST_DURATIONS[settings.toastDurationPreset] || 20000;
  document.body.appendChild(toast);

  toast.onmouseenter = () => { toast.style.opacity = "0.74"; };
  toast.onmouseleave = () => { toast.style.opacity = "0.98"; };

  setTimeout(() => { toast.style.opacity = "0"; }, duration - 200);
  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, duration);
}
  function timeNow() {
    return new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  }

  function getChannelName(id) {
    const ChannelStore = safeFindModule(["getChannel", "hasChannel"], m => m.getAllChannels);
    const ch = ChannelStore?.getChannel?.(id);
    return ch ? (ch.type === 1 ? "[DM]" : `#${ch.name}`) : "Canale sconosciuto";
  }
  function getGuildName(channelId) {
    const ChannelStore = safeFindModule(["getChannel", "hasChannel"], m => m.getAllChannels);
    const GuildStore = safeFindModule(["getGuild", "getGuilds"]);
    const ch = ChannelStore?.getChannel?.(channelId);
    if (!ch) return "Server sconosciuto";
    if (ch.type === 1) return "[DM]";
    if (!ch.guild_id) return "Server sconosciuto";
    const guild = GuildStore?.getGuild?.(ch.guild_id);
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

  // INPUT COLOR per ogni alert
  function colorInput(label, key, def) {
    const wrap = document.createElement("div");
    wrap.style.margin = "6px 0";
    wrap.innerHTML = `<b style="font-weight:400;">${label}:</b>`;
    const inp = document.createElement("input");
    inp.type = "color";
    inp.value = settings[key] || def;
    inp.style.marginLeft = "14px";
    inp.oninput = (e) => {
      settings[key] = e.target.value;
      saveSettings();
    };
    wrap.appendChild(inp);
    return wrap;
  }

  // PALETTE PRESET buttons
  function presetButtons() {
    const row = document.createElement("div");
    row.style.margin = "8px 0 20px 0";
    PRESET_PALETTES.forEach((preset) => {
      const btn = document.createElement("button");
      btn.textContent = preset.name;
      btn.style = "margin-right:12px;padding:5px 12px;border-radius:7px;font-size:15px;border:none;background:#eee;color:#222;font-family:Arial;cursor:pointer;";
      btn.onclick = () => {
        settings.ghostPingColor = preset.ghostPingColor;
        settings.nameMentionColor = preset.nameMentionColor;
        settings.dmAlertColor = preset.dmAlertColor;
        settings.extraColor = preset.extraColor;
        saveSettings();
        BdApi.showToast("Palette '" + preset.name + "' caricata!",{timeout:2000});
      };
      row.appendChild(btn);
    });
    return row;
  }

  // TEST TOAST BUTTONS
  function testToastButtons() {
    const wrap = document.createElement("div");
    wrap.style.margin = "12px 0 18px 0";
    // Ghost
    const gbtn = document.createElement("button");
    gbtn.textContent = "Test Ghost";
    gbtn.style = "margin-right:10px;padding:7px 19px;border-radius:9px;font-size:15px;border:none;background:" + settings.ghostPingColor + ";color:#fff;font-family:Arial;cursor:pointer;box-shadow:0 2px 8px 0 #0002;";
    gbtn.onclick = () => {
      showCustomToast("Sei stata menzionata da @TestUser in #generale su ServerTest alle " + timeNow() + ".", settings.ghostPingColor);
    };
    // Nomina
    const nbtn = document.createElement("button");
    nbtn.textContent = "Test Nomina";
    nbtn.style = "margin-right:10px;padding:7px 19px;border-radius:9px;font-size:15px;border:none;background:" + settings.nameMentionColor + ";color:#fff;font-family:Arial;cursor:pointer;box-shadow:0 2px 8px 0 #0002;";
    nbtn.onclick = () => {
      showCustomToast("Il nome “Vix” è stato nominato da @TestUser in #chat su ServerTest alle " + timeNow() + ".", settings.nameMentionColor);
    };
    // DM
    const dbtn = document.createElement("button");
    dbtn.textContent = "Test DM";
    dbtn.style = "padding:7px 19px;border-radius:9px;font-size:15px;border:none;background:" + settings.dmAlertColor + ";color:#fff;font-family:Arial;cursor:pointer;box-shadow:0 2px 8px 0 #0002;";
    dbtn.onclick = () => {
      showCustomToast("Nuovo DM ricevuto da @Staff in [DM] alle " + timeNow() + ".", settings.dmAlertColor);
    };
    wrap.appendChild(gbtn);
    wrap.appendChild(nbtn);
    wrap.appendChild(dbtn);
    return wrap;
  }

  // EXPORT CLASSE BetterDiscord
  return class SilentScanner {
    getName() { return PLUGIN_NAME; }
    getDescription() { return "Notifica ghost ping, nomine, DM – Branding, palette colori, loader animato, toast personalizzabili. Vix Edition."; }
    getVersion() { return PLUGIN_VERSION; }
    getAuthor() { return "Vix"; }

    start() {
      showLoaderBadge();
      const Dispatcher = safeFindModule(["dispatch", "subscribe"]);
      const UserStore = safeFindModule(["getCurrentUser"]);
      const ChannelStore = safeFindModule(["getChannel", "hasChannel"], m => m.getAllChannels);
      currentUser = UserStore?.getCurrentUser();
      if (!currentUser?.id) return;
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
              let color = settings.nameMentionColor;
              if (channel && channel.type === 1 && settings.dmAlerts) color = settings.dmAlertColor;
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
        let color = settings.ghostPingColor;
        let channelName = getChannelName(data.channelId);
        if (data.isDM && settings.dmAlerts) color = settings.dmAlertColor;
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
      const theme = (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const panel = document.createElement("div");
      panel.style.padding = "20px 14px 18px 14px";
      panel.style.background = theme === "dark" ? "rgba(35,36,40,0.97)" : "#fff";
      panel.style.color = theme === "dark" ? "#fff" : "#232428";
      panel.style.borderRadius = "22px";
      panel.style.maxWidth = "520px";
      panel.style.boxShadow = "0 2px 22px 0 rgba(0,0,0,0.14)";
      panel.style.fontSize = "15px";
      panel.style.lineHeight = "1.7";
      panel.style.fontFamily = "Arial,sans-serif";

      // Branding
      const btxt = document.createElement("div");
      btxt.style = "font-size:19px;margin-bottom:9px;color:#a685f7;letter-spacing:.7px;font-weight:600;";
      btxt.textContent = "SilentScanner – Vix Edition";
      panel.appendChild(btxt);

      const vtxt = document.createElement("div");
      vtxt.style = "font-size:13px;margin-bottom:14px;color:#9f81f7;letter-spacing:1.2px;";
      vtxt.textContent = "Powered by Vix";
      panel.appendChild(vtxt);

      // Palette/preset
      panel.appendChild(document.createElement("hr"));
      const paletteTitle = document.createElement("div");
      paletteTitle.style = "margin-bottom:5px;font-weight:500;font-size:16px;";
      paletteTitle.textContent = "Palette colori toast";
      panel.appendChild(paletteTitle);

      panel.appendChild(presetButtons());
      panel.appendChild(colorInput("Ghost Ping", "ghostPingColor", "#ffa048"));
      panel.appendChild(colorInput("Nomina keyword", "nameMentionColor", "#3fa3ff"));
      panel.appendChild(colorInput("DM Alert", "dmAlertColor", "#25d366"));

      // Durata toast
      const toastBlock = document.createElement("div");
      toastBlock.style.margin = "16px 0 20px 0";
      toastBlock.innerHTML = `<b>Durata notifiche toast:</b>`;
      const select = document.createElement("select");
      select.style.marginLeft = "10px";
      select.style.fontSize = "15px";
      select.style.borderRadius = "8px";
      select.style.padding = "4px 9px";
      [
        { value: "short", label: "Short (5s)" },
        { value: "medium", label: "Medium (20s)" },
        { value: "long", label: "Long (50s)" }
      ].forEach(opt => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.text = opt.label;
        if (settings.toastDurationPreset === opt.value) o.selected = true;
        select.appendChild(o);
      });
      select.onchange = (e) => {
        settings.toastDurationPreset = e.target.value;
        saveSettings();
      };
      toastBlock.appendChild(select);
      panel.appendChild(toastBlock);

      // Pulsanti test
      panel.appendChild(testToastButtons());

      // Blocchi UI standard (nomi monitorati, whitelist, blacklist ecc)
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
      panel.appendChild(nameBlock);

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
      panel.appendChild(fnBlock);

      // Whitelist/Blacklist (ID server/canale)
      const wlBlock = document.createElement("div");
      wlBlock.style.margin = "10px 0";
      wlBlock.innerHTML = `<b>Whitelist e blacklist (ID server/canale):</b><br>`;
      function makeInput(labelTxt, arrKey, ph) {
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
      }
      wlBlock.appendChild(makeInput("Whitelist canali", "channelWhitelist", "ID1,ID2..."));
      wlBlock.appendChild(makeInput("Blacklist canali", "channelBlacklist", "ID1,ID2..."));
      wlBlock.appendChild(makeInput("Whitelist server", "guildWhitelist", "ID1,ID2..."));
      wlBlock.appendChild(makeInput("Blacklist server", "guildBlacklist", "ID1,ID2..."));
      panel.appendChild(wlBlock);

      // Ignora bot/ruoli
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
      panel.appendChild(ignBlock);

      const footer = document.createElement("div");
      footer.style = "margin-top:30px;font-size:13px;color:#999;text-align:right;font-style:italic;opacity:0.77;";
      footer.innerHTML = "SilentScanner – Vix Edition | " + PLUGIN_VERSION;
      panel.appendChild(footer);

      return panel;
    }
  };
})();
