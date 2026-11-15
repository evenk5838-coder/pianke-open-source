# 固定AI人声来源

48段普通话固定引导由本项目使用OpenAI API的Marin预设音色生成，模型gpt-realtime-2.1-mini；不是特定真人声音克隆。自然轻柔的表达在生成指令中指定，API speed=1.0；24kHz单声道16bit原始PCM仅包装成WAV，没有变速、变调或响度后处理。播放速率固定1.0，应用运行无需联网生成。

文案、时长与SHA-256见manifest.json。0.3.5重新生成I01，文案为“可以闭上眼睛。想象一处安静的林间。”，4.4秒。

本项目可授权的固定文件权利按根目录MIT许可提供，不包含Marin音色模型或服务的知识产权。生成服务参见[OpenAI服务协议](https://openai.com/policies/services-agreement/)第4条关于输入与输出的约定；这些AI输出不宣称独占性或真人录制。API Key和生成账户信息未分发。
