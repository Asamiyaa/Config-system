# Form / Motion — Interactive Design Demo

Open `index.html` directly in any modern browser, or run:

```sh
python -m http.server 8080 --directory demo
# visit http://localhost:8080
```

No build, API key or npm dependency. Features: 3 manually switched scene compositions, CSS 3D sculpture, pointer tilt, an explicitly user-started bounded timeline (no autoplay or auto-loop), responsive layout and reduced-motion support.

Open `shared-element.html` for a second lab: the same card surface expands to a dialog and reverses along the same Web Animations timeline. Supports Escape, mid-flight reversal and focus return. This **is not a real architectural reconstruction or physical 3D engine**—it's a lightweight visual demonstration of motion direction. For actual spatial geometry use Three.js/R3F in the project when justified.

The demo's crafted UI is independent of the files installed into your real app. Installing the scaffold does **not** replace your existing app with this demo.

### Additional working examples (v1.2)

- `shared-route.html`: three cards → detail, **native same-document View Transitions API** with selected cover/title and distinct stable IDs, 400ms shared timeline; Back and focus. Instant fallback if unsupported or reduced motion. Native transitions do not always offer uninterrupted mid-flight reverse.
- `interaction-lab.html`: **scroll-scrubbed navigation** (0→100px maps 80→56px) and **80/120ms button press/release**. Choose a restrained 1.008 overshoot or explicit 1.05 demonstration with a checkbox. No autoplay.

Run via `python -m http.server 8080 --directory demo` for browser testing and browser History API behavior. The demos do not modify business APIs, installed packages or user code.

## v2.0 精选 7 种可交互实验室

打开 `studio.html`（或者使用本地 HTTP 服务），可以操作 Morphing Dialog、Drag Reorder、Chart Morph、Timeline Scrubber、CSS 3D 镜头示意、命令面板 Cmd/Ctrl+K、按钮按压。面板左侧还有侧栏折叠交互。

- **本 Demo 明确使用演示数据与 CSS 3D 几何**，不是实时市场数据、真实 Three.js 沙盘或正式业务组件。
- Demo 共有 7 个核心场景，并非 104 个场景全部有独立运行实现；104 个 Markdown 是详细的工程指令和验收合同。
- 场景初始静止，无自动循环或自动跑入。减少动态效果可通过系统设置测试。
