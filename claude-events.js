// Ported from history_events.json in world_execute_claude_history_project.
window.CLAUDE_EVENTS = {
  "first": [
    {
      "at": 0.5,
      "kind": "user",
      "text": "帮我生成配套的 MV 动画"
    },
    {
      "at": 1.2,
      "kind": "assistant",
      "text": "我先分析这首歌的节拍、能量和段落结构，再按分析结果做一支与音乐同步的原创代码／模拟世界主题 MV。"
    },
    {
      "at": 2.05,
      "kind": "status",
      "text": "规划确定性渲染架构以并行处理视频帧"
    },
    {
      "at": 2.55,
      "kind": "summary",
      "text": "Created 2 files, shared 2 files, and 78 more steps"
    },
    {
      "at": 3.0,
      "kind": "row",
      "prefix": "Loaded tools",
      "text": ""
    },
    {
      "at": 3.43,
      "kind": "row",
      "prefix": "Added task",
      "text": "分析音频：节拍、能量、段落"
    },
    {
      "at": 3.86,
      "kind": "row",
      "prefix": "Created",
      "text": "analyze.py"
    },
    {
      "at": 4.28,
      "kind": "preview",
      "prefix": "Read",
      "text": "overview.png",
      "image": "overview_excerpt.png"
    },
    {
      "at": 5.2,
      "kind": "row",
      "prefix": "Fit",
      "text": "precise constant-tempo beat grid and bar phase"
    },
    {
      "at": 5.67,
      "kind": "preview",
      "prefix": "Read",
      "text": "zoom.png",
      "image": "zoom_excerpt.png"
    },
    {
      "at": 6.47,
      "kind": "row",
      "prefix": "Completed task",
      "text": "分析音频：节拍、能量、段落"
    },
    {
      "at": 6.88,
      "kind": "row",
      "prefix": "Created",
      "text": "mv.js"
    },
    {
      "at": 7.28,
      "kind": "error",
      "prefix": "Command failed",
      "text": "Failed"
    },
    {
      "at": 7.66,
      "kind": "row",
      "prefix": "Fix",
      "text": "function name collision and re-render preview"
    },
    {
      "at": 8.06,
      "kind": "preview",
      "prefix": "Read",
      "text": "prev1.jpg",
      "image": "prev1_excerpt.png"
    },
    {
      "at": 8.86,
      "kind": "row",
      "prefix": "Adjust",
      "text": "city camera and preview final sections"
    },
    {
      "at": 9.31,
      "kind": "row",
      "prefix": "Add",
      "text": "eclipse to final chorus and preview ending"
    },
    {
      "at": 9.77,
      "kind": "row",
      "prefix": "Rendered",
      "text": "All 6,358 frames. Encoding H.264 and muxing audio"
    },
    {
      "at": 10.35,
      "kind": "row",
      "prefix": "Encode",
      "text": "video with audio via ffmpeg"
    },
    {
      "at": 10.95,
      "kind": "row",
      "prefix": "Checked",
      "text": "视频场景与音频同步已验证完成"
    },
    {
      "at": 11.55,
      "kind": "row",
      "prefix": "Completed task",
      "text": "渲染视频并合成音轨"
    }
  ],
  "second": [
    {
      "at": 0.55,
      "kind": "status",
      "text": "校准歌词时间戳与音频节拍网格"
    },
    {
      "at": 1.1,
      "kind": "row",
      "prefix": "Added task",
      "text": "逐句对齐歌词时间轴"
    },
    {
      "at": 1.75,
      "kind": "row",
      "prefix": "Read a page",
      "text": "LRC 歌词时间数据"
    },
    {
      "at": 2.45,
      "kind": "row",
      "prefix": "Extract",
      "text": "center-channel vocal proxy and align LRC offset"
    },
    {
      "at": 3.15,
      "kind": "row",
      "prefix": "Compute",
      "text": "beat positions for each lyric line"
    },
    {
      "at": 3.85,
      "kind": "row",
      "prefix": "Completed task",
      "text": "逐句对齐歌词时间轴"
    },
    {
      "at": 4.55,
      "kind": "row",
      "prefix": "Started task",
      "text": "逐句设计画面并实现渲染器 v2"
    },
    {
      "at": 5.22,
      "kind": "row",
      "prefix": "Created",
      "text": "mv2a.js"
    },
    {
      "at": 5.88,
      "kind": "row",
      "prefix": "Created",
      "text": "mv2b.js"
    },
    {
      "at": 6.55,
      "kind": "row",
      "prefix": "Preview",
      "text": "math verse and pre-chorus 1"
    },
    {
      "at": 7.2,
      "kind": "preview",
      "prefix": "Read",
      "text": "p2_2.jpg",
      "image": "math_preview.png"
    },
    {
      "at": 8.15,
      "kind": "row",
      "prefix": "Fixing",
      "text": "circumference fade-out at beat 78.8"
    },
    {
      "at": 8.85,
      "kind": "row",
      "prefix": "Preview",
      "text": "chorus 1 and verse 3"
    },
    {
      "at": 9.55,
      "kind": "row",
      "prefix": "Completed task",
      "text": "逐句设计画面并实现渲染器 v2"
    },
    {
      "at": 10.25,
      "kind": "row",
      "prefix": "Started task",
      "text": "渲染、编码并交付 v2"
    },
    {
      "at": 11.05,
      "kind": "row",
      "prefix": "Rendered",
      "text": "歌词同步画面与原曲音轨"
    },
    {
      "at": 11.75,
      "kind": "row",
      "prefix": "Checked",
      "text": "关键画面、歌词时间轴和成片质量"
    }
  ],
  "third": [
    {
      "at": 0.45,
      "kind": "status",
      "text": "已为动画视频文件优化并压缩完成。"
    },
    {
      "at": 0.85,
      "kind": "row",
      "prefix": "Start",
      "text": "compact encode and extract check frames from video"
    },
    {
      "at": 1.28,
      "kind": "row",
      "prefix": "Read",
      "text": "check_sheet.jpg"
    },
    {
      "at": 1.7,
      "kind": "row",
      "prefix": "Verified",
      "text": "视频场景与音频同步已验证完成。"
    },
    {
      "at": 2.1,
      "kind": "error",
      "prefix": "Command failed",
      "text": "Failed"
    },
    {
      "at": 2.52,
      "kind": "row",
      "prefix": "Check",
      "text": "compact encode progress"
    },
    {
      "at": 2.94,
      "kind": "row",
      "prefix": "Finish",
      "text": "compact encode and name deliverables"
    },
    {
      "at": 3.36,
      "kind": "row",
      "prefix": "Extract",
      "text": "full-res crops from compact version"
    },
    {
      "at": 3.8,
      "kind": "row",
      "prefix": "Reviewed",
      "text": "The lighter version looks clean at full resolution."
    },
    {
      "at": 4.25,
      "kind": "row",
      "prefix": "Completed task",
      "text": "渲染视频并合成音轨"
    },
    {
      "at": 4.68,
      "kind": "error",
      "prefix": "File delivery failed",
      "text": "1080p/30fps · 118 MB · Failed"
    },
    {
      "at": 5.1,
      "kind": "status",
      "text": "权衡 1080p 与 720p 编码和 HEVC 可用性"
    },
    {
      "at": 5.5,
      "kind": "row",
      "prefix": "Start",
      "text": "two-pass 720p encode under 30 MB"
    },
    {
      "at": 5.92,
      "kind": "row",
      "prefix": "Check",
      "text": "whether work files survived and encode status"
    },
    {
      "at": 6.34,
      "kind": "status",
      "text": "已诊断编码故障并规划恢复方案。"
    },
    {
      "at": 6.76,
      "kind": "row",
      "prefix": "Restart",
      "text": "720p second-pass encode"
    },
    {
      "at": 7.18,
      "kind": "row",
      "prefix": "Split",
      "text": "both videos into 19 MB chunks for transfer"
    },
    {
      "at": 7.6,
      "kind": "status",
      "text": "已将配套动画文件提交至输出目录。"
    },
    {
      "at": 8.02,
      "kind": "row",
      "prefix": "Saved",
      "text": "files to your computer"
    },
    {
      "at": 8.44,
      "kind": "status",
      "text": "已完成视频文件验证和分块传输。"
    },
    {
      "at": 8.86,
      "kind": "row",
      "prefix": "Local checksums",
      "text": "for HQ chunks and expected rebuilt file"
    },
    {
      "at": 9.28,
      "kind": "row",
      "prefix": "Check",
      "text": "720p encode size and sample frames"
    },
    {
      "at": 9.7,
      "kind": "row",
      "prefix": "Read",
      "text": "s720.jpg"
    },
    {
      "at": 10.1,
      "kind": "row",
      "prefix": "Verified",
      "text": "720p version is 28.8 MB and still looks good"
    },
    {
      "at": 10.45,
      "kind": "row",
      "prefix": "Completed task",
      "text": "检查成片并交付"
    },
    {
      "at": 10.72,
      "kind": "row",
      "prefix": "Shared",
      "text": "world.execute(me)_MV_720p.mp4"
    }
  ]
};
