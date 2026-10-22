package com.workeric08.sprint;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins próprios precisam ser registrados antes do super.onCreate.
        registerPlugin(SystemBarColorsPlugin.class);
        super.onCreate(savedInstanceState);
        // Cor das barras já na primeira imagem (a última escolhida, antes de o JavaScript rodar).
        SystemBarColorsPlugin.applySaved(this);
    }
}
