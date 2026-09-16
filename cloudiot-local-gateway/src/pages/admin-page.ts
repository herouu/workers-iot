// 内置网关管理页面 - 零依赖原生 HTML/JS
export const adminPageHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>CloudIoT 本地网关管理</title>
<link rel="icon" href="data:,">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0f1117;--bg2:#181b23;--card:#1e2230;--card-hover:#252a3a;
  --border:#2a2f40;--text:#e4e7ef;--text2:#8b91a8;--text3:#5a6078;
  --accent:#3b82f6;--accent2:#2563eb;--green:#22c55e;--green-dim:#166534;
  --red:#ef4444;--red-dim:#7f1d1d;--orange:#f59e0b;--orange-dim:#78350f;
  --radius:10px;--gap:12px;
}
html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);line-height:1.5;-webkit-font-smoothing:antialiased}
body{display:flex;flex-direction:column;min-height:100dvh}

/* 错误横幅 */
#error-banner{display:none;position:fixed;top:0;left:0;right:0;z-index:999;padding:10px 16px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;font-size:13px;text-align:center;box-shadow:0 4px 20px rgba(220,38,38,.4);animation:bannerIn .3s ease}
#error-banner.show{display:block}
@keyframes bannerIn{from{transform:translateY(-100%)}to{transform:translateY(0)}}

