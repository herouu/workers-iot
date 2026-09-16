package com.cloudiot.mobile;

import android.os.Bundle;

import com.cloudiot.mobile.plugins.LocalMdnsPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 必须在 super.onCreate 之前注册本地插件
        registerPlugin(LocalMdnsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
