package com.smartfinance

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

data class BankDefinition(val id: String, val name: String, val packageName: String, val color: String)

class AppDatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "smartfinance.db"
        private const val DATABASE_VERSION = 5

        const val TABLE_TRANSACTIONS = "transactions"
        const val COL_ID = "id"
        const val COL_TX_USER_ID = "user_id"
        const val COL_TITLE = "title"
        const val COL_AMOUNT = "amount"
        const val COL_TYPE = "type"
        const val COL_CATEGORY = "category"
        const val COL_BANK_NAME = "bank_name"
        const val COL_NOTE = "note"
        const val COL_TIMESTAMP = "timestamp"
        const val COL_TIME_FORMATTED = "time_formatted"
        const val COL_DATE_FORMATTED = "date_formatted"

        const val TABLE_BUDGETS = "budgets"
        const val COL_BUDGET_USER_ID = "user_id"
        const val COL_BUDGET_CAT_ID = "category_id"
        const val COL_BUDGET_LIMIT = "limit_amount"

        const val TABLE_USERS = "users"
        const val COL_USER_ID = "id"
        const val COL_USER_NAME = "name"
        const val COL_USER_EMAIL = "email"
        const val COL_USER_PASSWORD = "password"
        const val COL_USER_CREATED_AT = "created_at"

        const val TABLE_SESSION = "session"
        const val COL_SESSION_USER_ID = "user_id"

        const val TABLE_MONITORED_BANKS = "monitored_banks"
        const val COL_MB_USER_ID = "user_id"
        const val COL_MB_BANK_ID = "bank_id"
        const val COL_MB_PACKAGE_NAME = "package_name"
        const val COL_MB_IS_ENABLED = "is_enabled"

        val DEFAULT_BANKS = listOf(
            BankDefinition("nubank", "Nubank", "com.nu.production", "#820AD1"),
            BankDefinition("picpay", "PicPay", "com.picpay", "#11C76F"),
            BankDefinition("inter", "Banco Inter", "br.com.intermedium", "#FF7A00"),
            BankDefinition("itau", "Itaú", "com.itau", "#EC7000"),
            BankDefinition("bradesco", "Bradesco", "com.bradesco", "#CC092F"),
            BankDefinition("santander", "Santander", "com.santander.app", "#EA1D2C"),
            BankDefinition("c6", "C6 Bank", "com.c6bank.app", "#8b9da7"),
            BankDefinition("shell", "Terminal ADB (Testes)", "com.android.shell", "#38BDF8")
        )
    }

    override fun onCreate(db: SQLiteDatabase?) {
        val createTxTable = """
            CREATE TABLE IF NOT EXISTS $TABLE_TRANSACTIONS (
                $COL_ID TEXT PRIMARY KEY,
                $COL_TX_USER_ID TEXT,
                $COL_TITLE TEXT,
                $COL_AMOUNT REAL,
                $COL_TYPE TEXT,
                $COL_CATEGORY TEXT,
                $COL_BANK_NAME TEXT,
                $COL_NOTE TEXT,
                $COL_TIMESTAMP INTEGER,
                $COL_TIME_FORMATTED TEXT,
                $COL_DATE_FORMATTED TEXT
            )
        """.trimIndent()
        db?.execSQL(createTxTable)

        val createBudgetTable = """
            CREATE TABLE IF NOT EXISTS $TABLE_BUDGETS (
                $COL_BUDGET_USER_ID TEXT,
                $COL_BUDGET_CAT_ID TEXT,
                $COL_BUDGET_LIMIT REAL,
                PRIMARY KEY ($COL_BUDGET_USER_ID, $COL_BUDGET_CAT_ID)
            )
        """.trimIndent()
        db?.execSQL(createBudgetTable)

        val createUsersTable = """
            CREATE TABLE IF NOT EXISTS $TABLE_USERS (
                $COL_USER_ID TEXT PRIMARY KEY,
                $COL_USER_NAME TEXT,
                $COL_USER_EMAIL TEXT UNIQUE,
                $COL_USER_PASSWORD TEXT,
                $COL_USER_CREATED_AT INTEGER
            )
        """.trimIndent()
        db?.execSQL(createUsersTable)

        val createSessionTable = """
            CREATE TABLE IF NOT EXISTS $TABLE_SESSION (
                id INTEGER PRIMARY KEY,
                $COL_SESSION_USER_ID TEXT
            )
        """.trimIndent()
        db?.execSQL(createSessionTable)

        val createMonitoredBanksTable = """
            CREATE TABLE IF NOT EXISTS $TABLE_MONITORED_BANKS (
                $COL_MB_USER_ID TEXT,
                $COL_MB_BANK_ID TEXT,
                $COL_MB_PACKAGE_NAME TEXT,
                $COL_MB_IS_ENABLED INTEGER,
                PRIMARY KEY ($COL_MB_USER_ID, $COL_MB_BANK_ID)
            )
        """.trimIndent()
        db?.execSQL(createMonitoredBanksTable)
    }

    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            db?.execSQL("CREATE TABLE IF NOT EXISTS $TABLE_BUDGETS ($COL_BUDGET_CAT_ID TEXT PRIMARY KEY, $COL_BUDGET_LIMIT REAL)")
        }
        if (oldVersion < 3) {
            db?.execSQL("CREATE TABLE IF NOT EXISTS $TABLE_USERS ($COL_USER_ID TEXT PRIMARY KEY, $COL_USER_NAME TEXT, $COL_USER_EMAIL TEXT UNIQUE, $COL_USER_PASSWORD TEXT, $COL_USER_CREATED_AT INTEGER)")
            db?.execSQL("CREATE TABLE IF NOT EXISTS $TABLE_SESSION (id INTEGER PRIMARY KEY, $COL_SESSION_USER_ID TEXT)")
        }
        if (oldVersion < 4) {
            try {
                db?.execSQL("ALTER TABLE $TABLE_TRANSACTIONS ADD COLUMN $COL_TX_USER_ID TEXT")
            } catch (_: Exception) {}
            try {
                db?.execSQL("DROP TABLE IF EXISTS $TABLE_BUDGETS")
                db?.execSQL("""
                    CREATE TABLE IF NOT EXISTS $TABLE_BUDGETS (
                        $COL_BUDGET_USER_ID TEXT,
                        $COL_BUDGET_CAT_ID TEXT,
                        $COL_BUDGET_LIMIT REAL,
                        PRIMARY KEY ($COL_BUDGET_USER_ID, $COL_BUDGET_CAT_ID)
                    )
                """.trimIndent())
            } catch (_: Exception) {}
        }
        if (oldVersion < 5) {
            db?.execSQL("""
                CREATE TABLE IF NOT EXISTS $TABLE_MONITORED_BANKS (
                    $COL_MB_USER_ID TEXT,
                    $COL_MB_BANK_ID TEXT,
                    $COL_MB_PACKAGE_NAME TEXT,
                    $COL_MB_IS_ENABLED INTEGER,
                    PRIMARY KEY ($COL_MB_USER_ID, $COL_MB_BANK_ID)
                )
            """.trimIndent())
        }
    }

    // --- SESSÃO ATIVA ---
    fun getActiveUserId(): String? {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT $COL_SESSION_USER_ID FROM $TABLE_SESSION LIMIT 1", null)
        var userId: String? = null
        if (cursor.moveToFirst()) {
            userId = cursor.getString(0)
        }
        cursor.close()
        return userId
    }

    // --- TRANSAÇÕES ---
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
        dateFormatted: String
    ): Boolean {
        val db = writableDatabase
        val targetUserId = userId ?: getActiveUserId() ?: "guest"
        val values = ContentValues().apply {
            put(COL_ID, id)
            put(COL_TX_USER_ID, targetUserId)
            put(COL_TITLE, title)
            put(COL_AMOUNT, amount)
            put(COL_TYPE, type)
            put(COL_CATEGORY, category)
            put(COL_BANK_NAME, bankName)
            put(COL_NOTE, note ?: "")
            put(COL_TIMESTAMP, timestamp)
            put(COL_TIME_FORMATTED, timeFormatted)
            put(COL_DATE_FORMATTED, dateFormatted)
        }
        val result = db.insertWithOnConflict(TABLE_TRANSACTIONS, null, values, SQLiteDatabase.CONFLICT_REPLACE)
        return result != -1L
    }

    fun getTransactionsForUser(userId: String?): WritableArray {
        val array: WritableArray = Arguments.createArray()
        val db = readableDatabase
        val targetUserId = userId ?: getActiveUserId() ?: return array

        val cursor = db.rawQuery(
            "SELECT * FROM $TABLE_TRANSACTIONS WHERE $COL_TX_USER_ID = ? ORDER BY $COL_TIMESTAMP DESC",
            arrayOf(targetUserId)
        )

        if (cursor.moveToFirst()) {
            do {
                val map: WritableMap = Arguments.createMap().apply {
                    putString("id", cursor.getString(cursor.getColumnIndexOrThrow(COL_ID)))
                    putString("userId", cursor.getString(cursor.getColumnIndexOrThrow(COL_TX_USER_ID)))
                    putString("title", cursor.getString(cursor.getColumnIndexOrThrow(COL_TITLE)))
                    putDouble("amount", cursor.getDouble(cursor.getColumnIndexOrThrow(COL_AMOUNT)))
                    putString("type", cursor.getString(cursor.getColumnIndexOrThrow(COL_TYPE)))
                    putString("category", cursor.getString(cursor.getColumnIndexOrThrow(COL_CATEGORY)))
                    putString("bankName", cursor.getString(cursor.getColumnIndexOrThrow(COL_BANK_NAME)))
                    putString("note", cursor.getString(cursor.getColumnIndexOrThrow(COL_NOTE)))
                    putDouble("timestamp", cursor.getLong(cursor.getColumnIndexOrThrow(COL_TIMESTAMP)).toDouble())
                    putString("timeFormatted", cursor.getString(cursor.getColumnIndexOrThrow(COL_TIME_FORMATTED)))
                    putString("dateFormatted", cursor.getString(cursor.getColumnIndexOrThrow(COL_DATE_FORMATTED)))
                    putString("dateGroup", "TODAY")
                }
                array.pushMap(map)
            } while (cursor.moveToNext())
        }
        cursor.close()
        return array
    }

    fun deleteTransaction(id: String, userId: String?): Boolean {
        val db = writableDatabase
        val targetUserId = userId ?: getActiveUserId()
        return if (targetUserId != null) {
            db.delete(TABLE_TRANSACTIONS, "$COL_ID = ? AND $COL_TX_USER_ID = ?", arrayOf(id, targetUserId)) > 0
        } else {
            db.delete(TABLE_TRANSACTIONS, "$COL_ID = ?", arrayOf(id)) > 0
        }
    }

    // --- METAS ---
    fun saveBudget(userId: String?, categoryId: String, limitAmount: Double): Boolean {
        val db = writableDatabase
        val targetUserId = userId ?: getActiveUserId() ?: return false
        val values = ContentValues().apply {
            put(COL_BUDGET_USER_ID, targetUserId)
            put(COL_BUDGET_CAT_ID, categoryId)
            put(COL_BUDGET_LIMIT, limitAmount)
        }
        val result = db.insertWithOnConflict(TABLE_BUDGETS, null, values, SQLiteDatabase.CONFLICT_REPLACE)
        return result != -1L
    }

    fun getBudgetsForUser(userId: String?): WritableMap {
        val map: WritableMap = Arguments.createMap()
        val db = readableDatabase
        val targetUserId = userId ?: getActiveUserId() ?: return map

        val cursor = db.rawQuery(
            "SELECT * FROM $TABLE_BUDGETS WHERE $COL_BUDGET_USER_ID = ?",
            arrayOf(targetUserId)
        )
        if (cursor.moveToFirst()) {
            do {
                val catId = cursor.getString(cursor.getColumnIndexOrThrow(COL_BUDGET_CAT_ID))
                val limit = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_BUDGET_LIMIT))
                map.putDouble(catId, limit)
            } while (cursor.moveToNext())
        }
        cursor.close()
        return map
    }

    // --- BANCOS MONITORADOS ---
    fun getMonitoredBanks(userId: String?): WritableArray {
        val targetUserId = userId ?: getActiveUserId() ?: "guest"
        val db = writableDatabase

        // Inicializa configurações padrão se ainda não existirem para o usuário
        val checkCursor = db.rawQuery(
            "SELECT COUNT(*) FROM $TABLE_MONITORED_BANKS WHERE $COL_MB_USER_ID = ?",
            arrayOf(targetUserId)
        )
        var count = 0
        if (checkCursor.moveToFirst()) {
            count = checkCursor.getInt(0)
        }
        checkCursor.close()

        if (count == 0) {
            DEFAULT_BANKS.forEach { bank ->
                val cv = ContentValues().apply {
                    put(COL_MB_USER_ID, targetUserId)
                    put(COL_MB_BANK_ID, bank.id)
                    put(COL_MB_PACKAGE_NAME, bank.packageName)
                    put(COL_MB_IS_ENABLED, 1)
                }
                db.insertWithOnConflict(TABLE_MONITORED_BANKS, null, cv, SQLiteDatabase.CONFLICT_REPLACE)
            }
        }

        val array = Arguments.createArray()
        val cursor = db.rawQuery(
            "SELECT $COL_MB_BANK_ID, $COL_MB_IS_ENABLED FROM $TABLE_MONITORED_BANKS WHERE $COL_MB_USER_ID = ?",
            arrayOf(targetUserId)
        )
        val settingsMap = mutableMapOf<String, Boolean>()
        if (cursor.moveToFirst()) {
            do {
                val bId = cursor.getString(0)
                val isEn = cursor.getInt(1) == 1
                settingsMap[bId] = isEn
            } while (cursor.moveToNext())
        }
        cursor.close()

        DEFAULT_BANKS.forEach { bank ->
            val isEnabled = settingsMap[bank.id] ?: true
            val map = Arguments.createMap().apply {
                putString("id", bank.id)
                putString("name", bank.name)
                putString("packageName", bank.packageName)
                putBoolean("isEnabled", isEnabled)
                putString("color", bank.color)
            }
            array.pushMap(map)
        }
        return array
    }

    fun setBankEnabled(userId: String?, bankId: String, isEnabled: Boolean): Boolean {
        val targetUserId = userId ?: getActiveUserId() ?: "guest"
        val db = writableDatabase
        val bankDef = DEFAULT_BANKS.find { it.id == bankId }
        val pkg = bankDef?.packageName ?: ""

        val cv = ContentValues().apply {
            put(COL_MB_USER_ID, targetUserId)
            put(COL_MB_BANK_ID, bankId)
            put(COL_MB_PACKAGE_NAME, pkg)
            put(COL_MB_IS_ENABLED, if (isEnabled) 1 else 0)
        }
        val res = db.insertWithOnConflict(TABLE_MONITORED_BANKS, null, cv, SQLiteDatabase.CONFLICT_REPLACE)
        return res != -1L
    }

    fun isPackageMonitored(userId: String?, packageName: String): Boolean {
        val targetUserId = userId ?: getActiveUserId() ?: "guest"
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT $COL_MB_IS_ENABLED FROM $TABLE_MONITORED_BANKS WHERE $COL_MB_USER_ID = ? AND $COL_MB_PACKAGE_NAME = ?",
            arrayOf(targetUserId, packageName)
        )
        var enabled = true
        if (cursor.moveToFirst()) {
            enabled = cursor.getInt(0) == 1
        } else {
            // Se o pacote pertencer à lista padrão mas não estiver no banco, inicia ativo
            val existsInDefaults = DEFAULT_BANKS.any { it.packageName == packageName }
            if (!existsInDefaults) {
                enabled = false
            }
        }
        cursor.close()
        return enabled
    }

    // --- AUTENTICAÇÃO ---
    fun registerUser(id: String, name: String, email: String, password: String): Boolean {
        val db = writableDatabase
        val values = ContentValues().apply {
            put(COL_USER_ID, id)
            put(COL_USER_NAME, name)
            put(COL_USER_EMAIL, email.trim().lowercase())
            put(COL_USER_PASSWORD, password)
            put(COL_USER_CREATED_AT, System.currentTimeMillis())
        }
        val result = db.insert(TABLE_USERS, null, values)
        if (result != -1L) {
            setActiveSession(id)
            return true
        }
        return false
    }

    fun loginUser(email: String, password: String): WritableMap? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT * FROM $TABLE_USERS WHERE $COL_USER_EMAIL = ? AND $COL_USER_PASSWORD = ?",
            arrayOf(email.trim().lowercase(), password)
        )
        if (cursor.moveToFirst()) {
            val userId = cursor.getString(cursor.getColumnIndexOrThrow(COL_USER_ID))
            val userName = cursor.getString(cursor.getColumnIndexOrThrow(COL_USER_NAME))
            val userEmail = cursor.getString(cursor.getColumnIndexOrThrow(COL_USER_EMAIL))
            val createdAt = cursor.getLong(cursor.getColumnIndexOrThrow(COL_USER_CREATED_AT))
            cursor.close()

            setActiveSession(userId)

            return Arguments.createMap().apply {
                putString("id", userId)
                putString("name", userName)
                putString("email", userEmail)
                putDouble("createdAt", createdAt.toDouble())
            }
        }
        cursor.close()
        return null
    }

    fun setActiveSession(userId: String) {
        val db = writableDatabase
        db.execSQL("DELETE FROM $TABLE_SESSION")
        val values = ContentValues().apply {
            put("id", 1)
            put(COL_SESSION_USER_ID, userId)
        }
        db.insert(TABLE_SESSION, null, values)
    }

    fun clearSession() {
        val db = writableDatabase
        db.execSQL("DELETE FROM $TABLE_SESSION")
    }

    fun getActiveUser(): WritableMap? {
        val db = readableDatabase
        val sessionCursor = db.rawQuery("SELECT $COL_SESSION_USER_ID FROM $TABLE_SESSION LIMIT 1", null)
        if (!sessionCursor.moveToFirst()) {
            sessionCursor.close()
            return null
        }
        val userId = sessionCursor.getString(0)
        sessionCursor.close()

        val userCursor = db.rawQuery("SELECT * FROM $TABLE_USERS WHERE $COL_USER_ID = ?", arrayOf(userId))
        if (userCursor.moveToFirst()) {
            val userName = userCursor.getString(userCursor.getColumnIndexOrThrow(COL_USER_NAME))
            val userEmail = userCursor.getString(userCursor.getColumnIndexOrThrow(COL_USER_EMAIL))
            val createdAt = userCursor.getLong(userCursor.getColumnIndexOrThrow(COL_USER_CREATED_AT))
            userCursor.close()

            return Arguments.createMap().apply {
                putString("id", userId)
                putString("name", userName)
                putString("email", userEmail)
                putDouble("createdAt", createdAt.toDouble())
            }
        }
        userCursor.close()
        return null
    }
}