package com.imagehub

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
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
    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No current activity available")
      return
    }

    galleryPromise = promise
    galleryMultiple = options.getBoolean("multiple")
    galleryMaxFiles = options.getInt("maxFiles").coerceAtLeast(1)

    try {
      // System Photo Picker — no CAMERA / no broad storage. Do NOT use createChooser:
      // HyperOS/MIUI injects Camera into the chooser and triggers CAMERA permission.
      activity.startActivityForResult(createGalleryIntent(), PICK_IMAGE_REQUEST)
    } catch (e: Exception) {
      galleryPromise = null
      Log.e(TAG, "Failed to open gallery", e)
      promise.reject("GALLERY_ERROR", e.message ?: "Failed to open gallery")
    }
  }

  /**
   * Prefer MediaStore.ACTION_PICK_IMAGES (Android 13+ / HyperOS Photo Picker).
   * Fallback: ACTION_GET_CONTENT without createChooser (keeps Camera out of the UI).
   */
  private fun createGalleryIntent(): Intent {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return Intent(MediaStore.ACTION_PICK_IMAGES).apply {
        type = "image/*"
        if (galleryMultiple) {
          putExtra(
            MediaStore.EXTRA_PICK_IMAGES_MAX,
            galleryMaxFiles.coerceAtLeast(2)
          )
        }
      }
    }

    return Intent(Intent.ACTION_GET_CONTENT).apply {
      type = "image/*"
      addCategory(Intent.CATEGORY_OPENABLE)
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, galleryMultiple)
    }
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
      // Materialize content:// into cache as file:// so cropper/Image work on MIUI/Xiaomi.
      val localFile = copyUriToCache(uri)
      val (width, height) = getExifDimensions(localFile.absolutePath)
      if (width <= 0 || height <= 0) {
        Log.e(TAG, "Invalid image bounds for uri=$uri")
        return null
      }

      val map = Arguments.createMap()
      map.putString("uri", "file://${localFile.absolutePath}")
      map.putInt("width", width)
      map.putInt("height", height)
      map.putString(
        "mime",
        reactApplicationContext.contentResolver.getType(uri) ?: "image/jpeg"
      )
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
      if (width <= 0 || height <= 0) {
        promise.reject("IMAGE_INFO_ERROR", "Invalid image dimensions for: $uri")
        return
      }

      val map = Arguments.createMap()
      map.putInt("width", width)
      map.putInt("height", height)
      map.putString("mime", getMimeType(file.name))
      map.putDouble("size", file.length().toDouble())
      map.putString("modificationDate", null)
      // Always expose a stable local path (important when input was content://).
      map.putString("path", "file://${file.absolutePath}")
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
      return copyUriToCache(uri)
    }
    val path = uriString.replace("file://", "")
    return File(path)
  }

  /**
   * Copy a content/file URI into app cache with a safe filename.
   * Xiaomi/MIUI gallery URIs often include ":" or "/" in lastPathSegment,
   * which breaks File creation and makes the cropper fail immediately.
   */
  private fun copyUriToCache(uri: Uri): File {
    val cacheDir = reactApplicationContext.cacheDir
    val inputStream: InputStream =
      reactApplicationContext.contentResolver.openInputStream(uri)
        ?: throw Exception("Cannot open URI: $uri")

    val safeName = "imagehub_${System.currentTimeMillis()}_${(Math.random() * 10000).toInt()}.jpg"
    val tempFile = File(cacheDir, safeName)
    try {
      tempFile.outputStream().use { output ->
        inputStream.copyTo(output)
      }
    } finally {
      try {
        inputStream.close()
      } catch (_: Exception) {
      }
    }
    return tempFile
  }
}
