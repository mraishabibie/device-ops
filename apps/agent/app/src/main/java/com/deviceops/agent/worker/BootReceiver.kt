package com.deviceops.agent.worker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import com.deviceops.agent.BuildConfig

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.i("BootReceiver", "Reboot detected. Rescheduling telemetry workers...")
            
            if (BuildConfig.DEBUG) {
                val workRequest = OneTimeWorkRequestBuilder<TelemetryWorker>().build()
                WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                    "TelemetrySyncJobDebug",
                    ExistingWorkPolicy.REPLACE,
                    workRequest
                )
            } else {
                val workRequest = PeriodicWorkRequestBuilder<TelemetryWorker>(30, TimeUnit.MINUTES).build()
                WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
                    "TelemetrySyncJob",
                    ExistingPeriodicWorkPolicy.KEEP,
                    workRequest
                )
            }
        }
    }
}
