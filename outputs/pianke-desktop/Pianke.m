#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#import <Carbon/Carbon.h>

@interface PiankePanel : NSPanel
@end
@implementation PiankePanel
- (BOOL)canBecomeKeyWindow { return YES; }
- (BOOL)canBecomeMainWindow { return YES; }
@end

@interface PiankeDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate>
@property(nonatomic,strong) PiankePanel *panel;
@property(nonatomic,strong) WKWebView *web;
@property(nonatomic,strong) NSVisualEffectView *glass;
@property(nonatomic,strong) NSStatusItem *status;
@property(nonatomic,strong) NSMenu *statusMenu;
@property(nonatomic,copy) NSString *mode;
@property(nonatomic,copy) NSString *theme;
@property(nonatomic,copy) NSString *diagnosticPath;
@property(nonatomic) BOOL shortcutRegistered;
@property(nonatomic) EventHotKeyRef hotKey;
@property(nonatomic) EventHandlerRef hotKeyHandler;
@property(nonatomic,strong) NSTimer *windowMotionTimer;
@property(nonatomic,strong) NSTimer *redrawTimer;
@property(nonatomic) NSUInteger transitionID;
@property(nonatomic) BOOL panelRequestedVisible;
@property(nonatomic) NSRect restingFrame;
- (void)togglePanel;
- (void)logStatusPlacement;
@end

static OSStatus hotKeyPressed(EventHandlerCallRef next, EventRef event, void *context) {
    EventHotKeyID key;
    OSStatus result=GetEventParameter(event,kEventParamDirectObject,typeEventHotKeyID,NULL,sizeof(key),NULL,&key);
    if(result==noErr && key.signature=='Pk01' && key.id==1) {
        PiankeDelegate *delegate=(__bridge PiankeDelegate *)context;
        dispatch_async(dispatch_get_main_queue(), ^{ [delegate togglePanel]; });
    }
    return noErr;
}

static NSImage *piankeStatusImage(void) {
    NSImage *image=[NSImage imageWithSize:NSMakeSize(18,18) flipped:NO drawingHandler:^BOOL(NSRect rect) {
        [NSColor.blackColor setStroke];
        for(NSNumber *radius in @[@2.0,@5.0,@8.0]) {
            NSBezierPath *ring=[NSBezierPath bezierPath];ring.lineWidth=1.45;ring.lineCapStyle=NSLineCapStyleRound;
            [ring appendBezierPathWithArcWithCenter:NSMakePoint(9,9) radius:radius.doubleValue startAngle:45 endAngle:320 clockwise:NO];
            [ring stroke];
        }
        return YES;
    }];
    image.template=YES;image.accessibilityDescription=@"片刻水波";return image;
}

