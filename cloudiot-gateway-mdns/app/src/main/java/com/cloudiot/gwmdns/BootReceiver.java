package com.cloudiot.gwmdns;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

/**
 * 开机自启接收器：受 SharedPreferences 中「开机自启」开关控制。
 *
 * <p>Android 14+ 对 dataSync 前台服务从 BOOT_COMPLETED 启动有限制，
 * 目标设备为 Android 13（API 33），此处仍做 try/catch 兜底，避免崩溃。</p>
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        Log.i(AdvertiserService.TAG, "BootReceiver onReceive action=" + action);
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(
                AdvertiserService.PREFS, Context.MODE_PRIVATE);
        boolean autoStart = prefs.getBoolean(AdvertiserService.KEY_AUTO_START, true);
        if (!autoStart) {
            Log.i(AdvertiserService.TAG, "开机自启已关闭，跳过");
            return;
        }

        try {
            Intent serviceIntent = new Intent(context, AdvertiserService.class)
                    .setAction(AdvertiserService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.i(AdvertiserService.TAG, "开机自启：已请求启动广播服务");
        } catch (Throwable t) {
            Log.e(AdvertiserService.TAG, "开机自启启动服务失败", t);
        }
    }
}
