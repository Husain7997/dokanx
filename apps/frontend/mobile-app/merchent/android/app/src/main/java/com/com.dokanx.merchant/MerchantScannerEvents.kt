package com.dokanx.merchant

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

object MerchantScannerEvents {
  private var reactContext: ReactApplicationContext? = null

  fun attach(context: ReactApplicationContext) {
    reactContext = context
  }

  fun emitScanned(code: String) {
    val params = Arguments.createMap().apply {
      putString("code", code)
    }
    reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      ?.emit("merchantScannerScanned", params)
  }

  fun emitClosed(reason: String) {
    val params = Arguments.createMap().apply {
      putString("reason", reason)
    }
    reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      ?.emit("merchantScannerClosed", params)
  }

  fun emitError(message: String) {
    val params = Arguments.createMap().apply {
      putString("message", message)
    }
    reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      ?.emit("merchantScannerError", params)
  }
}