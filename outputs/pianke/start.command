#!/bin/zsh
cd -- "${0:A:h}"
print '片刻预览：http://127.0.0.1:8766/ （关闭此窗口或按 Ctrl+C 停止）'
python3 -m http.server 8766 --bind 127.0.0.1
