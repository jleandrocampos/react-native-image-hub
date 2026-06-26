package com.imagehub

import com.facebook.react.bridge.ReactApplicationContext

class ImageHubModule(reactContext: ReactApplicationContext) :
  NativeImageHubSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeImageHubSpec.NAME
  }
}
