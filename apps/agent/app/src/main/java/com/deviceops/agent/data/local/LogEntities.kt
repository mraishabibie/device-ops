package com.deviceops.agent.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "gps_logs")
data class GPSLogEntity(
    @PrimaryKey val id: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val recordedAt: String
)

@Entity(tableName = "battery_logs")
data class BatteryLogEntity(
    @PrimaryKey val id: String,
    val batteryLevel: Int,
    val charging: Boolean,
    val recordedAt: String
)

@Entity(tableName = "network_logs")
data class NetworkLogEntity(
    @PrimaryKey val id: String,
    val networkType: String,
    val isOnline: Boolean,
    val recordedAt: String
)
