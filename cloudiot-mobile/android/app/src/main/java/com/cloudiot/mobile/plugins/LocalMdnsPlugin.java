package com.cloudiot.mobile.plugins;

import android.app.Activity;
import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 本地 mDNS 发现插件（基于 Android 框架 NsdManager 实现，无第三方依赖）。
 *
 * 用于发现局域网内的 IoT 网关（广播类型 "_http._tcp."），
 * 网关注册名形如 "IoT Gateway (<gatewayId>)"，TXT 记录包含：
 * type=iot-gateway / version / gateway_id / mqtt_port / mqtt_url。
 *
 * 注意：
 * 1) "_http._tcp" 是公共类型，局域网内打印机/路由器也会广播，因此必须用 TXT type
 *    或名称前缀做过滤，解析完成后再丢弃非网关服务。
 * 2) 系统同一时刻只允许一个 active resolution，resolve 必须串行排队。
 * 3) Android 12 及以下必须持有 MulticastLock 才能收到 mDNS 响应。
 */
@CapacitorPlugin(name = "LocalMdns")
public class LocalMdnsPlugin extends Plugin {

    private static final String TAG = "LocalMdns";

    /** HTTP 服务发现类型（DNS-SD 规范末尾点） */
    private static final String SERVICE_TYPE_HTTP = "_http._tcp.";

    /** MQTT 服务发现类型（独立广播） */
    private static final String SERVICE_TYPE_MQTT = "_mqtt._tcp.";

    /** 归一化后用于比较的类型（去掉末尾点） */
    private static final String SERVICE_TYPE_HTTP_NORMALIZED = "_http._tcp";
    private static final String SERVICE_TYPE_MQTT_NORMALIZED = "_mqtt._tcp";

    /** TXT 记录中标识网关的 type 值 */
    private static final String TXT_TYPE_IOT_GATEWAY = "iot-gateway";

    /** 网关服务名前缀（备用过滤条件） */
    private static final String GATEWAY_NAME_PREFIX = "IoT Gateway";

    private NsdManager nsdManager;
    private NsdManager.DiscoveryListener discoveryListener;
    private NsdManager.ResolveListener resolveListener;
    private WifiManager.MulticastLock multicastLock;

    /** 是否已处于发现状态 */
    private boolean discovering = false;

    /** 是否有正在进行的 resolve（系统限制同时只能有一个） */
    private boolean resolving = false;

    /** resolve 串行队列 */
    private final ArrayDeque<NsdServiceInfo> resolveQueue = new ArrayDeque<NsdServiceInfo>();

    /** 已发现的服务，key = serviceName，用于防重复与 getServices 快照 */
    private final Map<String, JSObject> seen = new LinkedHashMap<String, JSObject>();

    private Handler mainHandler;

    // ------------------------------------------------------------------
    // 对外 PluginMethod
    // ------------------------------------------------------------------

