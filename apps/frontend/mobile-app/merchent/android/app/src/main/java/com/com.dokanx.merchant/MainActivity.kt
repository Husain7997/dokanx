package com.dokanx.merchant

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "DokanXMerchant"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      ReactActivityDelegate(this, mainComponentName)
}
