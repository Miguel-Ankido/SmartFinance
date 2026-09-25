package com.smartfinance

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class NotificationService : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationService"
        private val TARGET_PACKAGES = setOf(
            "com.nu.production",  // Nubank
            "com.picpay",         // PicPay
            "com.android.shell"   // Testes e simulações via ADB
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)

        if (sbn == null) return

        val packageName = sbn.packageName ?: ""

        if (!TARGET_PACKAGES.contains(packageName)) {
            return
        }

        val extras = sbn.notification?.extras ?: return
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val fullContent = if (bigText.isNotBlank()) bigText else text
        val postTime = sbn.postTime

        Log.d(TAG, "Notificação interceptada de $packageName: $title | $fullContent")

        // 1. Extração e sanitização de dados no lado nativo
        var amount = 0.0
        val regexAmount = Regex("""R\$\s?([\d.,]+)""", RegexOption.IGNORE_CASE)
        val match = regexAmount.find(fullContent)
        if (match != null && match.groupValues.size > 1) {
            val sanitized = match.groupValues[1].replace(".", "").replace(",", ".")
            amount = sanitized.toDoubleOrNull() ?: 0.0
        }

        val isExpense = !Regex("""recebeu|transfer[eê]ncia recebida|dep[oó]sito""", RegexOption.IGNORE_CASE).containsMatchIn(fullContent)
        val type = if (isExpense) "EXPENSE" else "INCOME"

        var merchantTitle = if (isExpense) "Compra no Cartão" else "Pix Recebido"
        val merchantMatch = Regex("""\b(?:em|no|na|para)\s+([A-Za-z0-9À-ÿ\s&'-]+?)(?:\s+(?:aprovada|confirmada|no valor|com sucesso|\d)|$|\.)""", RegexOption.IGNORE_CASE).find(fullContent)
        if (merchantMatch != null && merchantMatch.groupValues.size > 1) {
            merchantTitle = merchantMatch.groupValues[1].trim()
        } else if (title.isNotBlank() && !Regex("""nubank|picpay|shell|banco""", RegexOption.IGNORE_CASE).containsMatchIn(title)) {
            merchantTitle = title
        }

        val rawLower = fullContent.lowercase(Locale.ROOT)
        val detectedBank = when {
            packageName.contains("nu.production") || rawLower.contains("nubank") -> "Nubank"
            packageName.contains("picpay") || rawLower.contains("picpay") -> "PicPay"
            rawLower.contains("inter") -> "Inter"
            rawLower.contains("itau") || rawLower.contains("itaú") -> "Itaú"
            rawLower.contains("bradesco") -> "Bradesco"
            else -> "Outro Banco"
        }

        val category = when {
            Regex("""uber|99|posto|combustivel|estacionamento""", RegexOption.IGNORE_CASE).containsMatchIn(fullContent) -> "transport"
            Regex("""mercado|restaurante|delivery|ifood|starbucks|burger|padaria""", RegexOption.IGNORE_CASE).containsMatchIn(fullContent) -> "food"
            Regex("""netflix|cinema|spotify|jogos|steam""", RegexOption.IGNORE_CASE).containsMatchIn(fullContent) -> "entertainment"
            Regex("""luz|energia|agua|fatura|boleto|condominio""", RegexOption.IGNORE_CASE).containsMatchIn(fullContent) -> "bills"
            Regex("""loja|shopping|compra|amazon|mercado livre""", RegexOption.IGNORE_CASE).containsMatchIn(fullContent) -> "shopping"
            else -> "others"
        }

        val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
        val dateFormat = SimpleDateFormat("dd 'de' MMMM 'de' yyyy", Locale.getDefault())
        val dateObj = Date(postTime)
        val timeFormatted = timeFormat.format(dateObj)
        val dateFormatted = dateFormat.format(dateObj)
        val id = "${postTime}_${(1000..9999).random()}"

        // 2. Persistência imediata no SQLite nativo (mesmo com app fechado)
        try {
            val db = AppDatabaseHelper(applicationContext)
            db.insertTransaction(
                id = id,
                title = merchantTitle,
                amount = amount,
                type = type,
                category = category,
                bankName = detectedBank,
                note = fullContent,
                timestamp = postTime,
                timeFormatted = timeFormatted,
                dateFormatted = dateFormatted
            )
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao gravar no SQLite: ${e.message}")
        }

        // 3. Emissão para a interface React Native (se o app estiver em execução)
        val params: WritableMap = Arguments.createMap().apply {
            putString("id", id)
            putString("packageName", packageName)
            putString("title", merchantTitle)
            putString("text", fullContent)
            putDouble("amount", amount)
            putString("type", type)
            putString("category", category)
            putString("bankName", detectedBank)
            putDouble("timestamp", postTime.toDouble())
            putString("timeFormatted", timeFormatted)
            putString("dateFormatted", dateFormatted)
        }

        NotificationModule.sendEvent("onBankNotificationReceived", params)
    }
}