# 🐛 修复照片加载错误 (ERR_FILE_NOT_FOUND)

## 问题描述
当上传新照片到新 post 时，出现：`Failed to load resource: net::ERR_FILE_NOT_FOUND`

## 已添加的修复和日志

### 1. **前端 URL 验证** (`src/api.ts`)
添加了验证逻辑，过滤掉无效的 URL：
- 检查 media 对象是否有 `url` 属性
- 检查 URL 是否只是一个 UUID（不是完整路径）
- 如果发现错误的 URL，会在控制台记录并过滤掉

### 2. **详细的上传日志** 
在以下位置添加了调试日志：

**文件上传时** (`PostEditorModal.tsx`):
```
📎 [Upload] File input changed
📎 [Upload] Processing files
📎 [Upload] Blob URL: blob:http://...
📎 [Upload] Updated imagePreviewUrls
```

**API 调用时** (`api.ts`):
```
📤 [API] createPost called
📤 [API] Uploading files
📤 [API] Response data
📤 [API] Mapped post
```

**URL 映射时** (`api.ts`):
```
🔗 [API] mapPost called for post
🔗 [API] Raw media from API
🔗 [API] Mapping media: "/media/..." → "http://..."
```

**图片渲染时** (`SocialPreview.tsx`):
```
✅ [SocialPreview] Image loaded
❌ [SocialPreview] Image failed to load
```

## 🧪 测试步骤

### 1. 重启前后端

**后端**:
```bash
cd backend
source venv/bin/activate
python -m app.main
```

**前端**:
```bash
npm run dev
```

### 2. 打开浏览器开发者工具
- 按 F12
- 切换到 **Console** 标签

### 3. 创建新 post 并上传照片
1. 选择一个 campaign
2. 点击 "+ New Post"
3. 点击上传图片
4. 选择一张图片
5. **观察控制台输出**

### 4. 查看日志

**正常情况**应该看到：
```
📎 [Upload] File input changed, files: 1
📎 [Upload] Processing files:
  1. my-photo.jpg (123456 bytes)
     Blob URL: blob:http://localhost:5173/xxx-xxx-xxx
📎 [Upload] Updated imagePreviewUrls: ["blob:http://localhost:5173/xxx-xxx-xxx"]
```

**如果出现问题**会看到：
```
❌ [SocialPreview] Image failed to load: ...
❌ [API] Invalid media object (missing url): ...
❌ [API] Media url is just an ID, not a path: "8ef28f67-..."
```

### 5. 保存 post 并查看更多日志

点击保存后，应该看到：
```
📤 [API] createPost called
📤 [API] Uploading files:
  1. my-photo.jpg (123456 bytes, image/jpeg)
📤 [API] POSTing to: http://localhost:8000/api/campaigns/.../posts
📤 [API] Response status: 201 Created
📤 [API] Response data: {...}
🔗 [API] mapPost called for post: ...
🔗 [API] Mapping media: "/media/..." → "http://localhost:8000/media/..."
✅ [SocialPreview] Image loaded: http://localhost:8000/media/...
```

## 📋 把日志发给我

如果问题仍然存在，请：
1. 打开 Console 标签
2. 清空日志 (点击 🚫 图标)
3. 重新上传一张照片
4. **复制所有控制台输出**
5. 发给我

同时，也请检查 **Network** 标签：
1. 切换到 Network 标签
2. 上传照片
3. 找到失败的请求（红色的）
4. 点击它，查看：
   - Request URL 是什么？
   - Status code 是什么？
   - Response 是什么？
5. 把这些信息也发给我

## 🔍 可能的原因

基于错误信息 `8ef28f67-b959-4934-8a5e-dc5aaa750d23:1`，最可能的原因是：

1. **后端返回了错误的 URL 格式**
   - 应该是：`/media/{campaign_id}/{filename}.jpg`
   - 可能是：只有 ID，没有路径

2. **前端错误地使用了某个 ID 作为图片 src**
   - Campaign ID
   - Post ID
   - Media ID

3. **Blob URL 创建失败**
   - 虽然不太可能，但也要检查

4. **某个地方的类型转换错误**
   - 将对象转换成字符串时只得到了 ID

## ✅ 修复措施

已添加的防御性代码会：
- 验证每个 URL
- 过滤掉无效的 URL
- 记录详细的错误信息
- 防止无效 URL 到达渲染层

## 📞 需要的信息

为了彻底解决问题，我需要：
1. ✅ 后端数据验证结果（已完成 - 数据正常）
2. ⏳ 前端控制台日志（Console 标签）
3. ⏳ 网络请求详情（Network 标签）
4. ⏳ 具体的重现步骤

---

**更新时间**: 2025-12-08
**状态**: 已添加调试日志，等待用户反馈

