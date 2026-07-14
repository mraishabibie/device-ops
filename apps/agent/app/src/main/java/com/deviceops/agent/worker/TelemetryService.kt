package com.deviceops.agent.worker

import android.app.Service
import android.content.Intent
import android.os.IBinder

class TelemetryService : Service() {
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Foreground location tracking and telemetry gathering will be implemented in subsequent stages
        return START_STICKY
    }
}