@implementation PiankeDelegate
- (void)log:(NSString *)name details:(id)details {
    if(!self.diagnosticPath.length)return;
    NSDictionary *entry=@{@"event":name,@"details":details?:@{},@"time":@([[NSDate date] timeIntervalSince1970])};
    NSData *json=[NSJSONSerialization dataWithJSONObject:entry options:0 error:nil];
    if(!json)return;
    NSMutableData *line=[json mutableCopy];[line appendData:[@"\n" dataUsingEncoding:NSUTF8StringEncoding]];
    if(![[NSFileManager defaultManager] fileExistsAtPath:self.diagnosticPath])[[NSFileManager defaultManager] createFileAtPath:self.diagnosticPath contents:nil attributes:nil];
    NSFileHandle *file=[NSFileHandle fileHandleForWritingAtPath:self.diagnosticPath];
    @try {[file seekToEndOfFile];[file writeData:line];[file closeFile];} @catch(NSException *exception) {}
}
- (NSScreen *)currentScreen {return self.panel.screen?:NSScreen.mainScreen?:NSScreen.screens.firstObject;}
- (BOOL)reduceMotion {return NSWorkspace.sharedWorkspace.accessibilityDisplayShouldReduceMotion;}
- (void)cancelWindowMotion {
    self.transitionID++;
    [self.windowMotionTimer invalidate];self.windowMotionTimer=nil;
}
- (void)animateWindowToFrame:(NSRect)target alpha:(CGFloat)alpha duration:(NSTimeInterval)duration completion:(void (^)(void))completion {
    [self cancelWindowMotion];
    // Animate only position and opacity; resizing a live WebGL view every frame is costly.
    NSRect from=self.panel.frame;CGFloat fromAlpha=self.panel.alphaValue;
    if([self reduceMotion]||duration<=0){[self.panel setFrame:target display:YES];self.panel.alphaValue=alpha;if(completion)completion();return;}
    NSUInteger token=self.transitionID;CFAbsoluteTime began=CFAbsoluteTimeGetCurrent();
    __weak PiankeDelegate *weakSelf=self;
    NSTimer *timer=[NSTimer timerWithTimeInterval:1.0/60.0 repeats:YES block:^(NSTimer *timer){
        PiankeDelegate *owner=weakSelf;
        if(!owner||token!=owner.transitionID){[timer invalidate];return;}
        CGFloat progress=MIN(1,MAX(0,(CFAbsoluteTimeGetCurrent()-began)/duration));
        CGFloat eased=1-pow(1-progress,3);
        [owner.panel setFrameOrigin:NSMakePoint(from.origin.x+(target.origin.x-from.origin.x)*eased,from.origin.y+(target.origin.y-from.origin.y)*eased)];
        owner.panel.alphaValue=fromAlpha+(alpha-fromAlpha)*eased;
        if(progress>=1){
            [timer invalidate];owner.windowMotionTimer=nil;
            [owner.panel setFrame:target display:YES];owner.panel.alphaValue=alpha;
            if(completion)completion();
        }
    }];
    self.windowMotionTimer=timer;[NSRunLoop.mainRunLoop addTimer:timer forMode:NSRunLoopCommonModes];
}
- (void)notifyTransition:(NSString *)phase {
    NSDictionary *state=@{@"phase":phase,@"mode":self.mode?:@"home",@"reducedMotion":@([self reduceMotion])};
    NSData *data=[NSJSONSerialization dataWithJSONObject:state options:0 error:nil];
    NSString *json=[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    [self.web evaluateJavaScript:[NSString stringWithFormat:@"window.piankeHostTransition?.(%@)",json] completionHandler:nil];
}
- (void)applyModeAppearance {
    BOOL immersive=[self.mode isEqual:@"immersive"];
    NSApp.presentationOptions=immersive&&self.panelRequestedVisible?(NSApplicationPresentationAutoHideDock|NSApplicationPresentationAutoHideMenuBar):NSApplicationPresentationDefault;
    self.panel.level=([self.mode isEqual:@"floating"]||[self.mode isEqual:@"home"])?NSFloatingWindowLevel:NSNormalWindowLevel;
    self.glass.layer.cornerRadius=immersive?0:28;
    self.panel.appearance=[NSAppearance appearanceNamed:[self.theme isEqual:@"dusk"]?NSAppearanceNameDarkAqua:NSAppearanceNameAqua];
    self.glass.material=[self.theme isEqual:@"mist"]?NSVisualEffectMaterialPopover:NSVisualEffectMaterialHUDWindow;
}
- (void)accessibilityDisplayOptionsChanged:(NSNotification *)notification {
    if([self reduceMotion]&&self.windowMotionTimer){
        [self cancelWindowMotion];
        [self.panel setFrame:self.restingFrame display:YES];self.panel.alphaValue=1;
        if(!self.panelRequestedVisible)[self.panel orderOut:nil];
        [self applyModeAppearance];[self notifyTransition:@"settled"];
    }
    [self notifyState];
}
- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    NSArray *args=NSProcessInfo.processInfo.arguments;
    NSUInteger pos=[args indexOfObject:@"-diagnostics"];
    if(pos!=NSNotFound && pos+1<args.count)self.diagnosticPath=args[pos+1];
    self.mode=@"home";
    self.theme=@"minimal";
    [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
    NSMenu *main=[[NSMenu alloc] initWithTitle:@"片刻"];
    NSMenuItem *root=[[NSMenuItem alloc] initWithTitle:@"片刻" action:nil keyEquivalent:@""];
    NSMenu *appMenu=[[NSMenu alloc] initWithTitle:@"片刻"];
    [appMenu addItemWithTitle:@"退出片刻" action:@selector(terminate:) keyEquivalent:@"q"];
    root.submenu=appMenu;[main addItem:root];NSApp.mainMenu=main;

    self.panel=[[PiankePanel alloc] initWithContentRect:NSMakeRect(0,0,1180,680) styleMask:NSWindowStyleMaskBorderless|NSWindowStyleMaskResizable backing:NSBackingStoreBuffered defer:NO];
    self.panel.title=@"片刻";self.panel.delegate=self;self.panel.opaque=NO;self.panel.backgroundColor=NSColor.clearColor;
    self.panel.hasShadow=YES;self.panel.releasedWhenClosed=NO;self.panel.hidesOnDeactivate=NO;
    self.panel.appearance=[NSAppearance appearanceNamed:NSAppearanceNameAqua];
    self.panel.collectionBehavior=NSWindowCollectionBehaviorCanJoinAllSpaces|NSWindowCollectionBehaviorFullScreenAuxiliary;
    self.panel.minSize=NSMakeSize(370,320);self.panel.animationBehavior=NSWindowAnimationBehaviorNone;
    self.glass=[[NSVisualEffectView alloc] initWithFrame:self.panel.contentView.bounds];
    self.glass.autoresizingMask=NSViewWidthSizable|NSViewHeightSizable;
    self.glass.material=NSVisualEffectMaterialHUDWindow;self.glass.blendingMode=NSVisualEffectBlendingModeBehindWindow;
    self.glass.state=NSVisualEffectStateActive;self.glass.wantsLayer=YES;self.glass.layer.cornerRadius=30;self.glass.layer.masksToBounds=YES;
    self.panel.contentView=self.glass;

    WKWebViewConfiguration *config=[WKWebViewConfiguration new];
    config.websiteDataStore=WKWebsiteDataStore.defaultDataStore;
    [config.userContentController addScriptMessageHandler:self name:@"pianke"];
    NSString *bridgePath=[NSBundle.mainBundle pathForResource:@"native" ofType:@"js"];
    NSString *bridge=[NSString stringWithContentsOfFile:bridgePath encoding:NSUTF8StringEncoding error:nil];
    if(bridge)[config.userContentController addUserScript:[[WKUserScript alloc] initWithSource:bridge injectionTime:WKUserScriptInjectionTimeAtDocumentEnd forMainFrameOnly:YES]];
    self.web=[[WKWebView alloc] initWithFrame:self.glass.bounds configuration:config];
    self.web.autoresizingMask=NSViewWidthSizable|NSViewHeightSizable;self.web.navigationDelegate=self;self.web.UIDelegate=self;
    [self.web setValue:@NO forKey:@"drawsBackground"];
    [self.glass addSubview:self.web];
    NSURL *resource=[NSBundle.mainBundle.resourceURL URLByAppendingPathComponent:@"web" isDirectory:YES];
    [self.web loadFileURL:[resource URLByAppendingPathComponent:@"index.html"] allowingReadAccessToURL:resource];

    // Seed only our item's first repaired placement. Subsequent user drags stay intact.
    NSUserDefaults *defaults=NSUserDefaults.standardUserDefaults;
    if(![defaults boolForKey:@"PiankeStatusPlacementRepairedV1"]){
        NSString *positionKey=@"NSStatusItem Preferred Position PiankeMainStatus";
        id previous=[defaults objectForKey:positionKey];
        if(previous)[defaults setObject:previous forKey:@"PiankeStatusPositionBeforeRepair"];
        [defaults setDouble:0 forKey:positionKey];
        [defaults setBool:YES forKey:@"PiankeStatusPlacementRepairedV1"];
    }
    self.status=[NSStatusBar.systemStatusBar statusItemWithLength:NSSquareStatusItemLength];
    self.status.autosaveName=@"PiankeMainStatus";self.status.visible=YES;
    self.status.button.image=piankeStatusImage();
    self.status.button.title=@"";
    self.status.button.imagePosition=NSImageOnly;self.status.button.enabled=YES;
    [self.status.button setAccessibilityLabel:@"片刻，点击打开或收起，右键退出"];
    self.status.button.target=self;self.status.button.action=@selector(statusClicked:);
    [self.status.button sendActionOn:NSEventMaskLeftMouseUp|NSEventMaskRightMouseUp];
    self.statusMenu=[[NSMenu alloc] initWithTitle:@"片刻"];
    for(NSArray *item in @[@[@"打开片刻",NSStringFromSelector(@selector(showHome))],@[@"收起片刻",NSStringFromSelector(@selector(hidePanel))],@[@"使用说明",NSStringFromSelector(@selector(showHelp))]]) {
        NSMenuItem *row=[[NSMenuItem alloc] initWithTitle:item[0] action:NSSelectorFromString(item[1]) keyEquivalent:@""];row.target=self;[self.statusMenu addItem:row];
    }
    [self.statusMenu addItem:NSMenuItem.separatorItem];
    NSMenuItem *quit=[[NSMenuItem alloc] initWithTitle:@"退出片刻" action:@selector(terminate:) keyEquivalent:@"q"];quit.target=NSApp;[self.statusMenu addItem:quit];
    EventTypeSpec type={kEventClassKeyboard,kEventHotKeyPressed};
    EventHandlerRef handler=NULL;OSStatus install=InstallApplicationEventHandler(hotKeyPressed,1,&type,(__bridge void *)self,&handler);self.hotKeyHandler=handler;
    EventHotKeyID ident={'Pk01',1};EventHotKeyRef hotKey=NULL;
    OSStatus registration=install==noErr?RegisterEventHotKey(kVK_ANSI_K,cmdKey|shiftKey,ident,GetApplicationEventTarget(),0,&hotKey):install;
    self.hotKey=hotKey;self.shortcutRegistered=registration==noErr;
    self.status.button.toolTip=self.shortcutRegistered?@"片刻 · ⌘⇧K 呼出或收起 · 右键退出":@"片刻 · 点击呼出 · 右键退出（快捷键被占用）";
    [self log:@"launch" details:@{@"shortcutRegistered":@(self.shortcutRegistered),@"hotKeyStatus":@(registration),@"bundle":NSBundle.mainBundle.bundlePath}];
    [NSWorkspace.sharedWorkspace.notificationCenter addObserver:self selector:@selector(accessibilityDisplayOptionsChanged:) name:NSWorkspaceAccessibilityDisplayOptionsDidChangeNotification object:nil];
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW,(int64_t)(2*NSEC_PER_SEC)),dispatch_get_main_queue(),^{[self logStatusPlacement];});
    [self showHome];
}
- (void)logStatusPlacement {
    NSWindow *window=self.status.button.window;NSScreen *screen=window.screen?:[self currentScreen];NSRect frame=window.frame;
    NSRect right=screen.auxiliaryTopRightArea;
    BOOL inSafeArea=screen.safeAreaInsets.top==0||(NSMinX(frame)>=NSMinX(right)&&NSMaxX(frame)<=NSMaxX(right));
    [self log:@"status-placement" details:@{@"itemVisible":@(self.status.visible),@"buttonWindowVisible":@(window.visible),@"hasImage":@(self.status.button.image!=nil),@"title":self.status.button.title?:@"",@"buttonFrame":NSStringFromRect(self.status.button.frame),@"windowFrame":NSStringFromRect(frame),@"screenFrame":NSStringFromRect(screen.frame),@"safeAreaTop":@(screen.safeAreaInsets.top),@"topRightArea":NSStringFromRect(right),@"insideRightSafeArea":@(inSafeArea),@"presentation":@(NSApp.presentationOptions)}];
}
- (void)applicationDidBecomeActive:(NSNotification *)notification {self.status.visible=YES;[self logStatusPlacement];}
- (void)applicationDidChangeScreenParameters:(NSNotification *)notification {[self placeMode:self.mode];if(!self.panelRequestedVisible)[self.panel orderOut:nil];[self logStatusPlacement];}
- (void)notifyState {
    NSDictionary *state=@{@"mode":self.mode?:@"home",@"shortcut":@(self.shortcutRegistered),@"reducedMotion":@([self reduceMotion])};
    NSData *data=[NSJSONSerialization dataWithJSONObject:state options:0 error:nil];
    NSString *json=[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    [self.web evaluateJavaScript:[NSString stringWithFormat:@"window.piankeHostState?.(%@)",json] completionHandler:nil];
}
- (void)placeMode:(NSString *)mode {
    NSScreen *screen=[self currentScreen];NSRect visible=screen.visibleFrame;NSRect frame;
    BOOL changed=![self.mode isEqual:mode];
    self.mode=mode;
    BOOL immersive=[mode isEqual:@"immersive"];
    CGFloat top=MIN(NSMaxY(visible),NSMaxY(screen.frame)-MAX(screen.safeAreaInsets.top,24));
    if(immersive)frame=screen.frame;
    else if([mode isEqual:@"floating"])frame=NSMakeRect(NSMidX(visible)-210,top-MIN(540,visible.size.height-20),420,MIN(520,visible.size.height-40));
    else {
        CGFloat width=MIN(1480,visible.size.width-64),height=MIN(710,visible.size.height-42);
        frame=NSMakeRect(NSMidX(visible)-width/2,top-height-10,width,height);
    }
    self.restingFrame=frame;
    __weak PiankeDelegate *weakSelf=self;
    if(changed&&self.panel.visible&&self.panelRequestedVisible&&![self reduceMotion]){
        [self notifyTransition:@"mode-out"];
        [self animateWindowToFrame:self.panel.frame alpha:.12 duration:.1 completion:^{
            PiankeDelegate *owner=weakSelf;if(!owner||!owner.panelRequestedVisible)return;
            [owner applyModeAppearance];[owner.panel setFrame:frame display:YES];
            [owner notifyState];[owner notifyTransition:@"mode-in"];
            [owner animateWindowToFrame:frame alpha:1 duration:.22 completion:^{[weakSelf notifyTransition:@"settled"];}];
        }];
    }else{
        [self cancelWindowMotion];[self applyModeAppearance];
        [self.panel setFrame:frame display:YES animate:NO];self.panel.alphaValue=1;
        [self notifyState];[self notifyTransition:@"settled"];
    }
    [self log:@"mode" details:@{@"mode":mode,@"x":@(frame.origin.x),@"y":@(frame.origin.y),@"width":@(frame.size.width),@"height":@(frame.size.height)}];
}
- (void)showPanel {
    BOOL needsEntry=!self.panel.visible||!self.panelRequestedVisible;
    BOOL wasVisible=self.panel.visible;
    self.panelRequestedVisible=YES;[self cancelWindowMotion];[self applyModeAppearance];
    NSRect target=self.restingFrame;
    if(needsEntry&&!wasVisible){NSRect start=target;if(![self.mode isEqual:@"immersive"]&&![self reduceMotion])start.origin.y+=14;[self.panel setFrame:start display:NO];self.panel.alphaValue=[self reduceMotion]?1:0;}
    [NSApp activateIgnoringOtherApps:YES];[self.panel makeKeyAndOrderFront:nil];
    [self.web evaluateJavaScript:[NSString stringWithFormat:@"window.piankeHostShown?.({mode:'%@',shortcut:%@,reducedMotion:%@})",self.mode,self.shortcutRegistered?@"true":@"false",[self reduceMotion]?@"true":@"false"] completionHandler:nil];
    if(needsEntry){
        [self notifyTransition:@"enter"];
        __weak PiankeDelegate *weakSelf=self;
        [self animateWindowToFrame:target alpha:1 duration:.26 completion:^{[weakSelf notifyTransition:@"settled"];}];
    }else{[self.panel setFrame:target display:YES];self.panel.alphaValue=1;[self notifyTransition:@"settled"];}
}
- (void)showHome {[self.web evaluateJavaScript:@"typeof session!=='undefined'&&!!session" completionHandler:^(id result,NSError *error){if(![result boolValue])[self placeMode:@"home"];[self showPanel];}];}
- (void)hidePanel {
    if(!self.panelRequestedVisible)return;
    self.panelRequestedVisible=NO;
    [self.web evaluateJavaScript:@"window.piankeHostPause?.()" completionHandler:nil];
    [self notifyTransition:@"exit"];
    NSRect end=self.panel.frame;if(![self.mode isEqual:@"immersive"])end.origin.y+=10;
    __weak PiankeDelegate *weakSelf=self;
    [self animateWindowToFrame:end alpha:0 duration:.16 completion:^{
        PiankeDelegate *owner=weakSelf;if(!owner||owner.panelRequestedVisible)return;
        [owner.panel orderOut:nil];owner.panel.alphaValue=1;
        [owner.panel setFrame:owner.restingFrame display:NO];[owner applyModeAppearance];
        [owner notifyTransition:@"hidden"];[owner log:@"hide" details:@{@"reducedMotion":@([owner reduceMotion])}];
    }];
}
- (void)togglePanel {if(self.panelRequestedVisible)[self hidePanel];else {[self placeMode:self.mode];[self showPanel];}}
- (void)statusClicked:(id)sender {
    if(NSApp.currentEvent.type==NSEventTypeRightMouseUp){[self.status popUpStatusItemMenu:self.statusMenu];return;}
    [self togglePanel];
}
- (void)showHelp {
    NSAlert *alert=[NSAlert new];alert.messageText=@"片刻 · 本地体验版";
    alert.informativeText=[NSString stringWithFormat:@"点击顶部水波图标呼出或收起。%@\n\n选择练习后，在首屏设置时长并开始。呼吸引导为吸气 4 秒、呼气 6 秒。练习中点击画面显示控制，空格暂停；Esc 切为浮窗。右键水波图标可退出。\n\n收起时暂停，再次打开可继续。界面动效遵循系统的“减少动态效果”设置。素材来源和练习说明可在应用内查看。",self.shortcutRegistered?@"也可使用 ⌘⇧K。":@"⌘⇧K 已被其他应用占用，请用顶部图标。"];[alert runModal];
}
- (void)windowDidResignKey:(NSNotification *)notification {if(self.panelRequestedVisible&&[self.mode isEqual:@"home"] && !NSApp.modalWindow)[self hidePanel];}
- (BOOL)windowShouldClose:(NSWindow *)sender {[self hidePanel];return NO;}
- (void)windowDidResize:(NSNotification *)notification {
    [self.redrawTimer invalidate];__weak PiankeDelegate *weakSelf=self;
    self.redrawTimer=[NSTimer scheduledTimerWithTimeInterval:1.0/60.0 repeats:NO block:^(NSTimer *timer){
        [weakSelf.web evaluateJavaScript:@"if(typeof motion!=='undefined'){motion?.resize();drawMotion();}" completionHandler:nil];weakSelf.redrawTimer=nil;
    }];
}
- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
    if(!message.frameInfo.mainFrame||![message.frameInfo.request.URL.scheme isEqual:@"file"]||![message.body isKindOfClass:NSDictionary.class])return;
    NSDictionary *body=message.body;NSString *action=body[@"action"];
    if([action isEqual:@"mode"]){NSString *value=body[@"value"];if([@[@"home",@"practice",@"immersive",@"floating"] containsObject:value]){[self placeMode:value];[NSApp activateIgnoringOtherApps:YES];[self.panel makeKeyAndOrderFront:nil];}}
    else if([action isEqual:@"appearance"]){NSString *theme=body[@"theme"];if([@[@"minimal",@"mist",@"dusk"] containsObject:theme]){self.theme=theme;[self applyModeAppearance];}}
    else if([action isEqual:@"hide"])[self hidePanel];
    else if([action isEqual:@"drag"] && [self.mode isEqual:@"floating"]){
        CGFloat dx=[body[@"dx"] doubleValue],dy=[body[@"dy"] doubleValue];if(!isfinite(dx)||!isfinite(dy)||fabs(dx)>500||fabs(dy)>500)return;
        NSRect f=self.panel.frame,v=[self currentScreen].visibleFrame;f.origin.x=MAX(NSMinX(v),MIN(NSMaxX(v)-f.size.width,f.origin.x+dx));f.origin.y=MAX(NSMinY(v),MIN(NSMaxY(v)-50,f.origin.y-dy));[self.panel setFrameOrigin:f.origin];
    }
    else if([action isEqual:@"ready"]){[self log:@"web-ready" details:body];[self notifyState];}
    else if([action isEqual:@"log"])[self log:@"web-log" details:body];
}
- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    [self log:@"navigation-ready" details:@{}];[self notifyState];
    [self.web evaluateJavaScript:@"JSON.stringify({title:document.title,cards:document.querySelectorAll('[data-method]').length,bridge:!!window.piankeHostShown,webgl:typeof motion!=='undefined'?motion?.backend:null,errors:window.piankeNativeErrors||[]})" completionHandler:^(id result,NSError *error){[self log:@"render-check" details:result?:error.localizedDescription?:@""];}];
    if([self.mode isEqual:@"home"]){[self.web evaluateJavaScript:@"document.querySelector('.app').getBoundingClientRect().height" completionHandler:^(id result,NSError *error){if([self.mode isEqual:@"home"]&&[result isKindOfClass:NSNumber.class]){NSRect f=self.restingFrame;CGFloat top=NSMaxY(f),h=MIN(MAX([result doubleValue],350),[self currentScreen].visibleFrame.size.height-42);if(fabs(f.size.height-h)<1)return;f.size.height=h;f.origin.y=top-h;self.restingFrame=f;if(self.panelRequestedVisible&&self.panel.visible){[self animateWindowToFrame:f alpha:1 duration:.16 completion:^{[self notifyTransition:@"settled"];}];}else{[self.panel setFrame:f display:NO];}}}];}
}
- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error {[self log:@"navigation-error" details:error.localizedDescription];}
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {[self log:@"web-process-terminated" details:@{}];[webView reload];}
- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url=action.request.URL;
    if([@[@"http",@"https"] containsObject:url.scheme]){if(action.navigationType==WKNavigationTypeLinkActivated)[NSWorkspace.sharedWorkspace openURL:url];decisionHandler(WKNavigationActionPolicyCancel);return;}
    if([url.scheme isEqual:@"file"] && action.navigationType==WKNavigationTypeLinkActivated && ![url.pathExtension isEqual:@"html"]){[NSWorkspace.sharedWorkspace openURL:url];decisionHandler(WKNavigationActionPolicyCancel);return;}
    decisionHandler([url.scheme isEqual:@"file"]?WKNavigationActionPolicyAllow:WKNavigationActionPolicyCancel);
}
- (WKWebView *)webView:(WKWebView *)webView createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration forNavigationAction:(WKNavigationAction *)action windowFeatures:(WKWindowFeatures *)features {
    NSURL *url=action.request.URL;if([@[@"http",@"https",@"file"] containsObject:url.scheme])[NSWorkspace.sharedWorkspace openURL:url];return nil;
}
- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender hasVisibleWindows:(BOOL)flag {if(!flag)[self showPanel];return YES;}
- (void)applicationWillTerminate:(NSNotification *)notification {[self cancelWindowMotion];[self.redrawTimer invalidate];[NSWorkspace.sharedWorkspace.notificationCenter removeObserver:self];NSApp.presentationOptions=NSApplicationPresentationDefault;if(self.hotKey)UnregisterEventHotKey(self.hotKey);if(self.hotKeyHandler)RemoveEventHandler(self.hotKeyHandler);}
@end

int main(int argc,const char *argv[]) {
    @autoreleasepool {NSApplication *app=NSApplication.sharedApplication;PiankeDelegate *delegate=[PiankeDelegate new];app.delegate=delegate;[app run];}
    return 0;
}
