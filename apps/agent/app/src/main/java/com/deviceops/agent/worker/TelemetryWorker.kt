package com.deviceops.agent.worker

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.deviceops.agent.BuildConfig
import com.deviceops.agent.data.local.*
import com.deviceops.agent.data.remote.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.text.SimpleDateFormat
import java.util.*

class TelemetryWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val db = AppDatabase.getDatabase(appContext)
    private val sharedPrefs = appContext.getSharedPreferences("deviceops_agent_prefs", Context.MODE_PRIVATE)

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.i("TelemetryWorker", "Starting telemetry background collection job...")
        
        try {
            // 1. Gather Telemetry Data
            val nowStr = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.format(Date())

            val batteryLog = getBatteryLog(nowStr)
            val networkLog = getNetworkLog(nowStr)
            val gpsLog = getGPSLog(nowStr)

            // 2. Save logs locally to Room DB (Idempotency mapping queue)
            val dao = db.logDao()
            dao.insertBattery(batteryLog)
            dao.insertNetwork(networkLog)
            if (gpsLog != null) {
                dao.insertGPS(gpsLog)
            }

            // 3. Attempt automatic synchronization if paired and internet connected
            val deviceToken = sharedPrefs.getString("device_auth_token", null)
            if (deviceToken != null && networkLog.isOnline) {
                syncCachedLogs(deviceToken, dao)
            }

            // Schedule next run in 1 min if in debug mode
            if (BuildConfig.DEBUG) {
                val workRequest = androidx.work.OneTimeWorkRequestBuilder<TelemetryWorker>()
                    .setInitialDelay(1, java.util.concurrent.TimeUnit.MINUTES)
                    .build()
                androidx.work.WorkManager.getInstance(applicationContext).enqueueUniqueWork(
                    "TelemetrySyncJobDebug",
                    androidx.work.ExistingWorkPolicy.REPLACE,
                    workRequest
                )
            }

            Result.success()
        } catch (e: Exception) {
            Log.e("TelemetryWorker", "Telemetry collection job failed: ${e.message}", e)
            
            // Also reschedule on failure in debug mode to keep the loop going!
            if (BuildConfig.DEBUG) {
                val workRequest = androidx.work.OneTimeWorkRequestBuilder<TelemetryWorker>()
                    .setInitialDelay(1, java.util.concurrent.TimeUnit.MINUTES)
                    .build()
                androidx.work.WorkManager.getInstance(applicationContext).enqueueUniqueWork(
                    "TelemetrySyncJobDebug",
                    androidx.work.ExistingWorkPolicy.REPLACE,
                    workRequest
                )
            }
            
            Result.retry()
        }
    }

    private fun getBatteryLog(timestamp: String): BatteryLogEntity {
        var level = 50
        var isCharging = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val batteryManager = applicationContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            level = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        }

        val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { filter ->
            applicationContext.registerReceiver(null, filter)
        }
        val status = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || 
                     status == BatteryManager.BATTERY_STATUS_FULL

        return BatteryLogEntity(
            id = UUID.randomUUID().toString(),
            batteryLevel = level,
            charging = isCharging,
            recordedAt = timestamp
        )
    }

    private fun getNetworkLog(timestamp: String): NetworkLogEntity {
        var isOnline = false
        var netType = "OFFLINE"

        val connectivityManager = applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val nw = connectivityManager.activeNetwork
            val actNw = connectivityManager.getNetworkCapabilities(nw)
            if (actNw != null) {
                isOnline = actNw.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                netType = when {
                    actNw.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
                    actNw.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
                    else -> "ETHERNET"
                }
            }
        } else {
            val nwInfo = connectivityManager.activeNetworkInfo
            if (nwInfo != null) {
                isOnline = nwInfo.isConnected
                netType = when (nwInfo.type) {
                    ConnectivityManager.TYPE_WIFI -> "WIFI"
                    ConnectivityManager.TYPE_MOBILE -> "CELLULAR"
                    else -> "ETHERNET"
                }
            }
        }

        if (!isOnline) {
            netType = "OFFLINE"
        }

        return NetworkLogEntity(
            id = UUID.randomUUID().toString(),
            networkType = netType,
            isOnline = isOnline,
            recordedAt = timestamp
        )
    }

    private fun getGPSLog(timestamp: String): GPSLogEntity? {
        // Refinement 3: Handle missing GPS permission gracefully (do not crash)
        val finePerm = ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarsePerm = ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.ACCESS_COARSE_LOCATION)
        
        if (finePerm != PackageManager.PERMISSION_GRANTED && coarsePerm != PackageManager.PERMISSION_GRANTED) {
            Log.w("TelemetryWorker", "Location permissions are not granted. Skipping location capture.")
            return null
        }

        return try {
            val locationManager = applicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val provider = if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                LocationManager.GPS_PROVIDER
            } else {
                LocationManager.NETWORK_PROVIDER
            }

            val lastLocation: Location? = locationManager.getLastKnownLocation(provider)
            if (lastLocation != null) {
                GPSLogEntity(
                    id = UUID.randomUUID().toString(),
                    latitude = lastLocation.latitude,
                    longitude = lastLocation.longitude,
                    accuracy = lastLocation.accuracy,
                    recordedAt = timestamp
                )
            } else {
                // If location is null, provide a default mock coordinate for sync stubs instead of throwing error
                GPSLogEntity(
                    id = UUID.randomUUID().toString(),
                    latitude = 0.0,
                    longitude = 0.0,
                    accuracy = 0f,
                    recordedAt = timestamp
                )
            }
        } catch (e: SecurityException) {
            Log.w("TelemetryWorker", "SecurityException occurred while accessing Location Manager: ${e.message}")
            null
        } catch (e: Exception) {
            Log.w("TelemetryWorker", "Failed to retrieve location status: ${e.message}")
            null
        }
    }

    private suspend fun syncCachedLogs(token: String, dao: LogDao) {
        val gpsList = dao.getAllGPS()
        val batteryList = dao.getAllBattery()
        val networkList = dao.getAllNetwork()

        if (gpsList.isEmpty() && batteryList.isEmpty() && networkList.isEmpty()) {
            return
        }

        // Map database entities to Retrofit transmission dtos
        val gpsDtos = gpsList.map { GPSLogDto(it.id, it.latitude, it.longitude, it.accuracy, it.recordedAt) }
        val batteryDtos = batteryList.map { BatteryLogDto(it.id, it.batteryLevel, it.charging, it.recordedAt) }
        val networkDtos = networkList.map { NetworkLogDto(it.id, it.networkType, it.isOnline, it.recordedAt) }

        val syncPayload = TelemetrySyncDto(gpsDtos, batteryDtos, networkDtos)

        val serverUrl = sharedPrefs.getString("server_api_url", "http://10.0.2.2:8000/") ?: "http://10.0.2.2:8000/"

        val retrofit = Retrofit.Builder()
            .baseUrl(serverUrl)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val apiService = retrofit.create(DeviceOpsApi::class.java)

        Log.d("TelemetryWorker", "Syncing logs to backend server: ${syncPayload.gps_logs.size} GPS, ${syncPayload.battery_logs.size} Battery, ${syncPayload.network_logs.size} Network...")

        val response = apiService.uploadTelemetry("Bearer $token", syncPayload)
        val nowFormatted = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
        if (response.isSuccessful && response.body()?.success == true) {
            Log.i("TelemetryWorker", "Telemetry upload successful. Deleting synchronised logs locally...")
            // Store & Forward: wipe synchronised entries
            dao.deleteGPS(gpsList)
            dao.deleteBattery(batteryList)
            dao.deleteNetwork(networkList)
            
            sharedPrefs.edit()
                .putString("last_sync_time", nowFormatted)
                .putString("last_upload_result", "Success (${gpsList.size} GPS, ${batteryList.size} Battery, ${networkList.size} Network)")
                .apply()
        } else {
            val errStr = response.errorBody()?.string() ?: "Response code ${response.code()}"
            Log.w("TelemetryWorker", "Telemetry upload failed: $errStr")
            
            sharedPrefs.edit()
                .putString("last_upload_result", "Failed: $errStr")
                .apply()
        }
    }
}
