package com.smartfinance

import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class NotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "NotificationModule"
        private var eventEmitterContext: ReactApplicationContext? = null

        fun sendEvent(eventName: String, params: WritableMap?) {
            eventEmitterContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        }
    }

    init {
        eventEmitterContext = reactContext
    }

    override fun getName(): String {
        return MODULE_NAME
    }

    @ReactMethod
    fun isNotificationPermissionGranted(promise: Promise) {
        try {
            val packageName = reactContext.packageName
            val packagesWithAccess = NotificationManagerCompat.getEnabledListenerPackages(reactContext)
            promise.resolve(packagesWithAccess.contains(packageName))
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestNotificationPermission() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(intent)
    }

    @ReactMethod
    fun getStoredTransactions(promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val transactions = db.getAllTransactions()
            promise.resolve(transactions)
        } catch (e: Exception) {
            promise.reject("DB_READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun saveManualTransaction(txMap: ReadableMap, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val timestamp = txMap.getDouble("timestamp").toLong()
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            val dateFormat = SimpleDateFormat("dd 'de' MMMM 'de' yyyy", Locale.getDefault())
            val dateObj = Date(timestamp)

            val success = db.insertTransaction(
                id = txMap.getString("id") ?: "${timestamp}",
                title = txMap.getString("title") ?: "Lançamento",
                amount = txMap.getDouble("amount"),
                type = txMap.getString("type") ?: "EXPENSE",
                category = txMap.getString("category") ?: "others",
                bankName = txMap.getString("bankName") ?: "Manual",
                note = if (txMap.hasKey("note")) txMap.getString("note") else "",
                timestamp = timestamp,
                timeFormatted = timeFormat.format(dateObj),
                dateFormatted = dateFormat.format(dateObj)
            )
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("DB_WRITE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun deleteTransaction(id: String, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val success = db.deleteTransaction(id)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("DB_DELETE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String?) {}

    @ReactMethod
    fun removeListeners(count: Int?) {}
}