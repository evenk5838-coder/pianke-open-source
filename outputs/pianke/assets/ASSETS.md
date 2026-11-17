# 素材来源与许可

第三方照片的许可与代码许可证分别适用。当前照片是静态摄影，没有附带现场录音；环境音为独立实录素材，见[audio/LICENSES.md](audio/LICENSES.md)。

## lake.jpg

- 作品：Misty Lake。
- 摄影师：[Dan Field](https://500px.com/DannyFunf)。
- 来源：[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Misty_Lake_(127466595).jpeg)。
- 许可：[CC BY 3.0 Unported](https://creativecommons.org/licenses/by/3.0/)。
- 改动：从原始图缩放至 1600 × 1066 并重新编码；公开副本移除了 EXIF / IPTC 等嵌入元数据，未改变解码后的图像像素。界面可能裁切显示。
- 署名：Misty Lake — Dan Field / CC BY 3.0，已缩放并移除嵌入元数据，显示时可能裁切。

## forest.jpg

- 作品：Forest Away Path，作者 Seaq68。
- 来源：[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Forest_Away_Path.jpg)。
- 历史来源：Pixabay 作品 2942477，Commons 于 2019-02-17 记录许可核验。
- 许可：[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)。
- 文件为 1280 × 853 缩略图，界面可能裁切显示；本次检查未发现嵌入元数据。

## 本项目素材

- `body-luminous-v3.png`：AI 生成的无面容、无性别特征发光打坐插画，1254 × 1254 RGBA，没有真人肖像参考；提示词随源文件保留。本次检查未发现嵌入元数据。
- 身体局部亮区、水波、眼部 SVG、应用动效和程序声音由项目代码生成，按项目 MIT 许可证提供。插画也随项目按该许可证提供。
- 眼部示意的公开资料来源见 [eye-guide-sources.md](eye-guide-sources.md)。没有复制教学视频、原图或录音；图形未经过专业逐图审校。
- 没有打包第三方人声、音乐或 8K 视频。系统语音授权不随源码许可证转移。

## 固定人声与背景音

0.3.5包含48段Marin AI固定引导、7条CC0环境录音和4首CC BY 4.0配乐。详见[人声来源](voice/marin/PROVENANCE.md)、[音频许可](audio/LICENSES.md)和[署名](audio/ATTRIBUTION.md)。这些声音不是照片拍摄地点的同期录音。


## 0.3.6 AI 静态场景

assets/scenes 中14张图片由本项目通过AI生成，用于七类环境声各两种画面。每张1672×941，为静态图片而非8K或循环视频。运河晚居与云端雨夜采用最后修订的空间构图；在屏幕中可能按比例裁切。保留原PNG及C2PA生成来源信息，不使用真人肖像。

文件编号、名称、尺寸、哈希与生成来源见 [scenes/manifest.json](scenes/manifest.json)。这些AI场景不代表真实拍摄地点，环境录音是独立素材，不能视为画面所在地的同期声音。本项目可授权的生成图片权利按根目录MIT许可提供，不宣称生成图独占性或第三方内容的额外授权。音频许可与署名独立适用。
