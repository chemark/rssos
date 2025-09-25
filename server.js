const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API路由 - 动态导入ES模块
app.use('/api/generate', async (req, res) => {
    try {
        const generateModule = await import('./api/generate.js');
        await generateModule.default(req, res);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'RSSOS server is running',
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 RSSOS server running at http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api/generate`);
    console.log(`🌐 Frontend available at http://localhost:${PORT}`);
    console.log('');
    console.log('Example usage:');
    console.log(`  curl "http://localhost:${PORT}/api/generate?url=https://jasonspielman.com"`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down RSSOS server...');
    process.exit(0);
});

module.exports = app;