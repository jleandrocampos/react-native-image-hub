#import "ImageHub.h"
#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <PhotosUI/PhotosUI.h>
#import <MobileCoreServices/MobileCoreServices.h>

@implementation ImageHub

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(openGallery:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    self.galleryResolve = resolve;
    self.galleryReject = reject;
    self.galleryMultiple = [options[@"multiple"] boolValue];
    self.galleryMaxFiles = [options[@"maxFiles"] integerValue];

    PHPickerConfiguration *config = [[PHPickerConfiguration alloc] init];
    config.selectionLimit = self.galleryMultiple ? 0 : 1;
    config.filter = [PHPickerFilter imagesFilter];

    PHPickerViewController *picker = [[PHPickerViewController alloc] initWithConfiguration:config];
    picker.delegate = self;

    UIViewController *rootViewController = [UIApplication sharedApplication].keyWindow.rootViewController;
    [rootViewController presentViewController:picker animated:YES completion:nil];
  });
}

- (void)picker:(PHPickerViewController *)picker didFinishPicking:(NSArray<PHPickerResult *> *)results {
  [picker dismissViewControllerAnimated:YES completion:nil];

  if (results.count == 0) {
    if (self.galleryReject) {
      self.galleryReject(@"CANCELLED", @"Gallery selection cancelled", nil);
      self.galleryResolve = nil;
      self.galleryReject = nil;
      return;
    }
  }

  NSMutableArray *selectedImages = [NSMutableArray array];
  dispatch_group_t group = dispatch_group_create();

  for (PHPickerResult *result in results) {
    dispatch_group_enter(group);
    [result.itemProvider loadObjectOfClass:[UIImage class] completionHandler:^(id _Nullable object, NSError * _Nullable error) {
      if ([object isKindOfClass:[UIImage class]]) {
        UIImage *image = (UIImage *)object;
        NSString *uri = [self saveImageToCache:image];
        CGSize size = image.size;
        NSString *mimeType = [self getMimeTypeForImage:uri];

        NSDictionary *imageInfo = @{
          @"uri": uri,
          @"width": @(size.width),
          @"height": @(size.height),
          @"mime": mimeType ?: @"image/jpeg"
        };
        [selectedImages addObject:imageInfo];
      }
      dispatch_group_leave(group);
    }];
  }

  dispatch_group_notify(group, dispatch_get_main_queue(), ^{
    if (self.galleryResolve) {
      self.galleryResolve(selectedImages);
      self.galleryResolve = nil;
      self.galleryReject = nil;
    }
  });
}

- (NSString *)saveImageToCache:(UIImage *)image {
  NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
  NSString *cacheDir = [paths firstObject];
  NSString *fileName = [NSString stringWithFormat:@"imagehub_%ld_%d.jpg",
                        (long)[[NSDate date] timeIntervalSince1970],
                        arc4random_uniform(10000)];
  NSString *filePath = [cacheDir stringByAppendingPathComponent:fileName];

   NSData *jpegData = UIImageJPEGRepresentation([self normalizedImage:image], 0.9);
  [jpegData writeToFile:filePath atomically:YES];

  return [NSString stringWithFormat:@"file://%@", filePath];
}

- (NSString *)getMimeTypeForImage:(NSString *)uri {
  if ([uri hasSuffix:@".png"]) return @"image/png";
  if ([uri hasSuffix:@".webp"]) return @"image/webp";
  return @"image/jpeg";
}

- (UIImage *)normalizedImage:(UIImage *)image {
  if (image.imageOrientation == UIImageOrientationUp) {
    return image;
  }
  UIGraphicsBeginImageContextWithOptions(image.size, NO, image.scale);
  [image drawInRect:CGRectMake(0, 0, image.size.width, image.size.height)];
  UIImage *normalized = UIGraphicsGetImageFromCurrentImageContext();
  UIGraphicsEndImageContext();
  return normalized ?: image;
}

- (NSString *)resolvePathFromUri:(NSString *)uriString {
  if ([uriString hasPrefix:@"file://"]) {
    return [uriString stringByReplacingOccurrencesOfString:@"file://" withString:@""];
  }
  NSURL *url = [NSURL URLWithString:uriString];
  NSData *data = [NSData dataWithContentsOfURL:url];
  if (data) {
    NSString *fileName = [NSString stringWithFormat:@"imagehub_%ld.tmp", (long)[[NSDate date] timeIntervalSince1970]];
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
    NSString *cacheDir = [paths firstObject];
    NSString *filePath = [cacheDir stringByAppendingPathComponent:fileName];
    [data writeToFile:filePath atomically:YES];
    return filePath;
  }
  return uriString;
}

RCT_EXPORT_METHOD(getImageInfo:(NSString *)uri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSString *path = [self resolvePathFromUri:uri];
  UIImage *image = [UIImage imageWithContentsOfFile:path];

  if (!image) {
    reject(@"FILE_NOT_FOUND", @"File not found", nil);
    return;
  }

  image = [self normalizedImage:image];

  CGSize size = image.size;
  NSDictionary *attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:path error:nil];
  NSNumber *sizeNum = attrs ? attrs[NSFileSize] : nil;
  NSDictionary *info = @{
    @"width": @(size.width),
    @"height": @(size.height),
    @"mime": [self getMimeTypeForImage:uri] ?: @"image/jpeg",
    @"size": sizeNum ? @([sizeNum doubleValue]) : @(0)
  };
  resolve(info);
}

