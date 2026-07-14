package com.deviceops.agent.data.local

import android.content.Context
import androidx.room.*

@Dao
interface LogDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGPS(log: GPSLogEntity)

    @Query("SELECT * FROM gps_logs ORDER BY recordedAt ASC")
    suspend fun getAllGPS(): List<GPSLogEntity>

    @Delete
    suspend fun deleteGPS(logs: List<GPSLogEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBattery(log: BatteryLogEntity)

    @Query("SELECT * FROM battery_logs ORDER BY recordedAt ASC")
    suspend fun getAllBattery(): List<BatteryLogEntity>

    @Delete
    suspend fun deleteBattery(logs: List<BatteryLogEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNetwork(log: NetworkLogEntity)

    @Query("SELECT * FROM network_logs ORDER BY recordedAt ASC")
    suspend fun getAllNetwork(): List<NetworkLogEntity>

    @Delete
    suspend fun deleteNetwork(logs: List<NetworkLogEntity>)
}

@Database(
    entities = [GPSLogEntity::class, BatteryLogEntity::class, NetworkLogEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun logDao(): LogDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "deviceops_agent_db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
