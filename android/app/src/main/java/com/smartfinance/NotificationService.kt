package com.smartfinance

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class NotificationService : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationService"

        // Lista de pacotes padrão autorizados para evitar perda de notificações
        // enquanto o JavaScript do React Native inicializa
        val DEFAULT_PACKAGES = setOf(
            "com.nu.production",       // Nubank
            "com.picpay",              // PicPay
            "br.com.intermedium",      // Banco Inter
            "com.itau",                // Itaú
            "br.com.bb.android",       // Banco do Brasil
            "br.com.santander.usuario",// Santander
            "com.android.shell"        // Emulador ADB Shell (Debug/Admin)
        )

        // Conjunto de pacotes autorizados dinamicamente pelo frontend
        @Volatile
        var activePackages: Set<String> = DEFAULT_PACKAGES

        // Blacklist de termos de segurança (2FA / Senhas / Tokens)
        private val SECURITY_BLACKLIST = listOf(
            "código", "codigo", "token", "senha", "verificação",
            "verificacao", "segurança", "seguranca", "chave de segurança"
        )

        // Blacklist de promoções, ofertas e propagandas bancárias
        private val PROMOTIONAL_BLACKLIST = listOf(
            "promoção", "promocao", "oferta", "ofertas", "desconto", "descontos",
            "cashback", "de volta", "cupom", "cupons", "aproveite", "aproveitar",
            "garanta", "imperdível", "imperdivel", "empréstimo", "emprestimo",
            "pré-aprovado", "pre-aprovado", "pré aprovado", "pre aprovado",
            "limite extra", "aumento de limite", "aumente seu limite", "rendimento",
            "rendeu", "investimento", "investimentos", "cdi", "cripto", "nucoin",
            "bônus", "bonus", "sorteio", "sorteios", "prêmio", "premio",
            "indique e ganhe", "indique um amigo", "convide amigos", "seguro celular",
            "seguro de vida", "fatura fechada", "fatura do seu cartão fechou",
            "fatura do seu cartao fechou", "fatura fechou", "fatura disponível",
            "fatura disponivel", "sua fatura vence", "lembrete de fatura",
            "novidade no app", "conheça as vantagens", "conheca as vantagens",
            "compre com desconto", "renegocie sua dívida", "renegocie sua divida"
        )
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "NotificationService conectado e ativo. Pacotes autorizados: $activePackages")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val originalPackageName = sbn.packageName ?: return
        var packageName = originalPackageName

        val extras = sbn.notification?.extras
        val rawTitle = extras?.getString("android.title") ?: ""
        val rawText = extras?.getCharSequence("android.bigText")?.toString()
            ?: extras?.getCharSequence("android.text")?.toString()
            ?: ""

        Log.d(TAG, "Notificação interceptada: pkg=$originalPackageName, tag=${sbn.tag}, title=$rawTitle, text=$rawText")

        // MODO TESTE/DEBUG: Permite que comandos adb shell simulem alertas bancários
        if (BuildConfig.DEBUG && packageName == "com.android.shell") {
            val tagLower = sbn.tag?.lowercase() ?: ""
            val titleLower = rawTitle.lowercase()
            val textLower = rawText.lowercase()

            packageName = when {
                tagLower.contains("picpay") || titleLower.contains("picpay") || textLower.contains("picpay") -> "com.picpay"
                tagLower.contains("nu") || titleLower.contains("nubank") || textLower.contains("nubank") -> "com.nu.production"
                tagLower.contains("inter") || titleLower.contains("inter") || textLower.contains("inter") -> "br.com.intermedium"
                tagLower.contains("itau") || titleLower.contains("itau") || titleLower.contains("itaú") -> "com.itau"
                tagLower.contains("bb") || titleLower.contains("banco do brasil") -> "br.com.bb.android"
                tagLower.contains("santander") || titleLower.contains("santander") -> "br.com.santander.usuario"
                sbn.tag != null && sbn.tag.isNotBlank() -> sbn.tag
                else -> originalPackageName
            }
            Log.d(TAG, "ADB Shell detectado. Pacote mapeado para: $packageName")
        }

        // 1. Filtro dinâmico: Verifica se o pacote está autorizado pelo frontend
        val currentActive = activePackages
        val isAllowed = currentActive.contains(packageName) ||
                        currentActive.contains(originalPackageName) ||
                        (BuildConfig.DEBUG && originalPackageName == "com.android.shell") ||
                        (originalPackageName == "com.android.shell" && currentActive.contains("com.android.shell"))

        if (!isAllowed) {
            Log.d(TAG, "Notificação descartada: pacote $packageName ($originalPackageName) não está em activePackages: $currentActive")
            return
        }

        val combinedContent = "$rawTitle $rawText".lowercase()

        // 2. Blacklist de segurança (2FA, códigos, senhas)
        if (SECURITY_BLACKLIST.any { combinedContent.contains(it) }) {
            Log.d(TAG, "Notificação descartada: conteúdo contém termo de segurança")
            return
        }

        // 3. Blacklist de promoções, ofertas e propagandas bancárias
        if (PROMOTIONAL_BLACKLIST.any { combinedContent.contains(it) }) {
            Log.d(TAG, "Notificação descartada: notificação promocional/oferta bancária detectada ($combinedContent)")
            return
        }

        // 4. Despacha para o JavaScript
        Log.i(TAG, "Despachando notificação para o JS: pkg=$packageName, title=$rawTitle, text=$rawText")
        NotificationModule.sendEventToJS(packageName, rawTitle, rawText, sbn.postTime)
    }
}
