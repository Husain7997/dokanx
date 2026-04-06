package com.dokanx.merchant

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MerchantScannerModule(private val appContext: ReactApplicationContext) : ReactContextBaseJavaModule(appContext) {

  override fun getName(): String = "MerchantScanner"

  init {
    MerchantScannerEvents.attach(appContext)
  }

  @ReactMethod
  fun openScanner(promise: Promise) {
    val activity = appContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Merchant scanner needs an active screen.")
      return
    }

    val intent = Intent(activity, MerchantScannerActivity::class.java)
    activity.startActivity(intent)
    promise.resolve(true)
  }

  @ReactMethod
  fun updateScannerStatus(message: String) {
    MerchantScannerActivity.updateStatus(message)
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required by NativeEventEmitter on Android.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required by NativeEventEmitter on Android.
  }
}
