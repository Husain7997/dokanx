package com.dokanx.merchant

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.ImageButton
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.lang.ref.WeakReference
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MerchantScannerActivity : AppCompatActivity() {

  companion object {
    private var currentInstance: WeakReference<MerchantScannerActivity>? = null

    fun updateStatus(message: String) {
      val activity = currentInstance?.get() ?: return
      activity.runOnUiThread {
        activity.statusText.text = message
      }
    }
  }

  private lateinit var previewView: PreviewView
  internal lateinit var statusText: TextView
  private lateinit var cameraExecutor: ExecutorService
  private val scanner = BarcodeScanning.getClient(
    BarcodeScannerOptions.Builder()
      .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
      .build(),
  )
  private var cameraProvider: ProcessCameraProvider? = null
  private var lastScannedCode: String? = null
  private var lastScanAt: Long = 0L

  private val permissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
    if (granted) {
      startScanner()
    } else {
      MerchantScannerEvents.emitError("Camera permission was denied.")
      MerchantScannerEvents.emitClosed("permission-denied")
      finish()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
    setContentView(R.layout.activity_merchant_scanner)
    applyOverlayWindow()

    previewView = findViewById(R.id.scannerPreview)
    statusText = findViewById(R.id.scannerStatus)
    currentInstance = WeakReference(this)

    val closeButton: ImageButton = findViewById(R.id.scannerClose)
    closeButton.setOnClickListener {
      MerchantScannerEvents.emitClosed("manual-close")
      finish()
    }
    cameraExecutor = Executors.newSingleThreadExecutor()

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
      startScanner()
    } else {
      permissionLauncher.launch(Manifest.permission.CAMERA)
    }
  }

  override fun onStart() {
    super.onStart()
    applyOverlayWindow()
  }

  private fun applyOverlayWindow() {
    val screenHeight = resources.displayMetrics.heightPixels
    val minHeight = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 280f, resources.displayMetrics).toInt()
    val overlayHeight = (screenHeight * 0.72).toInt().coerceAtLeast(minHeight)
    window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, overlayHeight)
    window.setGravity(Gravity.TOP)
    window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
    window.addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL)
    window.addFlags(WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH)
    window.setDimAmount(0f)
  }

  private fun startScanner() {
    statusText.text = "Point to barcode"
    val providerFuture = ProcessCameraProvider.getInstance(this)
    providerFuture.addListener({
      try {
        cameraProvider = providerFuture.get()
        bindUseCases()
      } catch (error: Exception) {
        MerchantScannerEvents.emitError(error.message ?: "Camera could not start.")
        MerchantScannerEvents.emitClosed("camera-start-failed")
        finish()
      }
    }, ContextCompat.getMainExecutor(this))
  }

  private fun bindUseCases() {
    val provider = cameraProvider ?: return
    val preview = Preview.Builder().build().also {
      it.surfaceProvider = previewView.surfaceProvider
    }
    val analysis = ImageAnalysis.Builder()
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .build()
      .also {
        it.setAnalyzer(cameraExecutor) { imageProxy ->
          val mediaImage = imageProxy.image
          if (mediaImage == null) {
            imageProxy.close()
            return@setAnalyzer
          }

          val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
          scanner.process(image)
            .addOnSuccessListener { barcodes ->
              val code = barcodes.firstNotNullOfOrNull { barcode ->
                barcode.rawValue?.trim()?.takeIf { value -> value.isNotEmpty() }
              }
              if (code != null) {
                val now = System.currentTimeMillis()
                val isDuplicate = code == lastScannedCode && now - lastScanAt < 4500
                if (!isDuplicate) {
                  lastScannedCode = code
                  lastScanAt = now
                  statusText.post {
                    statusText.text = "Scanning $code... adding to cart below."
                  }
                  MerchantScannerEvents.emitScanned(code)
                }
              }
            }
            .addOnFailureListener { error ->
              statusText.post {
                statusText.text = error.message ?: "Scan failed. Try holding the phone steady."
              }
            }
            .addOnCompleteListener {
              imageProxy.close()
            }
        }
      }

    provider.unbindAll()
    provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
  }

  override fun onDestroy() {
    super.onDestroy()
    if (currentInstance?.get() === this) {
      currentInstance = null
    }
    cameraProvider?.unbindAll()
    scanner.close()
    cameraExecutor.shutdown()
  }
}


