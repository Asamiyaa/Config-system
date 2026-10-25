# 医学级 3D 骨骼与本地动作 GIF 更新

## 本次整合
- 健康管理的“骨骼”视图切换为嵌入式 BodyParts3D 交互骨骼查看器；支持真实骨骼网格点击高亮、左键旋转、右键平移和滚轮缩放。
- 授权模型下载脚本会把骨骼 OBJ 文件放入 `static/models/bodyparts3d/`，把 Three.js、OBJLoader、OrbitControls 与查看器放入 `static/anatomy/`。源数据基于 BodyParts3D / Anatomography，CC BY-SA 2.1 Japan；保留 `ATTRIBUTION.txt`。
- 本项目保留 `static/animations/` 下 8 个原创示意动作 GIF；匹配动作可直接从本地文件播放，不再打开搜索网站。没有对应动画的动作明确显示“暂无对应本地动画”，不会误用其他动作动画。

## 重要说明
当前运行环境无法直接下载 GitHub 二进制模型，因此补丁内不伪装包含已下载的医学网格。第一次在 Windows 本机运行安装脚本会从授权的公开仓库下载 202 个骨骼 OBJ 网格及本地 Three.js 运行时。完成后查看器不需要从外网获取骨骼模型；离线运行要求先完成此安装。

原始项目提供的是 OBJ 模型，因此使用 Three.js `OBJLoader` 而非 `GLTFLoader`。这是遵守原始数据格式、保留单骨骼独立网格以便点击高亮的选择；没有将 OBJ 冒称为 GLB。此版医学级数据仅覆盖骨骼系统，肌肉/皮肤仍保留现有示意视图，不宣称达到医学级高精度肌肉网格。

## 安装步骤
1. 先停止 WEALTH OS。
2. 在项目根目录双击 `scripts\setup_anatomy_assets.bat`，或执行 `py -3 scripts\setup_anatomy_assets.py`。
3. 安装脚本需要首次联网访问 `raw.githubusercontent.com` 和 `cdnjs.cloudflare.com`，下载后会检查 OBJ 文件数、Three.js 和 loader 文件。
4. 启动 WEALTH OS，进入“健康管理 → 健身管理 → 骨骼”。模型和动作 GIF 均从 `/static/` 本地目录加载。
5. 如果网络中断，重新运行安装脚本即可续传已存在的模型文件；不完整文件会被覆盖重试。

## 许可与适用范围
个人非商业使用不自动免除开源许可条件。BodyParts3D 模型须保留署名，并遵守 CC BY-SA 2.1 Japan 的相同方式共享条款。此模型用于健身部位学习和可视化，不用于临床诊断。

## 验证状态
已执行 JavaScript 语法检查、Python 编译检查、GIF 文件格式/帧数检查和打包完整性检查。由于此执行环境无法访问 GitHub 二进制文件，尚不能在此处实际渲染下载后的医学模型；请在 Windows 完成一次下载后检查模型显示、点击高亮、旋转、缩放和离线运行。