/* 头部 */
.header{padding:20px 16px 16px;background:linear-gradient(135deg,#1e2230 0%,#181b23 100%);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;backdrop-filter:blur(12px)}
.header-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.header h1{font-size:18px;font-weight:700;letter-spacing:-.3px;background:linear-gradient(135deg,#e4e7ef,#8b91a8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.header .subtitle{font-size:12px;color:var(--text3);margin-top:2px;font-family:"SF Mono","Fira Code",monospace}

/* 自动刷新开关 */
.refresh-toggle{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text2);white-space:nowrap;flex-shrink:0;margin-top:2px}
.toggle{position:relative;width:36px;height:20px;cursor:pointer}
.toggle input{display:none}
.toggle .slider{position:absolute;inset:0;background:var(--border);border-radius:20px;transition:.25s ease}
.toggle .slider::after{content:"";position:absolute;width:16px;height:16px;left:2px;top:2px;background:#fff;border-radius:50%;transition:.25s ease;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.toggle input:checked+.slider{background:var(--accent)}
.toggle input:checked+.slider::after{transform:translateX(16px)}

/* 状态条 */
.status-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 16px;background:var(--bg2)}
.stat-item{text-align:center;padding:8px 4px;border-radius:var(--radius);background:var(--card);border:1px solid var(--border)}
.stat-value{font-size:18px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums}
.stat-value.green{color:var(--green)}
.stat-value.orange{color:var(--orange)}
.stat-label{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-top:2px}

/* 区域标题 */
.section-title{padding:16px 16px 8px;font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:1px}

/* 设备列表 */
.device-list{padding:0 16px 8px}
.device-item{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;overflow:hidden;transition:border-color .2s,background .2s}
.device-item:hover{border-color:var(--accent);background:var(--card-hover)}
.device-item.expanded{border-color:var(--accent);background:var(--card-hover)}
.device-row{display:flex;align-items:center;padding:12px;cursor:pointer;gap:10px}
.device-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.device-dot.online{background:var(--green);box-shadow:0 0 8px rgba(34,197,94,.5)}
.device-dot.offline{background:var(--text3)}
.device-info{flex:1;min-width:0}
.device-name{font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.device-meta{font-size:11px;color:var(--text3);margin-top:1px}
.device-meta span{margin-right:8px}
.device-time{font-size:11px;color:var(--text3);white-space:nowrap;flex-shrink:0;text-align:right}
.device-expand-icon{color:var(--text3);font-size:11px;flex-shrink:0;transition:transform .2s}
.device-item.expanded .device-expand-icon{transform:rotate(90deg)}

/* 设备详情面板 */
.device-panel{display:none;padding:0 12px 12px;border-top:1px solid var(--border)}
.device-item.expanded .device-panel{display:block}
.panel-section{margin-top:10px}
.panel-label{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.telemetry-list{list-style:none}
.telemetry-item{font-size:12px;padding:4px 8px;background:var(--bg);border-radius:6px;margin-bottom:4px;font-family:"SF Mono","Fira Code","Cascadia Code",monospace;color:var(--text2);word-break:break-all}
.telemetry-key{color:var(--accent);font-weight:600}
.telemetry-val{color:var(--text)}
.cmd-form{display:flex;flex-direction:column;gap:6px}
.cmd-input,.cmd-textarea{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-size:13px;font-family:inherit;outline:none;transition:border-color .2s}
.cmd-input:focus,.cmd-textarea:focus{border-color:var(--accent)}
.cmd-textarea{min-height:60px;resize:vertical;font-family:"SF Mono","Fira Code",monospace;font-size:12px}
.cmd-btn{padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s,transform .1s}
.cmd-btn:hover{background:var(--accent2)}
.cmd-btn:active{transform:scale(.97)}
.cmd-btn:disabled{opacity:.5;cursor:not-allowed}
.cmd-result{margin-top:6px;font-size:12px;padding:6px 8px;border-radius:6px;display:none}
.cmd-result.ok{display:block;background:var(--green-dim);color:#86efac;border:1px solid var(--green-dim)}
.cmd-result.err{display:block;background:var(--red-dim);color:#fca5a5;border:1px solid var(--red-dim)}

/* 规则区 */
.rules-list{padding:0 16px 24px}
.rule-item{display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;gap:10px}
.rule-info{flex:1;min-width:0}
.rule-name{font-size:14px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rule-desc{font-size:11px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:"SF Mono","Fira Code",monospace}

/* 空状态 */
.empty{padding:32px;text-align:center;color:var(--text3);font-size:13px}

/* 移动端适配 */
@media(max-width:430px){
  .header{padding:16px 12px 12px}
  .header h1{font-size:16px}
  .status-bar{grid-template-columns:repeat(2,1fr);padding:10px 12px}
  .device-list,.rules-list{padding-left:12px;padding-right:12px}
  .section-title{padding-left:12px;padding-right:12px}
  .stat-value{font-size:16px}
}
@media(min-width:768px){
  .container{max-width:720px;margin:0 auto;width:100%}
  .header{padding:24px 32px 20px}
  .status-bar{padding:16px 32px;border-radius:var(--radius);margin:0 32px}
  .section-title{padding:20px 32px 10px}
  .device-list{padding:0 32px 12px}
  .rules-list{padding:0 32px 32px}
}

/* 加载态 */
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
.loading{color:var(--text3);font-size:12px;animation:pulse 1.5s infinite;padding:12px;text-align:center}
</style>
</head>
<body>
<div class="container">
  <header class="header" id="header"></header>
  <div class="status-bar" id="statusBar"></div>
  <div class="section-title">设备列表</div>
  <div class="device-list" id="deviceList"><div class="loading">加载中...</div></div>
  <div class="section-title">规则管理</div>
  <div class="rules-list" id="rulesList"><div class="loading">加载中...</div></div>
</div>
<div id="error-banner"></div>

<script>
(function(){
  "use strict";

  /* ========== 状态 ========== */
  var autoRefresh = true;
  var pollTimer = null;
  var expandedDevice = null;

  /* ========== DOM 工具 ========== */
  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) { for (var k in attrs) { e.setAttribute(k, attrs[k]); } }
    return e;
  }
  function txt(s) { return document.createTextNode(s); }

  /* ========== 时间格式化 ========== */
  function formatUptime(sec) {
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function formatAgo(epochSec) {
    if (!epochSec) return "未知";
    var now = Math.floor(Date.now() / 1000);
    var diff = now - epochSec;
    if (diff < 0) diff = 0;
    if (diff < 60) return diff + "秒前";
    if (diff < 3600) return Math.floor(diff / 60) + "分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + "小时前";
    return Math.floor(diff / 86400) + "天前";
  }

  /* ========== 错误横幅 ========== */
  var errorTimer = null;
  function showError(msg) {
    var b = document.getElementById("error-banner");
    b.textContent = "⚠ " + msg;
    b.className = "show";
    clearTimeout(errorTimer);
    errorTimer = setTimeout(function() { b.className = ""; }, 6000);
  }
  function hideError() {
    document.getElementById("error-banner").className = "";
  }

  /* ========== API ========== */
  function api(method, url, body) {
    var opts = { method: method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(url, opts).then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  /* ========== 渲染：头部 ========== */
  function renderHeader(gwId) {
    var h = document.getElementById("header");
    h.innerHTML = "";
    var top = el("div", "header-top");
    var left = el("div");
    var title = el("h1", null);
    title.textContent = "CloudIoT 本地网关";
    left.appendChild(title);
    var sub = el("div", "subtitle");
    sub.textContent = gwId ? "ID: " + gwId : "";
    left.appendChild(sub);
    top.appendChild(left);

    var toggleWrap = el("div", "refresh-toggle");
    var lbl = el("span", null);
    lbl.textContent = "自动刷新 5s";
    toggleWrap.appendChild(lbl);
    var label = el("label", "toggle");
    var input = el("input", null, { type: "checkbox" });
    input.checked = autoRefresh;
    input.addEventListener("change", function() {
      autoRefresh = this.checked;
      if (autoRefresh) startPoll(); else stopPoll();
    });
    var slider = el("div", "slider");
    label.appendChild(input);
    label.appendChild(slider);
    toggleWrap.appendChild(label);
    top.appendChild(toggleWrap);
    h.appendChild(top);
  }

  /* ========== 渲染：状态条 ========== */
  function renderStatus(st) {
    var bar = document.getElementById("statusBar");
    bar.innerHTML = "";

    var items = [
      { val: st.devices.online + "/" + st.devices.total, label: "在线设备", cls: "" },
      { val: st.telemetry.total, label: "遥测总数", cls: "" },
      { val: formatUptime(st.uptime), label: "运行时长", cls: "" },
      { val: st.rules.enabled + "/" + st.rules.total, label: "规则", cls: "" }
    ];

    for (var i = 0; i < items.length; i++) {
      var it = el("div", "stat-item");
      var v = el("div", "stat-value " + (items[i].cls || ""));
      v.textContent = items[i].val;
      var l = el("div", "stat-label");
      l.textContent = items[i].label;
      it.appendChild(v);
      it.appendChild(l);
      bar.appendChild(it);
    }
  }

  /* ========== 渲染：设备列表 ========== */
  function renderDevices(devices) {
    var list = document.getElementById("deviceList");
    list.innerHTML = "";
    if (!devices || devices.length === 0) {
      var empty = el("div", "empty");
      empty.textContent = "暂无设备";
      list.appendChild(empty);
      return;
    }

    for (var i = 0; i < devices.length; i++) {
      (function(d) {
        var item = el("div", "device-item");
        if (expandedDevice === d.id) item.className += " expanded";

        // 主行
        var row = el("div", "device-row");
        var dot = el("div", "device-dot " + (d.online ? "online" : "offline"));
        row.appendChild(dot);

        var info = el("div", "device-info");
        var name = el("div", "device-name");
        name.textContent = d.name || d.id;
        info.appendChild(name);
        var meta = el("div", "device-meta");
        var typeSpan = el("span", null);
        typeSpan.textContent = d.type || "未知";
        meta.appendChild(typeSpan);
        var protoSpan = el("span", null);
        protoSpan.textContent = d.protocol || "";
        meta.appendChild(protoSpan);
        if (!d.online) {
          var agoSpan = el("span", null);
          agoSpan.textContent = formatAgo(d.last_seen);
          meta.appendChild(agoSpan);
        }
        info.appendChild(meta);
        row.appendChild(info);

        var expandIcon = el("span", "device-expand-icon");
        expandIcon.textContent = "▶";
        row.appendChild(expandIcon);

        row.addEventListener("click", function() {
          expandedDevice = expandedDevice === d.id ? null : d.id;
          renderDevices(devices);
        });
        item.appendChild(row);

        // 展开面板
        if (expandedDevice === d.id) {
          var panel = el("div", "device-panel");
          panel.appendChild(buildTelemetrySection(d.id));
          panel.appendChild(buildCommandSection(d.id));
          item.appendChild(panel);
        }

        list.appendChild(item);
      })(devices[i]);
    }
  }

  /* ========== 遥测面板 ========== */
  function buildTelemetrySection(deviceId) {
    var sec = el("div", "panel-section");
    var lbl = el("div", "panel-label");
    lbl.textContent = "最近遥测";
    sec.appendChild(lbl);
    var list = el("ul", "telemetry-list");
    var loading = el("div", "loading");
    loading.textContent = "加载中...";
    list.appendChild(loading);
    sec.appendChild(list);

    api("GET", "/api/telemetry/" + encodeURIComponent(deviceId) + "?limit=5").then(function(res) {
      list.innerHTML = "";
      var data = res.data || [];
      if (data.length === 0) {
        var empty = el("li", "telemetry-item");
        empty.textContent = "暂无数据";
        list.appendChild(empty);
        return;
      }
      for (var i = 0; i < data.length; i++) {
        var item = el("li", "telemetry-item");
        var parsed = null;
        try { parsed = typeof data[i].data === "string" ? JSON.parse(data[i].data) : data[i].data; } catch(e) { parsed = { raw: data[i].data }; }
        if (parsed && typeof parsed === "object") {
          var keys = Object.keys(parsed);
          for (var k = 0; k < keys.length; k++) {
            if (k > 0) item.appendChild(document.createTextNode("  "));
            var keyEl = el("span", "telemetry-key");
            keyEl.textContent = keys[k] + ":";
            item.appendChild(keyEl);
            var valEl = el("span", "telemetry-val");
            valEl.textContent = " " + String(parsed[keys[k]]);
            item.appendChild(valEl);
          }
        } else {
          item.textContent = String(parsed);
        }
        list.appendChild(item);
      }
    }).catch(function(err) {
      list.innerHTML = "";
      var e = el("li", "telemetry-item");
      e.textContent = "加载失败: " + err.message;
      list.appendChild(e);
    });

    return sec;
  }

  /* ========== 命令表单 ========== */
  function buildCommandSection(deviceId) {
    var sec = el("div", "panel-section");
    var lbl = el("div", "panel-label");
    lbl.textContent = "下发命令";
    sec.appendChild(lbl);

    var form = el("div", "cmd-form");
    var cmdInput = el("input", "cmd-input", { type: "text", placeholder: "命令名称 (如: restart, set_config)" });
    var paramInput = el("textarea", "cmd-textarea", { placeholder: "参数 JSON (可选)" });
    var btn = el("button", "cmd-btn", { type: "button" });
    btn.textContent = "发送命令";
    var result = el("div", "cmd-result");

    btn.addEventListener("click", function() {
      var cmd = cmdInput.value.trim();
      if (!cmd) { cmdInput.focus(); return; }
      var params = undefined;
      var paramText = paramInput.value.trim();
      if (paramText) {
        try { params = JSON.parse(paramText); } catch(e) {
          result.className = "cmd-result err";
          result.textContent = "参数 JSON 格式错误";
          return;
        }
      }
      btn.disabled = true;
      btn.textContent = "发送中...";
      api("POST", "/api/devices/" + encodeURIComponent(deviceId) + "/command", { command: cmd, params: params }).then(function(res) {
        result.className = "cmd-result ok";
        result.textContent = "命令已入队";
        cmdInput.value = "";
        paramInput.value = "";
      }).catch(function(err) {
        result.className = "cmd-result err";
        result.textContent = "失败: " + err.message;
      }).finally(function() {
        btn.disabled = false;
        btn.textContent = "发送命令";
        setTimeout(function() { result.className = "cmd-result"; }, 4000);
      });
    });

    form.appendChild(cmdInput);
    form.appendChild(paramInput);
    form.appendChild(btn);
    form.appendChild(result);
    sec.appendChild(form);
    return sec;
  }

  /* ========== 渲染：规则列表 ========== */
  function renderRules(rules) {
    var list = document.getElementById("rulesList");
    list.innerHTML = "";
    if (!rules || rules.length === 0) {
      var empty = el("div", "empty");
      empty.textContent = "暂无规则";
      list.appendChild(empty);
      return;
    }
    for (var i = 0; i < rules.length; i++) {
      (function(r) {
        var item = el("div", "rule-item");
        var info = el("div", "rule-info");
        var name = el("div", "rule-name");
        name.textContent = r.name || r.id;
        info.appendChild(name);
        var desc = el("div", "rule-desc");
        desc.textContent = (r.condition || "") + " → " + (r.action || "");
        info.appendChild(desc);
        item.appendChild(info);

        var label = el("label", "toggle");
        var input = el("input", null, { type: "checkbox" });
        input.checked = !!r.enabled;
        var slider = el("div", "slider");
        label.appendChild(input);
        label.appendChild(slider);

        input.addEventListener("change", function() {
          var self = this;
          api("POST", "/api/rules/" + encodeURIComponent(r.id) + "/toggle").catch(function(err) {
            self.checked = !self.checked;
            showError("规则切换失败: " + err.message);
          });
        });

        item.appendChild(label);
        list.appendChild(item);
      })(rules[i]);
    }
  }

  /* ========== 数据加载 ========== */
  function loadAll() {
    var done = 0;
    var total = 3;
    var gwId = null;

    api("GET", "/api/admin/status").then(function(st) {
      gwId = st.gateway_id;
      renderHeader(gwId);
      renderStatus(st);
      checkDone();
    }).catch(function(err) {
      showError("状态加载失败: " + err.message);
      renderHeader("");
      renderStatus({ devices:{online:0,total:0}, telemetry:{total:0}, uptime:0, rules:{enabled:0,total:0} });
      checkDone();
    });

    api("GET", "/api/devices").then(function(res) {
      renderDevices(res.devices || []);
      checkDone();
    }).catch(function(err) {
      showError("设备加载失败: " + err.message);
      renderDevices([]);
      checkDone();
    });

    api("GET", "/api/rules").then(function(res) {
      renderRules(res.rules || []);
      checkDone();
    }).catch(function(err) {
      showError("规则加载失败: " + err.message);
      renderRules([]);
      checkDone();
    });

    function checkDone() {
      done++;
      if (done >= total) hideError();
    }
  }

  /* ========== 轮询 ========== */
  function startPoll() {
    stopPoll();
    loadAll();
    pollTimer = setInterval(function() { loadAll(); }, 5000);
  }
  function stopPoll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  /* ========== 启动 ========== */
  startPoll();
})();
</script>
</body>
</html>`;