RCT_EXPORT_METHOD(compressImage:(NSString *)inputUri
                  outputPath:(NSString *)outputPath
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSString *inputPath = [self resolvePathFromUri:inputUri];
  UIImage *image = [UIImage imageWithContentsOfFile:inputPath];

  if (!image) {
    reject(@"FILE_NOT_FOUND", @"File not found", nil);
    return;
  }

  image = [self normalizedImage:image];

  CGFloat quality = [options[@"quality"] floatValue];
  NSNumber *targetWidth = options[@"width"];
  NSNumber *targetHeight = options[@"height"];

  UIImage *processedImage = image;

  if (targetWidth && targetHeight) {
    CGSize targetSize = CGSizeMake([targetWidth floatValue], [targetHeight floatValue]);
    UIGraphicsBeginImageContextWithOptions(targetSize, NO, 0.0);
    [image drawInRect:CGRectMake(0, 0, targetSize.width, targetSize.height)];
    processedImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
  }

  NSData *jpegData = UIImageJPEGRepresentation(processedImage, quality);
  [jpegData writeToFile:outputPath atomically:YES];

  resolve([NSString stringWithFormat:@"file://%@", outputPath]);
}

RCT_EXPORT_METHOD(readBase64:(NSString *)uri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSString *path = [self resolvePathFromUri:uri];
  NSData *data = [NSData dataWithContentsOfFile:path];

  if (!data) {
    reject(@"FILE_NOT_FOUND", @"File not found", nil);
    return;
  }

  NSString *base64 = [data base64EncodedStringWithOptions:0];
  resolve(base64);
}

RCT_EXPORT_METHOD(getCacheDirectory:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
  resolve([paths firstObject]);
}

RCT_EXPORT_METHOD(deleteFile:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if ([path hasPrefix:@"content://"]) {
    resolve(nil);
    return;
  }
  NSString *cleanPath = [path stringByReplacingOccurrencesOfString:@"file://" withString:@""];
  NSFileManager *fileManager = [NSFileManager defaultManager];
  if ([fileManager fileExistsAtPath:cleanPath]) {
    [fileManager removeItemAtPath:cleanPath error:nil];
  }
  resolve(nil);
}

RCT_EXPORT_METHOD(cropImage:(NSString *)uri
                  offsetX:(double)offsetX
                  offsetY:(double)offsetY
                  cropWidth:(double)cropWidth
                  cropHeight:(double)cropHeight
                  displayWidth:(double)displayWidth
                  displayHeight:(double)displayHeight
                  quality:(double)quality
                  format:(NSString *)format
                  includeBase64:(BOOL)includeBase64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSString *path = [self resolvePathFromUri:uri];
  UIImage *image = [UIImage imageWithContentsOfFile:path];

  if (!image) {
    reject(@"FILE_NOT_FOUND", @"File not found", nil);
    return;
  }

  image = [self normalizedImage:image];

  CGImageRef imageRef = CGImageCreateWithImageInRect(
    image.CGImage,
    CGRectMake(offsetX, offsetY, cropWidth, cropHeight)
  );

  if (!imageRef) {
    reject(@"CROP_ERROR", @"Failed to crop image", nil);
    return;
  }

  UIImage *croppedImage = [UIImage imageWithCGImage:imageRef];
  CGImageRelease(imageRef);

  UIImage *finalImage = croppedImage;
  if (displayWidth > 0 && displayHeight > 0) {
    UIGraphicsBeginImageContextWithOptions(CGSizeMake(displayWidth, displayHeight), NO, 0.0);
    [croppedImage drawInRect:CGRectMake(0, 0, displayWidth, displayHeight)];
    finalImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
  }

  NSString *ext = [format.lowercaseString isEqualToString:@"png"] ? @".png" : @".jpg";
  NSString *fileName = [NSString stringWithFormat:@"imagehub_crop_%ld%@",
                        (long)[[NSDate date] timeIntervalSince1970], ext];
  NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
  NSString *cacheDir = [paths firstObject];
  NSString *filePath = [cacheDir stringByAppendingPathComponent:fileName];

  NSData *imageData;
  if ([format.lowercaseString isEqualToString:@"png"]) {
    imageData = UIImagePNGRepresentation(finalImage);
  } else {
    imageData = UIImageJPEGRepresentation(finalImage, quality);
  }
  [imageData writeToFile:filePath atomically:YES];

  NSString *fileUri = [NSString stringWithFormat:@"file://%@", filePath];
  NSDictionary *cropAttrs = [[NSFileManager defaultManager] attributesOfItemAtPath:filePath error:nil];
  NSNumber *cropSizeNum = cropAttrs ? cropAttrs[NSFileSize] : nil;
  unsigned long fileSize = cropSizeNum ? [cropSizeNum unsignedLongValue] : 0;

  NSMutableDictionary *result = [NSMutableDictionary dictionary];
  result[@"uri"] = fileUri;
  result[@"width"] = @(finalImage.size.width);
  result[@"height"] = @(finalImage.size.height);
  result[@"type"] = [format.lowercaseString isEqualToString:@"png"] ? @"image/png" : @"image/jpeg";
  result[@"size"] = @(fileSize);

  if (includeBase64) {
    result[@"base64"] = [imageData base64EncodedStringWithOptions:0];
  }

  resolve(result);
}

RCT_EXPORT_METHOD(clearCache:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
  NSString *cacheDir = [paths firstObject];
  NSFileManager *fileManager = [NSFileManager defaultManager];
  NSArray *files = [fileManager contentsOfDirectoryAtPath:cacheDir error:nil];

  for (NSString *file in files) {
    if ([file hasPrefix:@"imagehub_"]) {
      [fileManager removeItemAtPath:[cacheDir stringByAppendingPathComponent:file] error:nil];
    }
  }
  resolve(nil);
}

@end
