package com.smartfinance

import android.content.ContentValues
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
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
    fun getStoredTransactions(userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val transactions = db.getTransactionsForUser(userId)
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
            val userId = if (txMap.hasKey("userId")) txMap.getString("userId") else null

            val success = db.insertTransaction(
                id = txMap.getString("id") ?: "$timestamp",
                userId = userId,
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
    fun deleteTransaction(id: String, userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val success = db.deleteTransaction(id, userId)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("DB_DELETE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getStoredBudgets(userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val budgets = db.getBudgetsForUser(userId)
            promise.resolve(budgets)
        } catch (e: Exception) {
            promise.reject("BUDGET_READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun saveCategoryBudget(categoryId: String, limitAmount: Double, userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val success = db.saveBudget(userId, categoryId, limitAmount)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("BUDGET_WRITE_ERROR", e.message)
        }
    }

    // --- MONITORED BANKS ---
    @ReactMethod
    fun getMonitoredBanks(userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val banks = db.getMonitoredBanks(userId)
            promise.resolve(banks)
        } catch (e: Exception) {
            promise.reject("BANKS_READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setBankEnabled(bankId: String, isEnabled: Boolean, userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val success = db.setBankEnabled(userId, bankId, isEnabled)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("BANKS_WRITE_ERROR", e.message)
        }
    }

    // --- CSV EXPORT TO DOWNLOADS ---
    @ReactMethod
    fun saveCsvToDownloads(fileName: String, csvContent: String, promise: Promise) {
        try {
            val resolver = reactContext.contentResolver
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, "text/csv")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SmartFinance")
                }
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { os ->
                        os.write(csvContent.toByteArray(Charsets.UTF_8))
                    }
                    promise.resolve("Downloads/SmartFinance/$fileName")
                } else {
                    promise.reject("SAVE_FAILED", "Não foi possível criar o arquivo em Downloads.")
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val targetDir = File(downloadsDir, "SmartFinance")
                if (!targetDir.exists()) {
                    targetDir.mkdirs()
                }
                val file = File(targetDir, fileName)
                FileOutputStream(file).use { fos ->
                    fos.write(csvContent.toByteArray(Charsets.UTF_8))
                }
                promise.resolve("Downloads/SmartFinance/$fileName")
            }
        } catch (e: Exception) {
            promise.reject("EXPORT_ERROR", e.message)
        }
    }

    // --- AUTH METHODS ---
    @ReactMethod
    fun registerUser(name: String, email: String, password: String, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val id = "usr_${System.currentTimeMillis()}_${(1000..9999).random()}"
            val success = db.registerUser(id, name, email, password)
            if (success) {
                val user = db.getActiveUser()
                promise.resolve(user)
            } else {
                promise.reject("REGISTER_FAILED", "Este e-mail já está cadastrado no aplicativo.")
            }
        } catch (e: Exception) {
            promise.reject("REGISTER_ERROR", e.message)
        }
    }

    @ReactMethod
    fun loginUser(email: String, password: String, promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val user = db.loginUser(email, password)
            if (user != null) {
                promise.resolve(user)
            } else {
                promise.reject("AUTH_FAILED", "E-mail ou senha incorretos.")
            }
        } catch (e: Exception) {
            promise.reject("LOGIN_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getActiveUser(promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            val user = db.getActiveUser()
            promise.resolve(user)
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun logoutUser(promise: Promise) {
        try {
            val db = AppDatabaseHelper(reactContext)
            db.clearSession()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("LOGOUT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String?) {}

    @ReactMethod
    fun removeListeners(count: Int?) {}
}