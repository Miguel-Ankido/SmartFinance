package com.smartfinance

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

data class BankDefinition(
    val id: String,
    val name: String,
    val packageName: String,
    val color: String,
)

class AppDatabaseHelper(context: Context) :
    SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "syncpay_local.db"
        private const val DATABASE_VERSION = 3

        private const val TABLE_USERS = "users"
        private const val TABLE_ACCOUNTS = "accounts"
        private const val TABLE_CATEGORIES = "categories"
        private const val TABLE_TRANSACTIONS = "transactions"
        private const val TABLE_BUDGETS = "budgets"
        private const val TABLE_MONITORED_BANKS = "monitored_banks"

        private const val BANK_DESCRIPTION_PREFIX = "[bank="

        private val DEFAULT_BANKS = listOf(
            BankDefinition("nubank", "Nubank", "com.nu.production", "#820AD1"),
            BankDefinition("picpay", "PicPay", "com.picpay", "#11C76F"),
            BankDefinition("inter", "Banco Inter", "br.com.intermedium", "#FF7A00"),
        )

        private fun currentIsoTimestamp(): String {
            val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            formatter.timeZone = TimeZone.getTimeZone("UTC")
            return formatter.format(Date())
        }
    }

    override fun onCreate(db: SQLiteDatabase) {
        createSchema(db)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 3) {
            createSchema(db)
        }
    }

    private fun createSchema(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS $TABLE_USERS (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS $TABLE_ACCOUNTS (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                color TEXT,
                icon TEXT,
                initial_balance REAL DEFAULT 0.0,
                is_active INTEGER DEFAULT 1,
                synced_at TEXT,
                updated_at TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS $TABLE_CATEGORIES (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                icon TEXT,
                color TEXT,
                budget_limit REAL DEFAULT 0.0,
                synced_at TEXT,
                updated_at TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS $TABLE_TRANSACTIONS (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                account_id TEXT,
                category_id TEXT,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                merchant TEXT,
                description TEXT,
                date TEXT NOT NULL,
                is_business INTEGER DEFAULT 0,
                synced_at TEXT,
                updated_at TEXT NOT NULL,
                is_deleted INTEGER DEFAULT 0
            );
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS $TABLE_BUDGETS (
                user_id TEXT NOT NULL,
                category_id TEXT NOT NULL,
                limit_amount REAL NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, category_id)
            );
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS $TABLE_MONITORED_BANKS (
                user_id TEXT NOT NULL,
                bank_id TEXT NOT NULL,
                package_name TEXT NOT NULL,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                PRIMARY KEY (user_id, bank_id)
            );
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_transactions_user_date " +
                "ON $TABLE_TRANSACTIONS(user_id, date DESC)",
        )
    }

    fun insertTransaction(
        id: String,
        userId: String?,
        title: String,
        amount: Double,
        type: String,
        category: String,
        bankName: String,
        note: String?,
        timestamp: Long,
        timeFormatted: String,
        dateFormatted: String,
    ): Boolean {
        val targetUserId = userId ?: getActiveUserId() ?: "guest"
        val now = currentIsoTimestamp()
        val values = ContentValues().apply {
            put("id", id)
            put("user_id", targetUserId)
            put("category_id", category)
            put("amount", amount)
            put("type", type)
            put("payment_method", "CASH")
            put("merchant", title)
            put("description", formatDescription(bankName, note))
            put("date", formatIsoDate(Date(timestamp.coerceAtLeast(0))))
            put("is_business", 0)
            putNull("synced_at")
            put("updated_at", now)
            put("is_deleted", 0)
        }
        return writableDatabase.insertWithOnConflict(
            TABLE_TRANSACTIONS,
            null,
            values,
            SQLiteDatabase.CONFLICT_REPLACE,
        ) != -1L
    }

    fun insertTransaction(
        userId: String,
        amount: Double,
        type: String,
        paymentMethod: String = "PIX",
        merchant: String = "",
        bankName: String = "",
        isBusiness: Boolean = false,
    ): String {
        val id = UUID.randomUUID().toString()
        val now = currentIsoTimestamp()
        val values = ContentValues().apply {
            put("id", id)
            put("user_id", userId)
            put("amount", amount)
            put("type", type)
            put("payment_method", paymentMethod)
            put("merchant", merchant)
            put("description", formatDescription(bankName, null))
            put("date", now)
            put("is_business", if (isBusiness) 1 else 0)
            putNull("synced_at")
            put("updated_at", now)
            put("is_deleted", 0)
        }
        writableDatabase.insertOrThrow(TABLE_TRANSACTIONS, null, values)
        return id
    }

    fun insertTransactionFromNotification(
        userId: String,
        amount: Double,
        type: String,
        paymentMethod: String,
        merchant: String,
        bankName: String,
        isBusiness: Boolean = false,
    ): String = insertTransaction(
        userId = userId,
        amount = amount,
        type = type,
        paymentMethod = paymentMethod,
        merchant = merchant,
        bankName = bankName,
        isBusiness = isBusiness,
    )

    fun getTransactionsForUser(userId: String?): WritableArray {
        val transactions = Arguments.createArray()
        val targetUserId = userId ?: getActiveUserId() ?: return transactions
        val cursor = readableDatabase.rawQuery(
            """
            SELECT id, user_id, category_id, amount, type, merchant, description, date
            FROM $TABLE_TRANSACTIONS
            WHERE user_id = ? AND is_deleted = 0
            ORDER BY date DESC
            """.trimIndent(),
            arrayOf(targetUserId),
        )

        cursor.use {
            val idIndex = it.getColumnIndexOrThrow("id")
            val userIdIndex = it.getColumnIndexOrThrow("user_id")
            val categoryIndex = it.getColumnIndexOrThrow("category_id")
            val amountIndex = it.getColumnIndexOrThrow("amount")
            val typeIndex = it.getColumnIndexOrThrow("type")
            val merchantIndex = it.getColumnIndexOrThrow("merchant")
            val descriptionIndex = it.getColumnIndexOrThrow("description")
            val dateIndex = it.getColumnIndexOrThrow("date")

            while (it.moveToNext()) {
                val date = it.getString(dateIndex) ?: currentIsoTimestamp()
                val timestamp = parseIsoDate(date)
                val description = it.getString(descriptionIndex) ?: ""
                val occurredAt = Date(timestamp)

                transactions.pushMap(
                    Arguments.createMap().apply {
                        putString("id", it.getString(idIndex))
                        putString("userId", it.getString(userIdIndex))
                        putString("title", it.getString(merchantIndex) ?: "Transaction")
                        putDouble("amount", it.getDouble(amountIndex))
                        putString("type", it.getString(typeIndex))
                        putString("category", it.getString(categoryIndex) ?: "others")
                        putString("bankName", extractBankName(description))
                        putString("note", extractUserNote(description))
                        putDouble("timestamp", timestamp.toDouble())
                        putString("timeFormatted", formatTime(occurredAt))
                        putString("dateFormatted", formatDisplayDate(occurredAt))
                        putString("dateGroup", "TODAY")
                    },
                )
            }
        }
        return transactions
    }

    fun deleteTransaction(id: String, userId: String?): Boolean {
        val targetUserId = userId ?: getActiveUserId() ?: return false
        val values = ContentValues().apply {
            put("is_deleted", 1)
            put("updated_at", currentIsoTimestamp())
            putNull("synced_at")
        }
        return writableDatabase.update(
            TABLE_TRANSACTIONS,
            values,
            "id = ? AND user_id = ?",
            arrayOf(id, targetUserId),
        ) > 0
    }

    fun saveBudget(userId: String?, categoryId: String, limitAmount: Double): Boolean {
        val targetUserId = userId ?: getActiveUserId() ?: return false
        val values = ContentValues().apply {
            put("user_id", targetUserId)
            put("category_id", categoryId)
            put("limit_amount", limitAmount)
            put("updated_at", currentIsoTimestamp())
        }
        return writableDatabase.insertWithOnConflict(
            TABLE_BUDGETS,
            null,
            values,
            SQLiteDatabase.CONFLICT_REPLACE,
        ) != -1L
    }

    fun getBudgetsForUser(userId: String?): WritableMap {
        val budgets = Arguments.createMap()
        val targetUserId = userId ?: getActiveUserId() ?: return budgets
        val cursor = readableDatabase.rawQuery(
            "SELECT category_id, limit_amount FROM $TABLE_BUDGETS WHERE user_id = ?",
            arrayOf(targetUserId),
        )
        cursor.use {
            val categoryIndex = it.getColumnIndexOrThrow("category_id")
            val amountIndex = it.getColumnIndexOrThrow("limit_amount")
            while (it.moveToNext()) {
                budgets.putDouble(it.getString(categoryIndex), it.getDouble(amountIndex))
            }
        }
        return budgets
    }

    fun getMonitoredBanks(userId: String?): WritableArray {
        val targetUserId = userId ?: getActiveUserId() ?: return Arguments.createArray()
        seedMonitoredBanks(targetUserId)

        val enabledByBankId = mutableMapOf<String, Boolean>()
        val cursor = readableDatabase.rawQuery(
            "SELECT bank_id, is_enabled FROM $TABLE_MONITORED_BANKS WHERE user_id = ?",
            arrayOf(targetUserId),
        )
        cursor.use {
            val idIndex = it.getColumnIndexOrThrow("bank_id")
            val enabledIndex = it.getColumnIndexOrThrow("is_enabled")
            while (it.moveToNext()) {
                enabledByBankId[it.getString(idIndex)] = it.getInt(enabledIndex) == 1
            }
        }

        return Arguments.createArray().apply {
            DEFAULT_BANKS.forEach { bank ->
                pushMap(
                    Arguments.createMap().apply {
                        putString("id", bank.id)
                        putString("name", bank.name)
                        putString("packageName", bank.packageName)
                        putBoolean("isEnabled", enabledByBankId[bank.id] ?: true)
                        putString("color", bank.color)
                    },
                )
            }
        }
    }

    fun setBankEnabled(userId: String?, bankId: String, isEnabled: Boolean): Boolean {
        val targetUserId = userId ?: getActiveUserId() ?: return false
        val bank = DEFAULT_BANKS.find { it.id == bankId } ?: return false
        val values = ContentValues().apply {
            put("user_id", targetUserId)
            put("bank_id", bank.id)
            put("package_name", bank.packageName)
            put("is_enabled", if (isEnabled) 1 else 0)
        }
        return writableDatabase.insertWithOnConflict(
            TABLE_MONITORED_BANKS,
            null,
            values,
            SQLiteDatabase.CONFLICT_REPLACE,
        ) != -1L
    }

    fun isPackageMonitored(userId: String?, packageName: String): Boolean {
        val targetUserId = userId ?: getActiveUserId() ?: return false
        seedMonitoredBanks(targetUserId)
        val cursor = readableDatabase.rawQuery(
            "SELECT is_enabled FROM $TABLE_MONITORED_BANKS WHERE user_id = ? AND package_name = ?",
            arrayOf(targetUserId, packageName),
        )
        cursor.use {
            return it.moveToFirst() && it.getInt(0) == 1
        }
    }

    fun registerUser(id: String, name: String, email: String, password: String): Boolean {
        val now = currentIsoTimestamp()
        val values = ContentValues().apply {
            put("id", id)
            put("name", name.trim())
            put("email", email.trim().lowercase(Locale.ROOT))
            put("password_hash", hashPassword(password))
            put("is_active", 0)
            put("created_at", now)
            put("updated_at", now)
        }
        val success = writableDatabase.insert(TABLE_USERS, null, values) != -1L
        if (success) {
            setActiveUser(id)
        }
        return success
    }

    fun loginUser(email: String, password: String): WritableMap? {
        val cursor = readableDatabase.rawQuery(
            "SELECT id, name, email, created_at FROM $TABLE_USERS WHERE email = ? AND password_hash = ?",
            arrayOf(email.trim().lowercase(Locale.ROOT), hashPassword(password)),
        )
        val user = cursor.use {
            if (!it.moveToFirst()) {
                null
            } else {
                createUserMap(
                    id = it.getString(it.getColumnIndexOrThrow("id")),
                    name = it.getString(it.getColumnIndexOrThrow("name")),
                    email = it.getString(it.getColumnIndexOrThrow("email")),
                    createdAt = it.getString(it.getColumnIndexOrThrow("created_at")),
                )
            }
        }
        if (user != null) {
            setActiveUser(user.getString("id") ?: return null)
        }
        return user
    }

    fun getActiveUser(): WritableMap? {
        val cursor = readableDatabase.rawQuery(
            "SELECT id, name, email, created_at FROM $TABLE_USERS WHERE is_active = 1 LIMIT 1",
            null,
        )
        return cursor.use {
            if (!it.moveToFirst()) {
                null
            } else {
                createUserMap(
                    id = it.getString(it.getColumnIndexOrThrow("id")),
                    name = it.getString(it.getColumnIndexOrThrow("name")),
                    email = it.getString(it.getColumnIndexOrThrow("email")),
                    createdAt = it.getString(it.getColumnIndexOrThrow("created_at")),
                )
            }
        }
    }

    fun clearSession() {
        val values = ContentValues().apply {
            put("is_active", 0)
            put("updated_at", currentIsoTimestamp())
        }
        writableDatabase.update(TABLE_USERS, values, "is_active = 1", null)
    }

    private fun getActiveUserId(): String? = getActiveUser()?.getString("id")

    private fun setActiveUser(userId: String) {
        val db = writableDatabase
        val now = currentIsoTimestamp()
        db.beginTransaction()
        try {
            val deactivate = ContentValues().apply {
                put("is_active", 0)
                put("updated_at", now)
            }
            db.update(TABLE_USERS, deactivate, "is_active = 1", null)

            val activate = ContentValues().apply {
                put("is_active", 1)
                put("updated_at", now)
            }
            db.update(TABLE_USERS, activate, "id = ?", arrayOf(userId))
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    private fun seedMonitoredBanks(userId: String) {
        val db = writableDatabase
        DEFAULT_BANKS.forEach { bank ->
            val values = ContentValues().apply {
                put("user_id", userId)
                put("bank_id", bank.id)
                put("package_name", bank.packageName)
                put("is_enabled", 1)
            }
            db.insertWithOnConflict(
                TABLE_MONITORED_BANKS,
                null,
                values,
                SQLiteDatabase.CONFLICT_IGNORE,
            )
        }
    }

    private fun formatDescription(bankName: String, note: String?): String {
        val trimmedBankName = bankName.trim()
        val trimmedNote = note?.trim().orEmpty()
        if (trimmedBankName.isEmpty()) {
            return trimmedNote
        }
        return if (trimmedNote.isEmpty()) {
            "$BANK_DESCRIPTION_PREFIX$trimmedBankName]"
        } else {
            "$BANK_DESCRIPTION_PREFIX$trimmedBankName]\n$trimmedNote"
        }
    }

    private fun extractBankName(description: String): String {
        if (!description.startsWith(BANK_DESCRIPTION_PREFIX)) {
            return "Manual"
        }
        val endIndex = description.indexOf(']')
        return if (endIndex > BANK_DESCRIPTION_PREFIX.length) {
            description.substring(BANK_DESCRIPTION_PREFIX.length, endIndex)
        } else {
            "Manual"
        }
    }

    private fun extractUserNote(description: String): String {
        if (!description.startsWith(BANK_DESCRIPTION_PREFIX)) {
            return description
        }
        val newlineIndex = description.indexOf('\n')
        return if (newlineIndex >= 0) description.substring(newlineIndex + 1) else ""
    }

    private fun createUserMap(id: String, name: String, email: String, createdAt: String): WritableMap {
        return Arguments.createMap().apply {
            putString("id", id)
            putString("name", name)
            putString("email", email)
            putDouble("createdAt", parseIsoDate(createdAt).toDouble())
        }
    }

    private fun hashPassword(password: String): String {
        return MessageDigest.getInstance("SHA-256")
            .digest(password.toByteArray(Charsets.UTF_8))
            .joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) }
    }

    private fun formatIsoDate(date: Date): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        formatter.timeZone = TimeZone.getTimeZone("UTC")
        return formatter.format(date)
    }

    private fun parseIsoDate(value: String): Long {
        val patterns = listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'")
        patterns.forEach { pattern ->
            try {
                val formatter = SimpleDateFormat(pattern, Locale.US)
                formatter.timeZone = TimeZone.getTimeZone("UTC")
                return formatter.parse(value)?.time ?: 0L
            } catch (_: Exception) {
                // Try the next supported ISO-8601 format.
            }
        }
        return 0L
    }

    private fun formatTime(date: Date): String {
        return SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
    }

    private fun formatDisplayDate(date: Date): String {
        return SimpleDateFormat("dd 'de' MMMM 'de' yyyy", Locale.getDefault()).format(date)
    }
}
