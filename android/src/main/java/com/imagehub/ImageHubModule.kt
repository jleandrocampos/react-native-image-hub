package com.imagehub

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.util.Base64
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

class ImageHubModule(reactContext: ReactApplicationContext) :
  NativeImageHubSpec(reactContext), ActivityEventListener {

  companion object {
    const val NAME = NativeImageHubSpec.NAME
    private const val PICK_IMAGE_REQUEST = 1001
    private const val TAG = "ImageHub"
  }

  private var galleryPromise: Promise? = null
  private var galleryMultiple: Boolean = false
  private var galleryMaxFiles: Int = 5

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = NAME

  override fun openGallery(options: ReadableMap, promise: Promise) {
    galleryPromise = promise
    galleryMultiple = options.getBoolean("multiple")
    galleryMaxFiles = options.getInt("maxFiles")

    val intent = Intent(Intent.ACTION_PICK).apply {
      type = "image/*"
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, galleryMultiple)
    }

    val chooserIntent = Intent.createChooser(intent, "Selecionar imagem")
    currentActivity?.startActivityForResult(chooserIntent, PICK_IMAGE_REQUEST)
      ?: promise.reject("NO_ACTIVITY", "No current activity available")
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != PICK_IMAGE_REQUEST) return

    val promise = galleryPromise ?: return
    galleryPromise = null

    if (resultCode == Activity.RESULT_CANCELED) {
      promise.reject("CANCELLED", "Gallery selection cancelled")
      return
    }

    try {
      val selectedImages = Arguments.createArray()
      val clipData = data?.clipData

      if (clipData != null && galleryMultiple) {
        val count = minOf(clipData.itemCount, galleryMaxFiles)
        for (i in 0 until count) {
          val uri = clipData.getItemAt(i).uri
          val imageInfo = getImageInfoFromUri(uri)
          if (imageInfo != null) {
            selectedImages.pushMap(imageInfo)
          }
        }
      } else if (data?.data != null) {
        val uri = data.data!!
        val imageInfo = getImageInfoFromUri(uri)
        if (imageInfo != null) {
          selectedImages.pushMap(imageInfo)
        }
      }

      promise.resolve(selectedImages)
    } catch (e: Exception) {
      Log.e(TAG, "Error processing gallery result", e)
      promise.reject("GALLERY_ERROR", e.message)
    }
  }

  private fun getImageInfoFromUri(uri: Uri): WritableMap? {
    return try {
      val contentResolver = reactApplicationContext.contentResolver
      val inputStream = contentResolver.openInputStream(uri) ?: return null
      val bitmap = BitmapFactory.decodeStream(inputStream)
      inputStream.close()

      var width = bitmap.width
      var height = bitmap.height

      try {
        val exifStream = contentResolver.openInputStream(uri)
        if (exifStream != null) {
          val exif = ExifInterface(exifStream)
          val orientation = exif.getAttributeInt(
            ExifInterface.TAG_ORIENTATION,
            ExifInterface.ORIENTATION_NORMAL
          )
          if (orientation == ExifInterface.ORIENTATION_ROTATE_90 ||
            orientation == ExifInterface.ORIENTATION_ROTATE_270
          ) {
            width = bitmap.height
            height = bitmap.width
          }
          exifStream.close()
        }
      } catch (_: Exception) {}

      val map = Arguments.createMap()
      map.putString("uri", uri.toString())
      map.putInt("width", width)
      map.putInt("height", height)
      map.putString("mime", contentResolver.getType(uri) ?: "image/jpeg")
      bitmap.recycle()
      map
    } catch (e: Exception) {
      Log.e(TAG, "Error reading image info", e)
      null
    }
  }

  override fun getImageInfo(uri: String, promise: Promise) {
    try {
      val file = resolveUri(uri)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File not found: $uri")
        return
      }

      val (width, height) = getExifDimensions(file.absolutePath)

      val map = Arguments.createMap()
      map.putInt("width", width)
      map.putInt("height", height)
      map.putString("mime", getMimeType(file.name))
      map.putDouble("size", file.length().toDouble())
      map.putString("modificationDate", null)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("IMAGE_INFO_ERROR", e.message)
    }
  }

  override fun compressImage(
    inputUri: String,
    outputPath: String,
    options: ReadableMap,
    promise: Promise
  ) {
    try {
      val file = resolveUri(inputUri)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File not found: $inputUri")
        return
      }

      val bitmap = loadBitmapWithExif(file.absolutePath)
      if (bitmap == null) {
        promise.reject("DECODE_ERROR", "Failed to decode image: $inputUri")
        return
      }
      val quality = (options.getDouble("quality") * 100).toInt()
      val targetWidth = if (options.hasKey("width")) options.getInt("width") else 0
      val targetHeight = if (options.hasKey("height")) options.getInt("height") else 0

      val resizedBitmap = if (targetWidth > 0 && targetHeight > 0) {
        Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
      } else {
        bitmap
      }

      val outputFile = File(outputPath)
      FileOutputStream(outputFile).use { out ->
        resizedBitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
      }

      if (resizedBitmap !== bitmap) {
        resizedBitmap.recycle()
      }
      bitmap.recycle()

      promise.resolve("file://$outputPath")
    } catch (e: Exception) {
      promise.reject("COMPRESS_ERROR", e.message)
    }
  }

  override fun readBase64(uri: String, promise: Promise) {
    try {
      val file = resolveUri(uri)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File not found: $uri")
        return
      }

      val bytes = file.readBytes()
      val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
      promise.resolve(base64)
    } catch (e: Exception) {
      promise.reject("READ_BASE64_ERROR", e.message)
    }
  }

  override fun getCacheDirectory(promise: Promise) {
    val cacheDir = reactApplicationContext.cacheDir.absolutePath
    promise.resolve(cacheDir)
  }

  override fun deleteFile(path: String, promise: Promise) {
    try {
      val uri = Uri.parse(path)
      if (uri.scheme == "content") {
        promise.resolve(null)
        return
      }
      val cleanPath = path.replace("file://", "")
      val file = File(cleanPath)
      if (file.exists()) {
        file.delete()
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("DELETE_ERROR", e.message)
    }
  }

  override fun clearCache(promise: Promise) {
    try {
      val cacheDir = reactApplicationContext.cacheDir
      cacheDir.listFiles()?.forEach { file ->
        if (file.name.startsWith("imagehub_")) {
          file.delete()
        }
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CLEAR_CACHE_ERROR", e.message)
    }
  }

  override fun cropImage(
    uri: String,
    offsetX: Double,
    offsetY: Double,
    cropWidth: Double,
    cropHeight: Double,
    displayWidth: Double,
    displayHeight: Double,
    quality: Double,
    format: String,
    includeBase64: Boolean,
    promise: Promise
  ) {
    try {
      val file = resolveUri(uri)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File not found: $uri")
        return
      }

      val bitmap = loadBitmapWithExif(file.absolutePath)
      if (bitmap == null) {
        promise.reject("DECODE_ERROR", "Failed to decode image: $uri")
        return
      }

      val x = offsetX.toInt()
      val y = offsetY.toInt()
      val w = cropWidth.toInt()
      val h = cropHeight.toInt()

      val croppedBitmap = Bitmap.createBitmap(bitmap, x, y, w, h)

      val dw = displayWidth.toInt()
      val dh = displayHeight.toInt()
      val finalBitmap = if (dw > 0 && dh > 0) {
        val scaled = Bitmap.createScaledBitmap(croppedBitmap, dw, dh, true)
        if (scaled !== croppedBitmap) {
          croppedBitmap.recycle()
        }
        scaled
      } else {
        croppedBitmap
      }

      if (finalBitmap !== bitmap) {
        bitmap.recycle()
      }

      val compressFormat = when (format.lowercase()) {
        "png" -> Bitmap.CompressFormat.PNG
        else -> Bitmap.CompressFormat.JPEG
      }
      val ext = if (format.lowercase() == "png") ".png" else ".jpg"

      val cacheDir = reactApplicationContext.cacheDir
      val outputFile = File(cacheDir, "imagehub_crop_${System.currentTimeMillis()}$ext")
      FileOutputStream(outputFile).use { out ->
        finalBitmap.compress(compressFormat, (quality * 100).toInt(), out)
      }

      val result = Arguments.createMap()
      result.putString("uri", "file://${outputFile.absolutePath}")
      result.putInt("width", finalBitmap.width)
      result.putInt("height", finalBitmap.height)
      result.putString("type", compressFormat.toString().lowercase())
      result.putDouble("size", outputFile.length().toDouble())

      if (includeBase64) {
        val bytes = outputFile.readBytes()
        result.putString("base64", Base64.encodeToString(bytes, Base64.NO_WRAP))
      }

      finalBitmap.recycle()
      promise.resolve(result)
    } catch (e: Exception) {
      Log.e(TAG, "Error cropping image", e)
      promise.reject("CROP_ERROR", e.message)
    }
  }

  override fun onNewIntent(intent: Intent) {
    // Not used
  }

  private fun getMimeType(fileName: String): String {
    return when {
      fileName.endsWith(".jpg", true) || fileName.endsWith(".jpeg", true) -> "image/jpeg"
      fileName.endsWith(".png", true) -> "image/png"
      fileName.endsWith(".webp", true) -> "image/webp"
      else -> "image/jpeg"
    }
  }

  private fun loadBitmapWithExif(filePath: String): Bitmap? {
    val bitmap = BitmapFactory.decodeFile(filePath) ?: return null
    return try {
      val exif = ExifInterface(filePath)
      val orientation = exif.getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL
      )
      val rotation = when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
        else -> 0f
      }
      if (rotation != 0f) {
        val matrix = Matrix().apply { postRotate(rotation) }
        val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
        if (rotated !== bitmap) {
          bitmap.recycle()
        }
        rotated
      } else {
        bitmap
      }
    } catch (e: Exception) {
      bitmap
    }
  }

  private fun getExifDimensions(filePath: String): Pair<Int, Int> {
    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(filePath, options)
    val width = options.outWidth
    val height = options.outHeight
    return try {
      val exif = ExifInterface(filePath)
      val orientation = exif.getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL
      )
      if (orientation == ExifInterface.ORIENTATION_ROTATE_90 ||
        orientation == ExifInterface.ORIENTATION_ROTATE_270
      ) {
        Pair(height, width)
      } else {
        Pair(width, height)
      }
    } catch (e: Exception) {
      Pair(width, height)
    }
  }

  private fun resolveUri(uriString: String): File {
    val uri = Uri.parse(uriString)
    if (uri.scheme == "content") {
      val cacheDir = reactApplicationContext.cacheDir
      val inputStream = reactApplicationContext.contentResolver.openInputStream(uri)
        ?: throw Exception("Cannot open content URI: $uriString")
      val fileName = "imagehub_${System.currentTimeMillis()}_${uri.lastPathSegment ?: "temp"}"
      val tempFile = File(cacheDir, fileName)
      tempFile.outputStream().use { output ->
        inputStream.copyTo(output)
      }
      inputStream.close()
      return tempFile
    }
    val path = uriString.replace("file://", "")
    return File(path)
  }
}
