package com.deviceops.agent.ui.view

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.deviceops.agent.R
import com.deviceops.agent.data.remote.DeviceOpsApi
import com.deviceops.agent.data.remote.PairRequest
import com.deviceops.agent.worker.TelemetryWorker
import com.google.zxing.integration.android.IntentIntegrator
import com.google.zxing.integration.android.IntentResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONException
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var tvStatus: TextView
    private lateinit var tvBatteryOptimizationWarning: TextView
    private lateinit var etPairingToken: EditText
    private lateinit var btnPair: Button
    private lateinit var btnRequestIgnoreBattery: Button
    private lateinit var tvOr: TextView
    private lateinit var btnScanQr: Button

    private val fineLocationPermissionCode = 101

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus = findViewById(R.id.tvStatus)
        tvBatteryOptimizationWarning = findViewById(R.id.tvBatteryOptimizationWarning)
        etPairingToken = findViewById(R.id.etPairingToken)
        btnPair = findViewById(R.id.btnPair)
        btnRequestIgnoreBattery = findViewById(R.id.btnRequestIgnoreBattery)
        tvOr = findViewById(R.id.tvOr)
        btnScanQr = findViewById(R.id.btnScanQr)

        checkPermissions()
        checkBatteryOptimizations()
        updateUIState()

        btnPair.setOnClickListener {
            val token = etPairingToken.text.toString().trim()
            if (token.isEmpty()) {
                Toast.makeText(this, "Please enter a valid pairing token code", Toast.LENGTH_SHORT).show()
            } else {
                pairDevice(token)
            }
        }

        btnScanQr.setOnClickListener {
            startQRScanner()
        }

        btnRequestIgnoreBattery.setOnClickListener {
            requestIgnoreBatteryOptimization()
        }
    }

    private fun startQRScanner() {
        val integrator = IntentIntegrator(this)
        integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
        integrator.setPrompt("Scan pairing QR Code from Dashboard")
        integrator.setCameraId(0)
        integrator.setBeepEnabled(false)
        integrator.setBarcodeImageEnabled(false)
        integrator.initiateScan()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        val result: IntentResult? = IntentIntegrator.parseActivityResult(requestCode, resultCode, data)
        if (result != null) {
            val scannedContent = result.contents
            if (scannedContent != null) {
                processScannedData(scannedContent)
            } else {
                Toast.makeText(this, "Scan cancelled", Toast.LENGTH_SHORT).show()
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    private fun processScannedData(data: String) {
        try {
            // Attempt to parse JSON containing token and server_url
            val json = JSONObject(data)
            val token = json.getString("token")
            val serverUrl = json.getString("server_url")
            
            // Normalize server URL trailing slash
            val normalizedUrl = if (serverUrl.endsWith("/")) serverUrl else "$serverUrl/"
            
            val sharedPrefs = getSharedPreferences("deviceops_agent_prefs", Context.MODE_PRIVATE)
            sharedPrefs.edit()
                .putString("server_api_url", normalizedUrl)
                .apply()
                
            etPairingToken.setText(token)
            pairDevice(token)
        } catch (e: JSONException) {
            // Fallback: treat as raw token code
            etPairingToken.setText(data)
            pairDevice(data)
        }
    }

    private fun checkPermissions() {
        val finePerm = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        if (finePerm != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                fineLocationPermissionCode
            )
        }
    }

    // Refinement 4: Detect Android battery optimization restrictions and notify user
    private fun checkBatteryOptimizations() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        val packageName = packageName
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val isIgnoring = powerManager.isIgnoringBatteryOptimizations(packageName)
            if (!isIgnoring) {
                tvBatteryOptimizationWarning.visibility = View.VISIBLE
                btnRequestIgnoreBattery.visibility = View.VISIBLE
                tvBatteryOptimizationWarning.text = "Warning: Battery optimization is active. Background telemetry synchronization (every 30 mins) might be throttled by Android OS. Please disable battery optimization for this application."
            } else {
                tvBatteryOptimizationWarning.visibility = View.GONE
                btnRequestIgnoreBattery.visibility = View.GONE
            }
        } else {
            tvBatteryOptimizationWarning.visibility = View.GONE
            btnRequestIgnoreBattery.visibility = View.GONE
        }
    }

    private fun requestIgnoreBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } catch (e: Exception) {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                startActivity(intent)
            }
        }
    }

    private fun updateUIState() {
        val sharedPrefs = getSharedPreferences("deviceops_agent_prefs", Context.MODE_PRIVATE)
        val token = sharedPrefs.getString("device_auth_token", null)
        if (token != null) {
            tvStatus.text = "Device Status: PAIRED & CONNECTED\nTelemetry Sync: Scheduled (30 mins)"
            etPairingToken.visibility = View.GONE
            btnPair.visibility = View.GONE
            btnScanQr.visibility = View.GONE
            tvOr.visibility = View.GONE
        } else {
            tvStatus.text = "Device Status: UNPAIRED\nEnter QR token code below to pair:"
            etPairingToken.visibility = View.VISIBLE
            btnPair.visibility = View.VISIBLE
            btnScanQr.visibility = View.VISIBLE
            tvOr.visibility = View.VISIBLE
        }
    }

    private fun pairDevice(tokenCode: String) {
        val sharedPrefs = getSharedPreferences("deviceops_agent_prefs", Context.MODE_PRIVATE)
        val serverUrl = sharedPrefs.getString("server_api_url", "http://10.0.2.2:8000/") ?: "http://10.0.2.2:8000/"

        lifecycleScope.launch {
            try {
                btnPair.isEnabled = false
                val androidVer = Build.VERSION.RELEASE ?: "Android Unknown"
                val appVer = packageManager.getPackageInfo(packageName, 0).versionName ?: "1.0.0"

                val response = withContext(Dispatchers.IO) {
                    val retrofit = Retrofit.Builder()
                        .baseUrl(serverUrl)
                        .addConverterFactory(GsonConverterFactory.create())
                        .build()
                    val api = retrofit.create(DeviceOpsApi::class.java)
                    api.pairDevice(PairRequest(tokenCode, androidVer, appVer))
                }

                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    sharedPrefs.edit()
                        .putString("device_auth_token", body.access_token)
                        .apply()

                    Toast.makeText(this@MainActivity, "Device paired successfully!", Toast.LENGTH_SHORT).show()
                    
                    // Schedule background telemetry collection worker
                    scheduleTelemetryWorker()
                    updateUIState()
                } else {
                    val errorDetail = response.errorBody()?.string() ?: "Unknown error"
                    Toast.makeText(this@MainActivity, "Pairing failed: $errorDetail", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Pairing connection error: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                btnPair.isEnabled = true
            }
        }
    }

    private fun scheduleTelemetryWorker() {
        val workRequest = PeriodicWorkRequestBuilder<TelemetryWorker>(30, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(applicationContext).enqueueUniquePeriodicWork(
            "TelemetrySyncJob",
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    override fun onResume() {
        super.onResume()
        checkBatteryOptimizations()
    }
}
