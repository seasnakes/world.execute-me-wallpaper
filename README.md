# world.execute(me); — 双语动态壁纸

基于 Wallpaper Engine 网页壁纸的《world.execute(me);》二创 MV。此仓库整理自 **2026-09-27 19:00 的现用项目**，保留原画面、同步中英歌词和创意工坊设置。预览图取自约 2 分 48 秒的画面。

![壁纸预览](preview.jpg)

## 功能

- 跟随音乐进度渲染画面和中英双语歌词，循环时自动同步。
- 间奏不显示旧版的 Claude 对话界面。
- 在 Wallpaper Engine 的壁纸属性中打开或关闭歌词。
- 帧率跟随 Wallpaper Engine 的设置，代码没有另设最高帧率。
- 没有音乐文件时，画面与歌词仍可按时间轴运行。

## 使用

项目只需 HTML、CSS 和 JavaScript，无需安装依赖或构建。**仓库不包含音乐文件。**

从源码运行或导入 Wallpaper Engine 前，请将自己合法取得的音频放在项目根目录，并命名为 `song.mp3`。此文件已列入 `.gitignore`，不会随源码提交。Wallpaper Engine 中选择“创建壁纸”并导入 `index.html`；如需更新原创意工坊作品，请从原有 Wallpaper Engine 项目执行更新，避免误建新条目。

浏览器预览可在项目目录运行：

```sh
python3 -m http.server 8768 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8768/>。如果没有放 `song.mp3`，可点右下角的“选择本地音乐”，从电脑选取音频；该文件仅在浏览器本地使用，刷新后需要重新选择。浏览器若阻止自动播放，点击“启用音乐”即可。`?t=31&freeze=1` 可定格查看指定秒数。

`project.json` 保留原作品的创意工坊 ID `3808989186`。若将本项目改作自己的独立壁纸，请先移除其中的 `workshopid` 和 `workshopurl`，并填写自己的标题、说明和预览图。

## 文件

| 文件 | 用途 |
| --- | --- |
| `index.html`、`lyrics.css` | 页面结构和歌词样式 |
| `wallpaper.js` | 播放时钟、帧率、音频及 Wallpaper Engine 属性接口 |
| `lyrics.js`、`lyrics-data.js` | 歌词显示逻辑及时间轴数据 |
| `common.js`、`scenes2.js`、`events.js`、`analysis.js` | 动画渲染及预计算数据 |
| `preview.jpg` | 创意工坊预览图 |
| `project.json` | Wallpaper Engine 项目元数据和歌词开关 |

## 素材与授权

歌曲及英文歌词来自 Mili 的《world.execute(me);》。这是个人非官方二创项目。仓库不含音乐，也不授予原曲、歌词或其他第三方素材的再利用许可；代码目前没有附加开源许可证。
