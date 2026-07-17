#import <PhotosUI/PhotosUI.h>
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface ImageHub : NSObject <RCTBridgeModule, PHPickerViewControllerDelegate>

@property (nonatomic, strong) RCTPromiseResolveBlock galleryResolve;
@property (nonatomic, strong) RCTPromiseRejectBlock galleryReject;
@property (nonatomic, assign) BOOL galleryMultiple;
@property (nonatomic, assign) NSInteger galleryMaxFiles;

@end
