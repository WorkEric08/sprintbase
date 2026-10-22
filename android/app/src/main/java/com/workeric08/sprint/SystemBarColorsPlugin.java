package com.workeric08.sprint;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.view.Window;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Pinta as barras do sistema (status e navegação/gestos) com a cor de fundo do app.
 *
 * O SystemBars do Capacitor só troca a cor dos ÍCONES das barras. O fundo que aparece atrás delas
 * é o fundo da janela, que ele refaz com o `windowBackground` do tema Android (cinza #303030 no
 * escuro) a cada `setStyle` e a cada mudança de configuração. Por isso este plugin:
 *  - é chamado pelo JavaScript DEPOIS do `setStyle`, sempre que o tema do app muda;
 *  - guarda a última cor e a reaplica ao abrir o app e quando o Capacitor refaz o fundo;
 *  - sem cor guardada (primeira abertura) segue o modo escuro/claro do aparelho.
 *
 * As cores padrão abaixo têm que ser as mesmas de utils/theme.ts (há um teste que confere).
 */
@CapacitorPlugin(name = "SystemBarColors")
public class SystemBarColorsPlugin extends Plugin {
    private static final String PREFS = "system_bar_colors";
    private static final String KEY_COLOR = "color";

    private static final int DARK = Color.parseColor("#030712");
    private static final int LIGHT = Color.parseColor("#f9fafb");

    @PluginMethod
    public void setColor(PluginCall call) {
        String hex = call.getString("color");
        if (hex == null) {
            call.reject("Informe a cor (ex.: #030712).");
            return;
        }
        final int color;
        try {
            color = Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            call.reject("Cor inválida: " + hex);
            return;
        }
        final Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            apply(activity, color);
            activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt(KEY_COLOR, color).apply();
            call.resolve();
        });
    }

    /** Aplica a cor guardada (ou a do modo escuro/claro do aparelho, se ainda não houver). */
    static void applySaved(Activity activity) {
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean night = (activity.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
            == Configuration.UI_MODE_NIGHT_YES;
        apply(activity, prefs.getInt(KEY_COLOR, night ? DARK : LIGHT));
    }

    @SuppressWarnings("deprecation")
    private static void apply(Activity activity, int color) {
        Window window = activity.getWindow();
        // Com a tela de ponta a ponta, o que se vê atrás das barras é o fundo da janela e da raiz.
        window.setBackgroundDrawable(new ColorDrawable(color));
        window.getDecorView().setBackgroundColor(color);
        // Ignoradas no Android 15+ (barras transparentes), mas valem nas versões anteriores.
        window.setStatusBarColor(color);
        window.setNavigationBarColor(color);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.setNavigationBarDividerColor(Color.TRANSPARENT); // sem a linha fina acima da barra de botões
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Sem isto o Android escurece a barra de gestos/botões por cima da nossa cor.
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
    }

    /** O Capacitor refaz o fundo nesses momentos; reaplica logo depois dele. */
    private void reapplySaved() {
        final Activity activity = getActivity();
        if (activity == null) return;
        activity.getWindow().getDecorView().post(() -> applySaved(activity));
    }

    @Override
    protected void handleOnStart() {
        super.handleOnStart();
        reapplySaved();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        reapplySaved();
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        reapplySaved();
    }
}
