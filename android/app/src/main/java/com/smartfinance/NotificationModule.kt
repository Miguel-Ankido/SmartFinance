package com.smartfinance

import android.content.ContentValues
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class NotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "NotificationModule"
        private var eventEmitterContext: ReactApplicationContext? = null

        fun sendEvent(eventName: String, params: WritableMap?) {
            val context = eventEmitterContext
            if (context == null) {
                Log.w(MODULE_NAME, "eventEmitterContext nulo ao tentar emitir evento: $eventName")
                return
            }
            try {
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(eventName, params)
                Log.i(MODULE_NAME, "Evento emitido com sucesso para o JS: $eventName")
            } catch (e: Exception) {
                Log.e(MODULE_NAME, "Falha ao emitir evento $eventName: ${e.message}", e)
            }
        }

        fun sendEventToJS(packageName: String, title: String, text: String, postTime: Long) {
            Log.d(MODULE_NAME, "sendEventToJS chamado: pkg=$packageName, title=$title, text=$text")
            val params = Arguments.createMap().apply {
                putString("packageName", packageName)
                putString("title", title)
                putString("text", text)
                putDouble("postTime", postTime.toDouble())
            }
            sendEvent("onNotificationReceived", params)
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
            val db = AppDatabaseHelper.getInstance(reactContext)
            val transactions = db.getTransactionsForUser(userId)
            promise.resolve(transactions)
        } catch (e: Exception) {
            promise.reject("DB_READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun saveManualTransaction(txMap: ReadableMap, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val timestamp = if (txMap.hasKey("timestamp")) txMap.getDouble("timestamp").toLong() else System.currentTimeMillis()
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            val dateFormat = SimpleDateFormat("dd 'de' MMMM 'de' yyyy", Locale.getDefault())
            val dateObj = Date(timestamp)
            val userId = if (txMap.hasKey("userId")) txMap.getString("userId") else null

            val accountId = if (txMap.hasKey("accountId") && !txMap.isNull("accountId")) {
                txMap.getString("accountId")
            } else if (txMap.hasKey("account_id") && !txMap.isNull("account_id")) {
                txMap.getString("account_id")
            } else null

            val success = db.insertTransaction(
                id = txMap.getString("id") ?: UUID.randomUUID().toString(),
                userId = userId,
                title = txMap.getString("title") ?: "Lançamento",
                amount = txMap.getDouble("amount"),
                type = txMap.getString("type") ?: "EXPENSE",
                category = txMap.getString("category") ?: "others",
                bankName = txMap.getString("bankName") ?: "Manual",
                note = if (txMap.hasKey("note")) txMap.getString("note") else "",
                timestamp = timestamp,
                timeFormatted = timeFormat.format(dateObj),
                dateFormatted = dateFormat.format(dateObj),
                accountId = accountId
            )
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("DB_WRITE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun markTransactionsSynced(ids: ReadableArray, userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val success = db.markTransactionsSynced(ids, userId)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("DB_SYNC_MARK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getDatabaseHealth(userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            promise.resolve(db.getDatabaseHealth(userId))
        } catch (e: Exception) {
            promise.reject("DB_HEALTH_ERROR", e.message)
        }
    }

    @ReactMethod
    fun deleteTransaction(id: String, userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val success = db.deleteTransaction(id, userId)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("DB_DELETE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getStoredBudgets(userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val budgets = db.getBudgetsForUser(userId)
            promise.resolve(budgets)
        } catch (e: Exception) {
            promise.reject("BUDGET_READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun saveCategoryBudget(categoryId: String, limitAmount: Double, userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val success = db.saveBudget(userId, categoryId, limitAmount)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("BUDGET_WRITE_ERROR", e.message)
        }
    }

    // --- ACCOUNTS (CARTEIRAS) ---
    @ReactMethod
    fun getStoredAccounts(userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val accounts = db.getAccountsForUser(userId)
            promise.resolve(accounts)
        } catch (e: Exception) {
            promise.reject("ACCOUNTS_READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun saveAccount(accountMap: ReadableMap, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val id = if (accountMap.hasKey("id")) accountMap.getString("id") ?: UUID.randomUUID().toString() else UUID.randomUUID().toString()
            val userId = if (accountMap.hasKey("userId")) {
                accountMap.getString("userId")
            } else if (accountMap.hasKey("user_id")) {
                accountMap.getString("user_id")
            } else null

            val name = if (accountMap.hasKey("name")) accountMap.getString("name") ?: "Nova Conta" else "Nova Conta"
            val type = if (accountMap.hasKey("type")) accountMap.getString("type") ?: "CHECKING" else "CHECKING"
            val color = if (accountMap.hasKey("color")) accountMap.getString("color") else "#10B981"
            val icon = if (accountMap.hasKey("icon")) accountMap.getString("icon") else "wallet"
            val initialBalance = if (accountMap.hasKey("initialBalance")) {
                accountMap.getDouble("initialBalance")
            } else if (accountMap.hasKey("initial_balance")) {
                accountMap.getDouble("initial_balance")
            } else 0.0

            val isActive = if (accountMap.hasKey("isActive")) {
                accountMap.getBoolean("isActive")
            } else if (accountMap.hasKey("is_active")) {
                accountMap.getBoolean("is_active")
            } else true

            val success = db.insertAccount(
                id = id,
                userId = userId,
                name = name,
                type = type,
                color = color,
                icon = icon,
                initialBalance = initialBalance,
                isActive = isActive
            )
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("ACCOUNT_SAVE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun updateAccount(accountMap: ReadableMap, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val id = accountMap.getString("id") ?: return promise.reject("INVALID_ID", "ID da conta obrigatório.")
            val userId = if (accountMap.hasKey("userId")) {
                accountMap.getString("userId")
            } else if (accountMap.hasKey("user_id")) {
                accountMap.getString("user_id")
            } else null

            val name = if (accountMap.hasKey("name")) accountMap.getString("name") ?: "Conta" else "Conta"
            val type = if (accountMap.hasKey("type")) accountMap.getString("type") ?: "CHECKING" else "CHECKING"
            val color = if (accountMap.hasKey("color")) accountMap.getString("color") else "#10B981"
            val icon = if (accountMap.hasKey("icon")) accountMap.getString("icon") else "wallet"
            val initialBalance = if (accountMap.hasKey("initialBalance")) {
                accountMap.getDouble("initialBalance")
            } else if (accountMap.hasKey("initial_balance")) {
                accountMap.getDouble("initial_balance")
            } else 0.0

            val isActive = if (accountMap.hasKey("isActive")) {
                accountMap.getBoolean("isActive")
            } else if (accountMap.hasKey("is_active")) {
                accountMap.getBoolean("is_active")
            } else true

            val success = db.updateAccount(
                id = id,
                userId = userId,
                name = name,
                type = type,
                color = color,
                icon = icon,
                initialBalance = initialBalance,
                isActive = isActive
            )
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("ACCOUNT_UPDATE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun deleteAccount(id: String, userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val success = db.deleteAccount(id, userId)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("ACCOUNT_DELETE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun markAccountsSynced(ids: ReadableArray, userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val success = db.markAccountsSynced(ids, userId)
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("ACCOUNTS_SYNC_MARK_ERROR", e.message)
        }
    }

    // --- MONITORED BANKS ---
    @ReactMethod
    fun updateMonitoredPackages(packages: ReadableArray, promise: Promise) {
        try {
            val newSet = mutableSetOf<String>()
            for (i in 0 until packages.size()) {
                val pkg = packages.getString(i)
                if (!pkg.isNullOrBlank()) {
                    newSet.add(pkg.trim())
                }
            }
            NotificationService.activePackages = newSet
            Log.i(MODULE_NAME, "updateMonitoredPackages atualizado. Total de pacotes ativos: ${newSet.size} -> $newSet")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(MODULE_NAME, "Erro ao atualizar pacotes monitorados: ${e.message}", e)
            promise.reject("UPDATE_PACKAGES_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getActiveMonitoredPackages(promise: Promise) {
        try {
            val array = Arguments.createArray()
            NotificationService.activePackages.forEach {
                array.pushString(it)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("GET_PACKAGES_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getMonitoredBanks(userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
            val banks = db.getMonitoredBanks(userId)
            promise.resolve(banks)
        } catch (e: Exception) {
            promise.reject("BANKS_READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setBankEnabled(bankId: String, isEnabled: Boolean, userId: String?, promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
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
            val db = AppDatabaseHelper.getInstance(reactContext)
            val id = UUID.randomUUID().toString()
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
            val db = AppDatabaseHelper.getInstance(reactContext)
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
            val db = AppDatabaseHelper.getInstance(reactContext)
            val user = db.getActiveUser()
            promise.resolve(user)
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun logoutUser(promise: Promise) {
        try {
            val db = AppDatabaseHelper.getInstance(reactContext)
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
