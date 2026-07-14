package com.deviceops.agent.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

data class PairRequest(
    val token: String,
    val android_version: String,
    val app_version: String
)

data class PairResponse(
    val access_token: String,
    val token_type: String
)

data class GPSLogDto(
    val id: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val recorded_at: String
)

data class BatteryLogDto(
    val id: String,
    val battery_level: Int,
    val charging: Boolean,
    val recorded_at: String
)

data class NetworkLogDto(
    val id: String,
    val network_type: String,
    val is_online: Boolean,
    val recorded_at: String
)

data class TelemetrySyncDto(
    val gps_logs: List<GPSLogDto>,
    val battery_logs: List<BatteryLogDto>,
    val network_logs: List<NetworkLogDto>
)

data class TelemetrySyncResponse(
    val success: Boolean,
    val gps_synced: Int,
    val battery_synced: Int,
    val network_synced: Int
)

interface DeviceOpsApi {
    @POST("api/v1/devices/pair")
    suspend fun pairDevice(
        @Body request: PairRequest
    ): Response<PairResponse>

    @POST("api/v1/devices/telemetry")
    suspend fun uploadTelemetry(
        @Header("Authorization") authHeader: String,
        @Body request: TelemetrySyncDto
    ): Response<TelemetrySyncResponse>
}
