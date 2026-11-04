package com.smartfinance

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class NotificationService : NotificationListenerService() {

    companion object {
        // Whitelist estrita de pacotes bancários suportados
        private val ALLOWED_BANK_PACKAGES = setOf(
            "com.nu.production",       // Nubank
            "com.picpay",              // PicPay
            "br.com.intermedium",      // Banco Inter
            "com.itau",                // Itaú
            "br.com.bb.android",       // Banco do Brasil
            "br.com.santander.usuario" // Santander
        )

        // Blacklist de termos de segurança (2FA / Senhas / Tokens)
        private val SECURITY_BLACKLIST = listOf(
            "código", "codigo", "token", "senha", "verificação",
            "verificacao", "segurança", "seguranca", "chave de segurança"
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        var packageName = sbn.packageName ?: return

        // MODO TESTE/DEBUG: Permite que o comando adb shell use a tag para simular o banco
        if (BuildConfig.DEBUG && packageName == "com.android.shell" && sbn.tag != null) {
            packageName = sbn.tag
        }

        // 1. Filtro estrito: Whitelist de pacotes bancários
        if (!ALLOWED_BANK_PACKAGES.contains(packageName)) {
            return
        }

        // 2. Respeita a preferência do utilizador nos Bancos Monitorados (SQLite)
        try {
            val db = AppDatabaseHelper.getInstance(applicationContext)
            if (!db.isPackageMonitored(null, packageName)) {
                return
            }
        } catch (_: Exception) {
            // Segue fluxo padrão caso o banco ainda não esteja inicializado
        }

        val extras = sbn.notification?.extras ?: return
        val rawTitle = extras.getString("android.title") ?: ""
        val rawText = extras.getCharSequence("android.bigText")?.toString()
            ?: extras.getCharSequence("android.text")?.toString()
            ?: ""

        val combinedContent = "$rawTitle $rawText".lowercase()

        // 3. Blacklist de segurança (2FA, códigos, senhas)
        if (SECURITY_BLACKLIST.any { combinedContent.contains(it) }) {
            return
        }

        // 4. Despacha para o JavaScript
        NotificationModule.sendEventToJS(packageName, rawTitle, rawText, sbn.postTime)
    }
}
