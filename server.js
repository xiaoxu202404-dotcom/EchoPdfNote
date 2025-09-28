const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静态文件配置 - 修改为只使用根目录
app.use(express.static(__dirname));

// CORS 配置
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 86400
}));

app.use(express.json({ limit: '10mb' }));//修改.json的大小上限

// favicon 处理
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// 基础目录
const pdfDataDir = path.join(__dirname, 'pdf_data');
if (!fs.existsSync(pdfDataDir)) {
    fs.mkdirSync(pdfDataDir, { recursive: true });
}

// 创建上传目录
const uploadDir = path.join(__dirname, 'uploads');
const notesDir = path.join(__dirname, 'notes');
const imagesDir = path.join(__dirname, 'images');  // 添加图片目录

// 确保目录存在
[uploadDir, notesDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 获取PDF专用目录
const getPdfDir = (pdfName) => {
    // 移除文件扩展名和非法字符，用作文件夹名
    const safeName = pdfName.replace(/\.pdf$/i, '')
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '_');
    
    // 创建PDF专用目录
    const pdfDir = path.join(pdfDataDir, safeName);
    
    // 确保目录存在
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    // 返回目录路径和文件路径
    return {
        pdfDir,
        audioDir: pdfDir, // 音频直接放在PDF目录下
        notesFile: path.join(pdfDir, 'notes.json')
    };
};

// 修改 multer 存储配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const pdfName = req.query.pdfName;
        if (!pdfName) {
            cb(new Error('缺少 PDF 文件名'));
            return;
        }
        const { pdfDir } = getPdfDir(pdfName);
        cb(null, pdfDir);
    },
    filename: function (req, file, cb) {
        // 使用时间戳命名音频文件
        const now = new Date();
        const timestamp = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + '-' +
            String(now.getMinutes()).padStart(2, '0') + '-' +
            String(now.getSeconds()).padStart(2, '0');
        
        cb(null, `audio_${timestamp}.wav`);
    }
});

// 文件类型验证
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
    }
});

// 上传音频接口
app.post('/upload', (req, res) => {
    const pdfName = req.query.pdfName;
    if (!pdfName) {
        return res.status(400).json({ error: '缺少 PDF 文件名' });
    }

    upload.single('audio')(req, res, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: '没有文件被上传' });
        }

        // 获取安全的文件夹名
        const safeName = pdfName.replace(/\.pdf$/i, '')
            .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '_');
        
        // 返回相对URL路径
        const fileUrl = `/pdf_data/${safeName}/${req.file.filename}`;
        res.json({ url: fileUrl });
    });
});

// 添加图片存储配置
const imageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const pdfName = req.query.pdfName;
        if (!pdfName) {
            cb(new Error('缺少 PDF 文件名'));
            return;
        }
        const { pdfDir } = getPdfDir(pdfName);
        const imageDir = path.join(pdfDir, 'images');
        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
        }
        cb(null, imageDir);
    },
    filename: function (req, file, cb) {
        const now = new Date();
        const timestamp = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + '-' +
            String(now.getMinutes()).padStart(2, '0') + '-' +
            String(now.getSeconds()).padStart(2, '0');
        
        // 获取文件扩展名
        const ext = path.extname(file.originalname);
        cb(null, `image_${timestamp}${ext}`);
    }
});

// 图片文件类型验证
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的图片格式'), false);
    }
};

const uploadImage = multer({ 
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制图片大小为5MB
    }
});

// 添加图片上传接口
app.post('/upload-image', (req, res) => {
    const pdfName = req.query.pdfName;
    if (!pdfName) {
        return res.status(400).json({ error: '缺少 PDF 文件名' });
    }

    uploadImage.single('image')(req, res, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: '没有文件被上传' });
        }

        // 获取安全的文件夹名
        const safeName = pdfName.replace(/\.pdf$/i, '')
            .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '_');
        
        // 返回相对URL路径
        const fileUrl = `/pdf_data/${safeName}/images/${req.file.filename}`;
        res.json({ url: fileUrl });
    });
});

// 根路径处理
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 保存笔记接口
app.post('/save-notes', async (req, res) => {
    try {
        const { pdfName, notes } = req.body;
        if (!pdfName || !notes) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const { notesFile } = getPdfDir(pdfName);
        await fs.promises.writeFile(notesFile, JSON.stringify(notes, null, 2), 'utf8');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '保存注释失败: ' + error.message });
    }
});

// 获取笔记接口
app.get('/get-notes/:pdfName', async (req, res) => {
    try {
        const { notesFile } = getPdfDir(req.params.pdfName);
        if (fs.existsSync(notesFile)) {
            const notesData = await fs.promises.readFile(notesFile, 'utf8');
            res.json(JSON.parse(notesData));
        } else {
            res.json({});
        }
    } catch (error) {
        res.status(500).json({ error: '获取注释失败: ' + error.message });
    }
});

// 服务PDF数据目录的静态文件
app.use('/pdf_data', express.static(pdfDataDir));

// 错误处理
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log(`PDF语音标注服务已启动`);
});