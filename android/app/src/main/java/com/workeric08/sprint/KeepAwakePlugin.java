package com.workeric08.sprint;

import android.app.Activity;
import android.view.WindowManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Mantém a tela ligada (FLAG_KEEP_SCREEN_ON) enquanto o simulado roda.
 *
 * O JavaScript chama `keepAwake` ao começar e `allowSleep` ao terminar. A flag vale só com o app na frente e a pessoa
 * continua podendo bloquear a tela pelo botão de energia. Se a Activity for recriada (rotação, mudança de tema do
 * sistema) a flag some junto com a janela, então ela é reaplicada em onResume enquanto o JavaScript ainda a quer.
 */
@CapacitorPlugin(name = "KeepAwake")
public class KeepAwakePlugin extends Plugin {
    private boolean wanted = false;

    @PluginMethod
    public void keepAwake(PluginCall call) {
        wanted = true;
        applyFlag(true);
        call.resolve();
    }

    @PluginMethod
    public void allowSleep(PluginCall call) {
        wanted = false;
        applyFlag(false);
        call.resolve();
    }

    private void applyFlag(boolean on) {
        final Activity activity = getActivity();
        if (activity == null) return;
        activity.runOnUiThread(() -> {
            if (on) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (wanted) applyFlag(true);
    }
}