    /**
     * 返回本机可用的 IPv4 地址列表（跳过 loopback / link-local / 无效接口）。
     * 供 JS 层计算待扫描网段（WebView 内 WebRTC ICE 拿不到可靠地址）。
     */
    @PluginMethod
    public void getLocalIpv4s(PluginCall call) {
        try {
            JSArray ips = new JSArray();
            JSArray fallbackIps = new JSArray();
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces != null && interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (!ni.isUp() || ni.isLoopback()) continue;
                // 只收物理局域网接口（Wi-Fi / 以太网 / 热点），跳过 VPN/蜂窝/虚拟接口
                boolean physicalLan = ni.getName().startsWith("wlan")
                        || ni.getName().startsWith("eth")
                        || ni.getName().startsWith("ap")
                        || ni.getName().contains("softap");
                Enumeration<InetAddress> addrs = ni.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress addr = addrs.nextElement();
                    if (addr instanceof Inet4Address && !addr.isLoopbackAddress() && !addr.isLinkLocalAddress()) {
                        Log.i(TAG, "getLocalIpv4s: " + ni.getName() + " -> " + addr.getHostAddress() + " physicalLan=" + physicalLan);
                        if (physicalLan) ips.put(addr.getHostAddress());
                        else fallbackIps.put(addr.getHostAddress());
                    }
                }
            }
            // 物理接口优先；完全没有物理接口时回退其他接口（蜂窝等）
            JSArray result = ips.length() > 0 ? ips : fallbackIps;
            Log.i(TAG, "getLocalIpv4s: result IPs=" + result.length() + " fallbackUsed=" + (ips.length() == 0));
            JSObject ret = new JSObject();
            ret.put("ips", result);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "getLocalIpv4s failed", e);
            call.reject("failed to enumerate IPv4 addresses", e);
        }
    }

    /**
     * 开始发现局域网 mDNS 服务。
     * 重复调用直接 resolve 返回：同一个 DiscoveryListener 不能同时用于两个 active discovery。
     */
    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (discovering) {
            call.resolve();
            return;
        }

        nsdManager = (NsdManager) getContext().getApplicationContext()
                .getSystemService(Context.NSD_SERVICE);
        if (nsdManager == null) {
            emitError("START_FAILED", "NsdManager 不可用");
            call.reject("NsdManager 不可用");
            return;
        }

        discovering = true;
        acquireMulticastLock();

        try {
            // 同时发现 HTTP 与 MQTT 两种服务（DNS-SD 最佳实践：每种协议独立注册）
            nsdManager.discoverServices(SERVICE_TYPE_HTTP, NsdManager.PROTOCOL_DNS_SD, getDiscoveryListener());
            Log.i(TAG, "开始发现 mDNS 服务: " + SERVICE_TYPE_HTTP);

            // 独立 DiscoveryListener 用于 MQTT 类型
            nsdManager.discoverServices(SERVICE_TYPE_MQTT, NsdManager.PROTOCOL_DNS_SD, getMqttDiscoveryListener());
            Log.i(TAG, "开始发现 mDNS 服务: " + SERVICE_TYPE_MQTT);

            call.resolve();
        } catch (Throwable t) {
            Log.e(TAG, "启动 mDNS 发现失败", t);
            discovering = false;
            releaseMulticastLock();
            emitError("START_FAILED", String.valueOf(t.getMessage()));
            call.reject("启动 mDNS 发现失败: " + t.getMessage());
        }
    }

    /** 停止发现并释放 MulticastLock。 */
    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        stopDiscoveryInternal();
        call.resolve();
    }

    /** 返回当前已发现且通过过滤的网关服务列表。 */
    @PluginMethod
    public void getServices(PluginCall call) {
        JSArray arr = new JSArray();
        synchronized (seen) {
            for (JSObject obj : seen.values()) {
                arr.put(obj);
            }
        }
        JSObject ret = new JSObject();
        ret.put("services", arr);
        call.resolve(ret);
    }

    // ------------------------------------------------------------------
    // 生命周期
    // ------------------------------------------------------------------

    @Override
    protected void handleOnDestroy() {
        // 停发现 + 释放组播锁，避免 Activity 销毁后泄漏
        stopDiscoveryInternal();
        super.handleOnDestroy();
    }

    // ------------------------------------------------------------------
    // DiscoveryListener
    // ------------------------------------------------------------------

    private NsdManager.DiscoveryListener getDiscoveryListener() {
        if (discoveryListener == null) {
            discoveryListener = new NsdManager.DiscoveryListener() {

                @Override
                public void onDiscoveryStarted(String regType) {
                    Log.i(TAG, "mDNS 发现已启动: " + regType);
                }

                @Override
                public void onStartDiscoveryFailed(String serviceType, int errorCode) {
                    Log.e(TAG, "onStartDiscoveryFailed: " + serviceType + " code=" + errorCode);
                    discovering = false;
                    releaseMulticastLock();
                    emitError("START_FAILED", "errorCode=" + errorCode);
                }

                @Override
                public void onDiscoveryStopped(String serviceType) {
                    Log.i(TAG, "mDNS 发现已停止: " + serviceType);
                }

                @Override
                public void onStopDiscoveryFailed(String serviceType, int errorCode) {
                    Log.e(TAG, "onStopDiscoveryFailed: " + serviceType + " code=" + errorCode);
                    emitError("STOP_FAILED", "errorCode=" + errorCode);
                }

                @Override
                public void onServiceFound(NsdServiceInfo serviceInfo) {
                    if (!isTargetServiceType(serviceInfo.getServiceType())) {
                        return;
                    }
                    enqueueResolve(serviceInfo);
                }

                @Override
                public void onServiceLost(NsdServiceInfo serviceInfo) {
                    String name = serviceInfo.getServiceName();
                    if (name == null) {
                        return;
                    }
                    boolean removed;
                    synchronized (seen) {
                        removed = seen.remove(name) != null;
                    }
                    synchronized (resolveQueue) {
                        resolveQueue.remove(serviceInfo);
                    }
                    if (removed) {
                        JSObject payload = new JSObject();
                        payload.put("name", name);
                        emit("serviceLost", payload);
                    }
                }
            };
        }
        return discoveryListener;
    }

    /**
     * 服务类型比较不能严格 equals：onServiceFound 回传值的大小写与末尾点不保证一致。
     */
    private boolean isTargetServiceType(String serviceType) {
        if (serviceType == null) {
            return false;
        }
        String normalized = serviceType.trim();
        while (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        normalized = normalized.trim();
        return SERVICE_TYPE_HTTP_NORMALIZED.equalsIgnoreCase(normalized)
                || SERVICE_TYPE_MQTT_NORMALIZED.equalsIgnoreCase(normalized);
    }

    /**
     * 判断是否为 MQTT 独立服务（用于区分事件 payload 中的 serviceType）
     */
    private boolean isMqttServiceType(String serviceType) {
        if (serviceType == null) {
            return false;
        }
        String normalized = serviceType.trim();
        while (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return SERVICE_TYPE_MQTT_NORMALIZED.equalsIgnoreCase(normalized);
    }

    /**
     * MQTT 服务的 DiscoveryListener（与 HTTP 独立，避免类型混淆）
     */
    private NsdManager.DiscoveryListener mqttDiscoveryListener;

    private NsdManager.DiscoveryListener getMqttDiscoveryListener() {
        if (mqttDiscoveryListener == null) {
            mqttDiscoveryListener = new NsdManager.DiscoveryListener() {

                @Override
                public void onDiscoveryStarted(String regType) {
                    Log.i(TAG, "MQTT 发现已启动: " + regType);
                }

                @Override
                public void onStartDiscoveryFailed(String serviceType, int errorCode) {
                    Log.e(TAG, "MQTT onStartDiscoveryFailed: " + serviceType + " code=" + errorCode);
                    emitError("START_FAILED", "MQTT errorCode=" + errorCode);
                }

                @Override
                public void onDiscoveryStopped(String serviceType) {
                    Log.i(TAG, "MQTT 发现已停止: " + serviceType);
                }

                @Override
                public void onStopDiscoveryFailed(String serviceType, int errorCode) {
                    Log.e(TAG, "MQTT onStopDiscoveryFailed: " + serviceType + " code=" + errorCode);
                    emitError("STOP_FAILED", "MQTT errorCode=" + errorCode);
                }

                @Override
                public void onServiceFound(NsdServiceInfo serviceInfo) {
                    if (!isMqttServiceType(serviceInfo.getServiceType())) {
                        return;
                    }
                    enqueueResolve(serviceInfo);
                }

                @Override
                public void onServiceLost(NsdServiceInfo serviceInfo) {
                    String name = serviceInfo.getServiceName();
                    if (name == null) {
                        return;
                    }
                    boolean removed;
                    synchronized (seen) {
                        removed = seen.remove(name) != null;
                    }
                    synchronized (resolveQueue) {
                        resolveQueue.remove(serviceInfo);
                    }
                    if (removed) {
                        JSObject payload = new JSObject();
                        payload.put("name", name);
                        emit("serviceLost", payload);
                    }
                }
            };
        }
        return mqttDiscoveryListener;
    }

    // ------------------------------------------------------------------
    // resolve 串行队列
    // ------------------------------------------------------------------

    private void enqueueResolve(NsdServiceInfo info) {
        if (info == null || info.getServiceName() == null) {
            return;
        }
        synchronized (seen) {
            if (seen.containsKey(info.getServiceName())) {
                return;
            }
        }
        synchronized (resolveQueue) {
            // 队列去重，避免同一服务被重复排队
            for (NsdServiceInfo queued : resolveQueue) {
                if (info.getServiceName().equals(queued.getServiceName())) {
                    return;
                }
            }
            resolveQueue.add(info);
        }
        drainResolveQueue();
    }

    /** 串行取出下一个待解析服务并调用 resolveService。 */
    private void drainResolveQueue() {
        NsdServiceInfo next;
        synchronized (resolveQueue) {
            if (resolving) {
                return;
            }
            next = resolveQueue.poll();
            if (next == null) {
                return;
            }
            resolving = true;
        }

        if (nsdManager == null) {
            synchronized (resolveQueue) {
                resolving = false;
            }
            return;
        }

        try {
            nsdManager.resolveService(next, getResolveListener());
        } catch (Throwable t) {
            // 例如设备状态异常时抛异常，需要复位标志继续 drain，避免队列卡死
            Log.e(TAG, "resolveService 调用失败", t);
            synchronized (resolveQueue) {
                resolving = false;
            }
            emitError("RESOLVE_FAILED", String.valueOf(t.getMessage()));
            drainResolveQueue();
        }
    }

    private NsdManager.ResolveListener getResolveListener() {
        if (resolveListener == null) {
            resolveListener = new NsdManager.ResolveListener() {

                @Override
                public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
                    Log.w(TAG, "onResolveFailed: " + serviceInfo.getServiceName() + " code=" + errorCode);
                    emitError("RESOLVE_FAILED", "errorCode=" + errorCode);
                    synchronized (resolveQueue) {
                        resolving = false;
                    }
                    drainResolveQueue();
                }

                @Override
                public void onServiceResolved(NsdServiceInfo serviceInfo) {
                    try {
                        handleResolved(serviceInfo);
                    } catch (Throwable t) {
                        Log.e(TAG, "处理解析结果失败", t);
                    } finally {
                        synchronized (resolveQueue) {
                            resolving = false;
                        }
                        drainResolveQueue();
                    }
                }
            };
        }
        return resolveListener;
    }

    /** 解析成功后的过滤与事件派发（仅此处能拿到 IP/port/TXT）。 */
    private void handleResolved(NsdServiceInfo info) {
        if (info == null) {
            return;
        }
        String name = info.getServiceName();
        if (name == null) {
            return;
        }
        synchronized (seen) {
            if (seen.containsKey(name)) {
                return;
            }
        }

        // TXT 必须用 UTF-8 解码，默认字符集会导致中文值乱码
        JSObject txt = new JSObject();
        String gatewayId = "";
        Integer mqttPort = null;
        String proto = "";
        String api = "";
        String path = "";
        String url = "";
        String transport = "";
        String hostname = "";
        String version = "";
        Map<String, byte[]> attributes = info.getAttributes();
        if (attributes != null) {
            for (Map.Entry<String, byte[]> entry : attributes.entrySet()) {
                String key = entry.getKey();
                byte[] raw = entry.getValue();
                String value = raw == null ? "" : new String(raw, StandardCharsets.UTF_8);
                txt.put(key, value);
                if ("gateway_id".equals(key)) {
                    gatewayId = value;
                } else if ("mqtt_port".equals(key)) {
                    try {
                        mqttPort = Integer.valueOf(Integer.parseInt(value.trim()));
                    } catch (NumberFormatException e) {
                        mqttPort = null;
                    }
                } else if ("proto".equals(key)) {
                    proto = value;
                } else if ("api".equals(key)) {
                    api = value;
                } else if ("path".equals(key)) {
                    path = value;
                } else if ("url".equals(key)) {
                    url = value;
                } else if ("transport".equals(key)) {
                    transport = value;
                } else if ("hostname".equals(key)) {
                    hostname = value;
                } else if ("version".equals(key)) {
                    version = value;
                }
            }
        }

        // 过滤：_http._tcp / _mqtt._tcp 是公共类型，必须确认是 IoT 网关
        String txtType = txt.optString("type", "");
        boolean isGateway = TXT_TYPE_IOT_GATEWAY.equals(txtType) || name.startsWith(GATEWAY_NAME_PREFIX);
        if (!isGateway) {
            Log.i(TAG, "忽略非网关服务: " + name + " type=" + txtType);
            return;
        }

        int port = info.getPort();
        if (port <= 0) {
            Log.i(TAG, "忽略无有效端口的服务: " + name);
            return;
        }

        String host = getHostAddressCompat(info);
        if (host == null || host.isEmpty()) {
            Log.i(TAG, "忽略无有效地址的服务: " + name);
            return;
        }

        // 判断是否为 MQTT 独立服务
        boolean isMqtt = isMqttServiceType(info.getServiceType());
        String serviceType = isMqtt ? SERVICE_TYPE_MQTT : SERVICE_TYPE_HTTP;

        JSObject payload = new JSObject();
        payload.put("name", name);
        payload.put("host", host);
        payload.put("port", port);
        payload.put("serviceType", serviceType);
        payload.put("gatewayId", gatewayId);
        payload.put("proto", proto);
        if (!api.isEmpty()) payload.put("api", api);
        if (!path.isEmpty()) payload.put("path", path);
        if (!url.isEmpty()) payload.put("url", url);
        if (!transport.isEmpty()) payload.put("transport", transport);
        if (!hostname.isEmpty()) payload.put("hostname", hostname);
        if (!version.isEmpty()) payload.put("version", version);
        if (mqttPort != null) {
            payload.put("mqttPort", mqttPort.intValue());
        }
        payload.put("txt", txt);

        synchronized (seen) {
            if (seen.containsKey(name)) {
                return;
            }
            seen.put(name, payload);
        }
        emit("serviceFound", payload);
    }

    /**
     * host 兼容读取：API 34+ 用 getHostAddresses()，低版本用已废弃的 getHost()。
     * 优先返回 IPv4 字面量，没有 IPv4 时退回第一个地址。
     */
    private String getHostAddressCompat(NsdServiceInfo info) {
        if (android.os.Build.VERSION.SDK_INT >= 34) {
            java.util.List<InetAddress> addresses = info.getHostAddresses();
            if (addresses != null && !addresses.isEmpty()) {
                for (InetAddress addr : addresses) {
                    if (addr instanceof Inet4Address) {
                        return addr.getHostAddress();
                    }
                }
                return addresses.get(0).getHostAddress();
            }
            return null;
        }
        return getHostAddressDeprecated(info);
    }

    @SuppressWarnings("deprecation")
    private String getHostAddressDeprecated(NsdServiceInfo info) {
        InetAddress address = info.getHost();
        return address == null ? null : address.getHostAddress();
    }

    // ------------------------------------------------------------------
    // 停止 / 锁 / 事件
    // ------------------------------------------------------------------

    private void stopDiscoveryInternal() {
        NsdManager manager = nsdManager;
        if (manager != null) {
            // 停止 HTTP 服务发现
            if (discoveryListener != null) {
                try {
                    manager.stopServiceDiscovery(discoveryListener);
                } catch (Throwable t) {
                    Log.w(TAG, "停止 HTTP 发现失败", t);
                    emitError("STOP_FAILED", String.valueOf(t.getMessage()));
                }
            }
            // 停止 MQTT 服务发现
            if (mqttDiscoveryListener != null) {
                try {
                    manager.stopServiceDiscovery(mqttDiscoveryListener);
                } catch (Throwable t) {
                    Log.w(TAG, "停止 MQTT 发现失败", t);
                    emitError("STOP_FAILED", "MQTT: " + String.valueOf(t.getMessage()));
                }
            }
        }

        discovering = false;
        synchronized (resolveQueue) {
            resolveQueue.clear();
            resolving = false;
        }
        releaseMulticastLock();
    }

    private void acquireMulticastLock() {
        try {
            if (multicastLock != null) {
                return;
            }
            WifiManager wifiManager = (WifiManager) getContext().getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wifiManager == null) {
                Log.w(TAG, "WifiManager 不可用，跳过 MulticastLock");
                return;
            }
            WifiManager.MulticastLock lock = wifiManager.createMulticastLock("cloudiot-mdns");
            lock.setReferenceCounted(false);
            lock.acquire();
            multicastLock = lock;
        } catch (Throwable t) {
            Log.e(TAG, "获取 MulticastLock 失败", t);
        }
    }

    private void releaseMulticastLock() {
        WifiManager.MulticastLock lock = multicastLock;
        multicastLock = null;
        if (lock == null) {
            return;
        }
        try {
            if (lock.isHeld()) {
                lock.release();
            }
        } catch (Throwable t) {
            Log.e(TAG, "释放 MulticastLock 失败", t);
        }
    }

    private Handler getMainHandler() {
        if (mainHandler == null) {
            mainHandler = new Handler(Looper.getMainLooper());
        }
        return mainHandler;
    }

    /** 回调可能发生在非主线程，统一投递到主线程再 notifyListeners。 */
    private void emit(final String event, final JSObject payload) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    notifyListeners(event, payload);
                }
            });
        } else {
            getMainHandler().post(new Runnable() {
                @Override
                public void run() {
                    notifyListeners(event, payload);
                }
            });
        }
    }

    private void emitError(String code, String message) {
        JSObject payload = new JSObject();
        payload.put("code", code);
        payload.put("message", message == null ? "" : message);
        emit("discoveryError", payload);
    }
}
