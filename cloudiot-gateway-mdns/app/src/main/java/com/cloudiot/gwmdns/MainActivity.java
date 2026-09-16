package com.cloudiot.gwmdns;

import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.List;

/**
 * 极简状态页：显示广播状态并控制 AdvertiserService。
 *
 * <p>跨进程状态通过 {@link AdvertiserService} 的静态方法读取，
 * 每秒轮询刷新，避免引入 Service 绑定复杂度。</p>
 */
public class MainActivity extends AppCompatActivity {

    private static final int REQ_POST_NOTIFICATIONS = 2001;
    private static final long REFRESH_INTERVAL_MS = 1000L;

    private TextView tvStatus;
    private TextView tvIp;
    private TextView tvGatewayId;
    private TextView tvServices;
    private Button btnToggle;
    private EditText etHttpPort;
    private EditText etMqttPort;
    private Switch swAutoStart;

    private SharedPreferences prefs;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean refreshing = false;

    private final Runnable refreshTask = new Runnable() {
        @Override
        public void run() {
            refreshUi();
            if (refreshing) {
                handler.postDelayed(this, REFRESH_INTERVAL_MS);
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(AdvertiserService.PREFS, MODE_PRIVATE);

        tvStatus = findViewById(R.id.tv_status);
        tvIp = findViewById(R.id.tv_ip);
        tvGatewayId = findViewById(R.id.tv_gateway_id);
        tvServices = findViewById(R.id.tv_services);
        btnToggle = findViewById(R.id.btn_toggle);
        etHttpPort = findViewById(R.id.et_http_port);
        etMqttPort = findViewById(R.id.et_mqtt_port);
        swAutoStart = findViewById(R.id.sw_auto_start);

        etHttpPort.setInputType(InputType.TYPE_CLASS_NUMBER);
        etMqttPort.setInputType(InputType.TYPE_CLASS_NUMBER);

        etHttpPort.setText(String.valueOf(prefs.getInt(
                AdvertiserService.KEY_HTTP_PORT, AdvertiserService.DEFAULT_HTTP_PORT)));
        etMqttPort.setText(String.valueOf(prefs.getInt(
                AdvertiserService.KEY_MQTT_PORT, AdvertiserService.DEFAULT_MQTT_PORT)));
        swAutoStart.setChecked(prefs.getBoolean(AdvertiserService.KEY_AUTO_START, true));

        btnToggle.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                onToggleClicked();
            }
        });

        swAutoStart.setOnCheckedChangeListener((buttonView, isChecked) ->
                prefs.edit().putBoolean(AdvertiserService.KEY_AUTO_START, isChecked).apply());

        requestNotificationPermissionIfNeeded();
        refreshUi();
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshing = true;
        handler.removeCallbacks(refreshTask);
        handler.post(refreshTask);
    }

    @Override
    protected void onPause() {
        super.onPause();
        refreshing = false;
        handler.removeCallbacks(refreshTask);
    }

    // ------------------------------------------------------------------
    // 交互
    // ------------------------------------------------------------------

    private void onToggleClicked() {
        if (AdvertiserService.isRunning()) {
            AdvertiserService.stop(this);
            tvStatus.setText("广播状态：正在停止…");
            return;
        }
        // 启动前先保存端口配置
        if (!savePorts()) {
            return;
        }
        AdvertiserService.start(this);
        tvStatus.setText("广播状态：正在启动…");
    }

    /** 校验并保存端口；非法时 Toast 并返回 false */
    private boolean savePorts() {
        Integer http = parsePort(etHttpPort.getText().toString());
        Integer mqtt = parsePort(etMqttPort.getText().toString());
        if (http == null || mqtt == null) {
            Toast.makeText(this, "端口必须是 1-65535 的整数", Toast.LENGTH_SHORT).show();
            return false;
        }
        prefs.edit()
                .putInt(AdvertiserService.KEY_HTTP_PORT, http)
                .putInt(AdvertiserService.KEY_MQTT_PORT, mqtt)
                .apply();
        return true;
    }

    private Integer parsePort(String raw) {
        try {
            int v = Integer.parseInt(raw.trim());
            return (v > 0 && v <= 65535) ? v : null;
        } catch (Throwable t) {
            return null;
        }
    }

    private void refreshUi() {
        boolean running = AdvertiserService.isRunning();
        tvStatus.setText("广播状态：" + (running ? "运行中" : "已停止")
                + "（" + AdvertiserService.getLastStatus() + "）");
        tvIp.setText("本机 IP：" + AdvertiserService.getLocalIp());
        tvGatewayId.setText("gateway_id：" + AdvertiserService.getGatewayId());

        List<String> names = AdvertiserService.getRegisteredNames();
        if (names.isEmpty()) {
            tvServices.setText("已注册服务：无");
        } else {
            StringBuilder sb = new StringBuilder("已注册服务：");
            for (String n : names) {
                sb.append("\n  - ").append(n);
            }
            tvServices.setText(sb.toString());
        }

        btnToggle.setText(running ? "停止广播" : "启动广播");
        btnToggle.setBackgroundColor(ContextCompat.getColor(this,
                running ? R.color.btn_stop : R.color.colorPrimary));
    }

    // ------------------------------------------------------------------
    // 运行时权限
    // ------------------------------------------------------------------

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return;
        }
        if (ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS")
                == PackageManager.PERMISSION_GRANTED) {
            return;
        }
        ActivityCompat.requestPermissions(this,
                new String[]{"android.permission.POST_NOTIFICATIONS"}, REQ_POST_NOTIFICATIONS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_POST_NOTIFICATIONS) {
            boolean granted = grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (!granted) {
                Toast.makeText(this,
                        "未授予通知权限，前台服务通知可能不可见，但广播仍可工作",
                        Toast.LENGTH_LONG).show();
            }
        }
    }
}
