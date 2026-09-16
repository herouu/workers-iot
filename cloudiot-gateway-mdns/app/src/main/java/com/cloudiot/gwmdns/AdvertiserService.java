package com.cloudiot.gwmdns;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * mDNS/DNS-SD 广播前台服务（核心）。
 *
 * <p>背景：网关本体是 Termux 里的 Node.js 进程，作为普通 Linux 进程无法获取
 * Android 的 {@link WifiManager.MulticastLock}，于是只能发组播、收不到组播，
 * 无法响应 mDNS 查询。本服务运行在同一台手机上：
 * <ul>
 *   <li>持有 MulticastLock —— 设备级解除 Wi-Fi 组播过滤，系统 mdnsresponder 因此也能收包；</li>
 *   <li>用 {@link NsdManager#registerService} 注册服务 —— 由系统层应答查询。</li>
 * </ul>
 * 全程无需 root。</p>
 *
 * <p>注册两个服务：
 * <ul>
 *   <li>{@code _http._tcp} —— 网关 HTTP API 发现入口；</li>
 *   <li>{@code _mqtt._tcp} —— 网关 MQTT 入口。</li>
 * </ul>
 * 注意 Android 的 registerService 要求 serviceType 末尾不带点。</p>
 */
public class AdvertiserService extends Service {

    public static final String TAG = "GwMdns";

    /** 启动广播 */
    public static final String ACTION_START = "com.cloudiot.gwmdns.action.START";
    /** 停止广播 */
    public static final String ACTION_STOP = "com.cloudiot.gwmdns.action.STOP";

    /** SharedPreferences 名称 */
    public static final String PREFS = "gw_mdns_prefs";
    public static final String KEY_HTTP_PORT = "http_port";
    public static final String KEY_MQTT_PORT = "mqtt_port";
    public static final String KEY_AUTO_START = "auto_start";
    /** 可选：手动指定 gateway_id（探测 /health 失败时回退） */
    public static final String KEY_GATEWAY_ID = "gateway_id";

    public static final int DEFAULT_HTTP_PORT = 8080;
    public static final int DEFAULT_MQTT_PORT = 1883;

    /** Android NsdManager 要求类型末尾不带点 */
    private static final String SERVICE_TYPE_HTTP = "_http._tcp";
    private static final String SERVICE_TYPE_MQTT = "_mqtt._tcp";

    private static final String CHANNEL_ID = "gw_mdns_channel";
    private static final String CHANNEL_NAME = "网关广播";
    private static final int NOTIFICATION_ID = 1001;

    /** 注册失败简单重试次数与间隔 */
    private static final int MAX_RETRY = 3;
    private static final long RETRY_DELAY_MS = 2000L;

    /** 单次 /health 探测超时 */
    private static final int HEALTH_TIMEOUT_MS = 1500;

    // ------------------------------------------------------------------
    // 静态状态：供 UI 轮询读取（服务可能被系统重启，UI 无需 bind）
    // ------------------------------------------------------------------
    private static volatile boolean sRunning = false;
    private static volatile String sLastStatus = "未启动";
    private static volatile String sLocalIp = "-";
    private static volatile String sGatewayId = "-";
    private static volatile int sHttpPort = DEFAULT_HTTP_PORT;
    private static volatile int sMqttPort = DEFAULT_MQTT_PORT;

    private static final List<String> sRegisteredNames =
            Collections.synchronizedList(new ArrayList<String>());

    public static boolean isRunning() {
        return sRunning;
    }

    public static String getLastStatus() {
        return sLastStatus;
    }

    public static String getLocalIp() {
        return sLocalIp;
    }

    public static String getGatewayId() {
        return sGatewayId;
    }

    public static int getHttpPort() {
        return sHttpPort;
    }

    public static int getMqttPort() {
        return sMqttPort;
    }

    /** 已注册服务名快照（形如 "IoT Gateway (gw-1)  (_http._tcp :8080)"） */
    public static List<String> getRegisteredNames() {
        synchronized (sRegisteredNames) {
            return new ArrayList<>(sRegisteredNames);
        }
    }

    /** 便捷启动入口（前台服务） */
    public static void start(Context context) {
        try {
            Intent intent = new Intent(context, AdvertiserService.class).setAction(ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Throwable t) {
            Log.e(TAG, "启动 AdvertiserService 失败", t);
        }
    }

    /** 便捷停止入口 */
    public static void stop(Context context) {
        try {
            Intent intent = new Intent(context, AdvertiserService.class).setAction(ACTION_STOP);
            context.startService(intent);
        } catch (Throwable t) {
            Log.e(TAG, "停止 AdvertiserService 失败", t);
        }
    }

    // ------------------------------------------------------------------
    // 实例状态
    // ------------------------------------------------------------------
    private NsdManager nsdManager;
    private WifiManager.MulticastLock multicastLock;
    private Handler handler;
    private SharedPreferences prefs;

    /** 每次 registerService 调用都需要独立 listener，注销时逐个使用 */
    private final List<NsdManager.RegistrationListener> listeners = new ArrayList<>();
    /** 注册重试计数：index 0 = HTTP，index 1 = MQTT */
    private final int[] retryCount = new int[]{0, 0};

    private NsdServiceInfo httpInfo;
    private NsdServiceInfo mqttInfo;
    private String androidHostname = "android";

    // ------------------------------------------------------------------
    // 生命周期
    // ------------------------------------------------------------------

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "onCreate");
        handler = new Handler(Looper.getMainLooper());
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        createNotificationChannel();
        try {
            nsdManager = (NsdManager) getApplicationContext().getSystemService(Context.NSD_SERVICE);
        } catch (Throwable t) {
            Log.e(TAG, "获取 NsdManager 失败", t);
        }
        if (nsdManager == null) {
            Log.e(TAG, "NsdManager 不可用（null）");
            setStatus("NsdManager 不可用");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        Log.i(TAG, "onStartCommand action=" + action + " startId=" + startId);

        // 必须立刻进入前台，避免 Android 抛 ForegroundServiceDidNotStartInTimeException
        startForegroundSafe();

        if (ACTION_STOP.equals(action)) {
            stopAdvertising();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (sRunning) {
            setStatus("广播运行中");
            return START_STICKY;
        }

        sRunning = true;
        sRegisteredNames.clear();
        retryCount[0] = 0;
        retryCount[1] = 0;

        // 采集 IP / gateway_id 涉及网络请求，放到后台线程
        try {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    startAdvertising();
                }
            }, "gw-mdns-start").start();
        } catch (Throwable t) {
            Log.e(TAG, "启动广播线程失败", t);
            setStatus("启动失败: " + t.getMessage());
            sRunning = false;
        }

        // 被系统杀掉后自动重建
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "onDestroy");
        stopAdvertising();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ------------------------------------------------------------------
    // 启动流程
    // ------------------------------------------------------------------

    /** 后台线程：取 IP、gateway_id、端口，再回主线程注册 */
    private void startAdvertising() {
        try {
            setStatus("正在启动…");

            // 1) 关键：先拿组播锁（设备级解除组播过滤，系统 mdnsresponder 才能收包）
            acquireMulticastLock();

            // 2) 本机 wlan0 IPv4
            String ip = resolveLocalIpv4();
            sLocalIp = ip;

            // 3) 端口
            int httpPort = readPort(KEY_HTTP_PORT, DEFAULT_HTTP_PORT);
            int mqttPort = readPort(KEY_MQTT_PORT, DEFAULT_MQTT_PORT);
            sHttpPort = httpPort;
            sMqttPort = mqttPort;

            // 4) 主机名
            androidHostname = resolveAndroidHostname();

            // 5) gateway_id：/health -> SharedPreferences -> gateway-<hostname>
            String gatewayId = resolveGatewayId(httpPort);
            sGatewayId = gatewayId;

            Log.i(TAG, "广播参数: ip=" + ip + " gatewayId=" + gatewayId
                    + " httpPort=" + httpPort + " mqttPort=" + mqttPort
                    + " hostname=" + androidHostname);

            // 6) 构建服务信息并回主线程注册（注册回调走主线程更直观）
            httpInfo = buildHttpInfo(gatewayId, ip, httpPort, mqttPort);
            mqttInfo = buildMqttInfo(gatewayId, ip, mqttPort);

            handler.post(new Runnable() {
                @Override
                public void run() {
                    if (!sRunning) {
                        return;
                    }
                    registerService(0, httpInfo, SERVICE_TYPE_HTTP);
                    registerService(1, mqttInfo, SERVICE_TYPE_MQTT);
                }
            });
        } catch (Throwable t) {
            Log.e(TAG, "启动广播失败", t);
            setStatus("启动失败: " + t.getMessage());
        }
    }

    /** 构建 HTTP 服务信息（服务 A） */
    private NsdServiceInfo buildHttpInfo(String gatewayId, String ip, int httpPort, int mqttPort) {
        NsdServiceInfo info = new NsdServiceInfo();
        info.setServiceName("IoT Gateway (" + gatewayId + ")");
        info.setServiceType(SERVICE_TYPE_HTTP);
        info.setPort(httpPort);

        // NsdServiceInfo.setAttribute 只接受 (String, String)，框架内部转 UTF-8 bytes
        Map<String, String> attrs = new LinkedHashMap<>();
        attrs.put("type", "iot-gateway");
        attrs.put("version", "1.0");
        attrs.put("gateway_id", gatewayId);
        attrs.put("hostname", androidHostname);
        attrs.put("api", "/api/v1");
        attrs.put("proto", "http");
        attrs.put("port", String.valueOf(httpPort));
        attrs.put("path", "/");
        attrs.put("mqtt_port", String.valueOf(mqttPort));
        attrs.put("mqtt_url", "mqtt://" + ip + ":" + mqttPort);
        for (Map.Entry<String, String> e : attrs.entrySet()) {
            info.setAttribute(e.getKey(), e.getValue());
        }
        return info;
    }

    /** 构建 MQTT 服务信息（服务 B） */
    private NsdServiceInfo buildMqttInfo(String gatewayId, String ip, int mqttPort) {
        NsdServiceInfo info = new NsdServiceInfo();
        info.setServiceName("IoT Gateway MQTT (" + gatewayId + ")");
        info.setServiceType(SERVICE_TYPE_MQTT);
        info.setPort(mqttPort);

        Map<String, String> attrs = new LinkedHashMap<>();
        attrs.put("type", "iot-gateway");
        attrs.put("version", "1.0");
        attrs.put("gateway_id", gatewayId);
        attrs.put("proto", "mqtt");
        attrs.put("port", String.valueOf(mqttPort));
        attrs.put("url", "mqtt://" + ip + ":" + mqttPort);
        attrs.put("transport", "tcp");
        attrs.put("hostname", androidHostname);
        for (Map.Entry<String, String> e : attrs.entrySet()) {
            info.setAttribute(e.getKey(), e.getValue());
        }
        return info;
    }

    // ------------------------------------------------------------------
    // NsdManager 注册 / 注销 / 重试
    // ------------------------------------------------------------------

    /**
     * 注册单个服务。每次调用都新建 listener（失败后旧 listener 不可复用）。
     *
     * @param which 0 = HTTP，1 = MQTT
     */
    private void registerService(final int which, final NsdServiceInfo info, final String type) {
        if (!sRunning) {
            return;
        }
        if (nsdManager == null) {
            setStatus("NsdManager 不可用，无法注册");
            return;
        }
        if (info == null) {
            setStatus("服务信息为空，无法注册");
            return;
        }

        NsdManager.RegistrationListener listener = new NsdManager.RegistrationListener() {
            @Override
            public void onServiceRegistered(NsdServiceInfo registered) {
                String name = (registered != null && registered.getServiceName() != null)
                        ? registered.getServiceName()
                        : info.getServiceName();
                Log.i(TAG, "注册成功: name=" + name + " type=" + type);
                // 重试成功后清零计数
                retryCount[which] = 0;
                addRegisteredName(name + "  (" + type + " :" + info.getPort() + ")");
                setStatus("广播运行中");
            }

            @Override
            public void onRegistrationFailed(NsdServiceInfo failed, int errorCode) {
                Log.e(TAG, "注册失败: type=" + type + " errorCode=" + errorCode);
                setStatus("注册失败(" + type + ") code=" + errorCode + "，重试中…");
                scheduleRetry(which, type);
            }

            @Override
            public void onServiceUnregistered(NsdServiceInfo unregistered) {
                Log.i(TAG, "已注销: type=" + type);
            }

            @Override
            public void onUnregistrationFailed(NsdServiceInfo failed, int errorCode) {
                Log.e(TAG, "注销失败: type=" + type + " errorCode=" + errorCode);
            }
        };

        synchronized (listeners) {
            listeners.add(listener);
        }

        try {
            nsdManager.registerService(info, NsdManager.PROTOCOL_DNS_SD, listener);
            Log.i(TAG, "调用 registerService: name=" + info.getServiceName()
                    + " type=" + type + " port=" + info.getPort());
        } catch (Throwable t) {
            // Android 对 serviceType 格式/状态很敏感，任何异常都不能让服务崩溃
            Log.e(TAG, "registerService 抛异常: type=" + type, t);
            setStatus("注册异常(" + type + "): " + t.getMessage());
            scheduleRetry(which, type);
        }
    }

    /** 注册失败后最多重试 MAX_RETRY 次，间隔 2s */
    private void scheduleRetry(final int which, final String type) {
        if (!sRunning) {
            return;
        }
        int used = retryCount[which];
        if (used >= MAX_RETRY) {
            Log.w(TAG, "注册失败已达上限: type=" + type);
            setStatus("注册失败(" + type + ") 已达最大重试次数");
            return;
        }
        retryCount[which] = used + 1;
        final int attempt = used + 1;
        Log.w(TAG, "计划重试: type=" + type + " attempt=" + attempt);
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!sRunning) {
                    return;
                }
                Log.i(TAG, "执行重试: type=" + type + " attempt=" + attempt);
                if (which == 0) {
                    registerService(0, httpInfo, SERVICE_TYPE_HTTP);
                } else {
                    registerService(1, mqttInfo, SERVICE_TYPE_MQTT);
                }
            }
        }, RETRY_DELAY_MS);
    }

    /** 停止广播：注销服务、释放组播锁、清理状态 */
    private void stopAdvertising() {
        Log.i(TAG, "stopAdvertising");
        sRunning = false;

        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }

        List<NsdManager.RegistrationListener> snapshot;
        synchronized (listeners) {
            snapshot = new ArrayList<>(listeners);
            listeners.clear();
        }
        if (nsdManager != null) {
            for (NsdManager.RegistrationListener listener : snapshot) {
                try {
                    nsdManager.unregisterService(listener);
                    Log.i(TAG, "已调用 unregisterService");
                } catch (Throwable t) {
                    Log.w(TAG, "unregisterService 失败", t);
                }
            }
        }

        releaseMulticastLock();
        synchronized (sRegisteredNames) {
            sRegisteredNames.clear();
        }
        setStatus("已停止");
        stopForegroundCompat();
    }

    // ------------------------------------------------------------------
    // MulticastLock（本方案关键，不能省）
    // ------------------------------------------------------------------

    private void acquireMulticastLock() {
        try {
            if (multicastLock != null && multicastLock.isHeld()) {
                return;
            }
            WifiManager wifiManager = (WifiManager) getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wifiManager == null) {
                Log.w(TAG, "WifiManager 不可用，无法获取 MulticastLock");
                return;
            }
            WifiManager.MulticastLock lock = wifiManager.createMulticastLock("cloudiot-gw-mdns");
            lock.setReferenceCounted(false);
            lock.acquire();
            multicastLock = lock;
            Log.i(TAG, "MulticastLock 已获取: held=" + lock.isHeld());
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
                Log.i(TAG, "MulticastLock 已释放");
            }
        } catch (Throwable t) {
            Log.e(TAG, "释放 MulticastLock 失败", t);
        }
    }

    // ------------------------------------------------------------------
    // 参数探测
    // ------------------------------------------------------------------

    /** 取本机 wlan0 IPv4；跳过 loopback/link-local，优先 wlan*。取不到回退 127.0.0.1 */
    private String resolveLocalIpv4() {
        String fallback = null;
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces != null && interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (!ni.isUp() || ni.isLoopback()) {
                    continue;
                }
                boolean isWlan = ni.getName() != null && ni.getName().startsWith("wlan");
                Enumeration<InetAddress> addrs = ni.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress addr = addrs.nextElement();
                    if (addr instanceof Inet4Address
                            && !addr.isLoopbackAddress()
                            && !addr.isLinkLocalAddress()) {
                        String ip = addr.getHostAddress();
                        Log.i(TAG, "候选 IPv4: " + ni.getName() + " -> " + ip);
                        if (isWlan) {
                            return ip;
                        }
                        if (fallback == null) {
                            fallback = ip;
                        }
                    }
                }
            }
        } catch (Throwable t) {
            Log.e(TAG, "枚举 IPv4 失败", t);
        }
        return fallback != null ? fallback : "127.0.0.1";
    }

    private int readPort(String key, int def) {
        try {
            int v = prefs.getInt(key, def);
            return (v > 0 && v <= 65535) ? v : def;
        } catch (Throwable t) {
            return def;
        }
    }

    /** gateway_id：/health -> SharedPreferences -> "gateway-<hostname>" */
    private String resolveGatewayId(int httpPort) {
        String fromHealth = fetchGatewayIdFromHealth(httpPort);
        if (fromHealth != null && !fromHealth.isEmpty()) {
            Log.i(TAG, "gateway_id 来自 /health: " + fromHealth);
            return fromHealth;
        }
        String configured = prefs.getString(KEY_GATEWAY_ID, "");
        if (configured != null && !configured.isEmpty()) {
            Log.i(TAG, "gateway_id 来自偏好设置: " + configured);
            return configured;
        }
        String fallback = "gateway-" + resolveAndroidHostname();
        Log.i(TAG, "gateway_id 回退默认: " + fallback);
        return fallback;
    }

    /** GET http://127.0.0.1:&lt;port&gt;/health，解析 JSON 的 gateway_id 字段 */
    private String fetchGatewayIdFromHealth(int httpPort) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL("http://127.0.0.1:" + httpPort + "/health");
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(HEALTH_TIMEOUT_MS);
            conn.setReadTimeout(HEALTH_TIMEOUT_MS);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                Log.w(TAG, "/health 返回非 200: " + code);
                return null;
            }
            StringBuilder sb = new StringBuilder();
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();
            String body = sb.toString();
            Log.i(TAG, "/health 响应: " + body);
            JSONObject json = new JSONObject(body);
            String id = json.optString("gateway_id", "");
            return id.isEmpty() ? null : id;
        } catch (Throwable t) {
            Log.w(TAG, "/health 探测失败: " + t.getMessage());
            return null;
        } finally {
            if (conn != null) {
                try {
                    conn.disconnect();
                } catch (Throwable ignored) {
                    // 忽略
                }
            }
        }
    }

    /** Android 主机名（用于 TXT hostname），基于 Build.MODEL 做安全化处理 */
    private String resolveAndroidHostname() {
        try {
            String model = Build.MODEL;
            if (model == null || model.trim().isEmpty()) {
                return "android";
            }
            String safe = model.trim().toLowerCase(Locale.US).replaceAll("[^a-z0-9-]", "-");
            safe = safe.replaceAll("-+", "-");
            while (safe.startsWith("-")) {
                safe = safe.substring(1);
            }
            while (safe.endsWith("-")) {
                safe = safe.substring(0, safe.length() - 1);
            }
            return safe.isEmpty() ? "android" : safe;
        } catch (Throwable t) {
            return "android";
        }
    }

    // ------------------------------------------------------------------
    // 通知 / 状态
    // ------------------------------------------------------------------

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) {
                return;
            }
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("网关 mDNS 广播常驻通知");
            nm.createNotificationChannel(channel);
        } catch (Throwable t) {
            Log.e(TAG, "创建通知渠道失败", t);
        }
    }

    private Notification buildNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent, piFlags);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("网关 mDNS 广播")
                .setContentText("正在广播 _http._tcp / _mqtt._tcp 服务")
                .setSmallIcon(R.drawable.ic_stat_mdns)
                .setContentIntent(pi)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    /** 进入前台；任何异常都记录但不崩溃 */
    private void startForegroundSafe() {
        try {
            startForeground(NOTIFICATION_ID, buildNotification());
            Log.i(TAG, "已进入前台服务");
        } catch (Throwable t) {
            Log.e(TAG, "startForeground 失败", t);
            setStatus("前台服务启动失败: " + t.getMessage());
        }
    }

    private void stopForegroundCompat() {
        try {
            stopForeground(true);
        } catch (Throwable t) {
            Log.w(TAG, "stopForeground 失败", t);
        }
    }

    private void addRegisteredName(String name) {
        synchronized (sRegisteredNames) {
            if (!sRegisteredNames.contains(name)) {
                sRegisteredNames.add(name);
            }
        }
    }

    private void setStatus(String status) {
        sLastStatus = status;
        Log.i(TAG, "状态更新: " + status);
    }
}
