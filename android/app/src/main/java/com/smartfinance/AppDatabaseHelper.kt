package com.smartfinance

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

class AppDatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "smartfinance.db"
        private const val DATABASE_VERSION = 1

        const val TABLE_TRANSACTIONS = "transactions"
        const val COL_ID = "id"
        const val COL_TITLE = "title"
        const val COL_AMOUNT = "amount"
        const val COL_TYPE = "type"
        const val COL_CATEGORY = "category"
        const val COL_BANK_NAME = "bank_name"
        const val COL_NOTE = "note"
        const val COL_TIMESTAMP = "timestamp"
        const val COL_TIME_FORMATTED = "time_formatted"
        const val COL_DATE_FORMATTED = "date_formatted"
    }

    override fun onCreate(db: SQLiteDatabase?) {
        val createTableQuery = """
            CREATE TABLE IF NOT EXISTS $TABLE_TRANSACTIONS (
                $COL_ID TEXT PRIMARY KEY,
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
        db?.execSQL(createTableQuery)
    }

    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {
        db?.execSQL("DROP TABLE IF EXISTS $TABLE_TRANSACTIONS")
        onCreate(db)
    }

    fun insertTransaction(
        id: String,
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
        val values = ContentValues().apply {
            put(COL_ID, id)
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

    fun getAllTransactions(): WritableArray {
        val array: WritableArray = Arguments.createArray()
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT * FROM $TABLE_TRANSACTIONS ORDER BY $COL_TIMESTAMP DESC",
            null
        )

        if (cursor.moveToFirst()) {
            do {
                val map: WritableMap = Arguments.createMap().apply {
                    putString("id", cursor.getString(cursor.getColumnIndexOrThrow(COL_ID)))
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

    fun deleteTransaction(id: String): Boolean {
        val db = writableDatabase
        return db.delete(TABLE_TRANSACTIONS, "$COL_ID = ?", arrayOf(id)) > 0
    }
}