# 🖼️ 照片渲染问题诊断报告

## 📊 问题概述

您的应用在预览界面中显示 `preview-1` 图片加载失败。

## ✅ 已验证的正常部分

根据检查，以下部分都正常工作：

1. **后端存储** ✅
   - 所有媒体文件都存在于磁盘上
   - 路径：`backend/storage/media/{campaign_id}/{filename}`
   - 10个媒体记录，所有文件都存在

2. **数据库记录** ✅
   - 3个 campaigns
   - 6个 posts
   - 10个 media records
   - URL 格式正确：`/media/{campaign_id}/{filename}`

3. **静态文件服务** ✅
   - FastAPI 正确挂载了 `/media` 路由
   - 指向 `backend/storage/media`

## 🔍 可能的问题原因

### 1. **前端 API_BASE 配置问题** ⚠️

**位置**: `src/api.ts` (第3行)

```typescript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
```

**问题**:
- 如果没有设置 `VITE_API_BASE` 环境变量，默认使用 `http://localhost:8000/api`
- 前端代码会将 `/media/...` 转换为 `http://localhost:8000/media/...`

**检查**: 您的后端是否在 `localhost:8000` 运行？

### 2. **CORS 配置** ⚠️

**位置**: `backend/app/main.py` (第16-22行)

目前 CORS 配置允许所有来源，这应该没问题，但需要确认：

```python
allow_origins=["*"],
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
```

### 3. **开发服务器端口不匹配** ⚠️

- 前端 Vite dev server: 默认 `http://localhost:5173`
- 后端 API: 默认 `http://localhost:8000`

如果后端不在 8000 端口运行，图片将无法加载。

## 🛠️ 已添加的调试日志

我已经在以下位置添加了详细的日志输出：

### 前端日志:

1. **`PostEditorModal.tsx`** (第144-161行)
   - 🖼️ 记录现有 post 的图片 URLs
   - ✅/❌ 测试每个图片 URL 是否能加载

2. **`SocialPreview.tsx`** (第94-101行)
   - ✅ 图片加载成功时记录
   - ❌ 图片加载失败时记录详细错误

3. **`api.ts`** (第76-90行)
   - 🔗 记录 API_BASE 和 URL 映射过程
   - 显示 `/media/...` → 完整 URL 的转换

### 后端日志:

1. **`main.py`** (第24-27行)
   - 📁 记录 MEDIA_ROOT 路径和是否存在

2. **`storage.py`** (第48-52行)
   - 📁 记录文件保存路径
   - 📁 确认文件存在

3. **`routes/posts.py`** (第68-72行)
   - 📤 记录获取 post 时的媒体信息

## 🧪 测试步骤

### 步骤 1: 启动后端

```bash
cd backend
source venv/bin/activate
python -m app.main
```

**预期输出**:
```
📁 [Main] MEDIA_ROOT: /Users/esther/Downloads/CIS412_AuraLab/backend/storage/media
📁 [Main] MEDIA_ROOT exists: True
📁 [Main] Mounting /media to ...
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 步骤 2: 测试静态文件访问

在浏览器中打开：
```
http://localhost:8000/media/b3484528-b73f-4dd3-8aa8-68999f1b4294/de9de33d-7fb3-4509-9d81-12e3e43242b9.png
```

**预期**: 应该看到图片

### 步骤 3: 运行诊断页面

```bash
# 将测试页面复制到 public 目录
cp src/test-image-load.html public/test.html
```

然后在浏览器中访问：
```
http://localhost:5173/test.html
```

### 步骤 4: 启动前端并查看控制台

```bash
npm run dev
```

打开应用并编辑一个有照片的 post，查看浏览器控制台（F12）：

**预期日志**:
```
🖼️ [Photo Debug] Existing post images: [...]
🖼️ [Photo Debug] Image preview URLs: [...]
🖼️ [Photo Debug] Image 0: http://localhost:8000/media/...
✅ [Photo Debug] Image 0 loaded successfully: ...
🔗 [API] Base URL: http://localhost:8000
🔗 [API] Mapping media: "/media/..." → "http://localhost:8000/media/..."
✅ [SocialPreview] Image loaded: ...
```

**如果失败会看到**:
```
❌ [Photo Debug] Image 0 failed to load: ...
❌ [SocialPreview] Image failed to load: ...
❌ [SocialPreview] Error details: ...
```

## 🔧 快速修复方案

### 方案 1: 检查后端运行状态

```bash
# 检查后端是否运行
curl http://localhost:8000/api/campaigns

# 检查静态文件
curl -I http://localhost:8000/media/b3484528-b73f-4dd3-8aa8-68999f1b4294/de9de33d-7fb3-4509-9d81-12e3e43242b9.png
```

### 方案 2: 创建 .env 文件（如果后端在其他端口）

如果后端在其他端口（比如 8080），创建 `.env` 文件：

```bash
# 在项目根目录
echo "VITE_API_BASE=http://localhost:8080/api" > .env
```

### 方案 3: 检查网络请求

在浏览器中：
1. 打开开发者工具 (F12)
2. 切换到 Network 标签
3. 编辑一个有照片的 post
4. 查看失败的图片请求
5. 检查：
   - 请求的 URL 是什么？
   - 状态码是什么？(404? 500? CORS error?)
   - 响应是什么？

## 🎯 下一步

1. **运行后端**并查看启动日志
2. **在浏览器中打开应用**
3. **编辑一个有照片的 post**
4. **查看浏览器控制台** (F12 → Console)
5. **查看网络请求** (F12 → Network)
6. **将错误信息反馈给我**

## 📝 常见问题

### Q: 图片显示为 "preview-1" 是什么意思？
A: 这是 `<img>` 标签的 `alt` 属性，当图片加载失败时显示。说明 `src` 属性有问题。

### Q: 为什么有些图片能加载，有些不能？
A: 可能的原因：
- 某些图片的 URL 格式不对
- 某些图片文件实际不存在
- URL 映射逻辑有 bug

### Q: 新上传的图片可以显示吗？
A: 这是个关键测试！如果新上传的图片可以显示，说明问题在于现有 post 的 URL 映射。

## 🐛 已知问题 (需要修复)

1. **更新 Post 时旧照片没有被删除** (storage.py, posts.py)
   - 会导致磁盘空间浪费
   - 不影响显示，但是长期问题

2. **缺少文件类型验证** (storage.py)
   - 应该验证 MIME type
   - 应该限制允许的文件扩展名

## 📞 需要的信息

请提供以下信息帮助进一步诊断：

1. 后端启动时的完整日志
2. 浏览器控制台的错误信息（截图或复制文本）
3. Network 标签中失败的图片请求详情
4. 是否能通过直接访问 URL 看到图片？

---

**生成时间**: 2025-12-08
**状态**: 等待用户反馈

