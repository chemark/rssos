#!/usr/bin/env node

/**
 * RSSOS 全面测试套件
 * 测试不同类型网站的RSS生成功能
 */

const fetch = require('node-fetch');
const SiteDetector = require('./src/utils/siteDetector');
const ContentParser = require('./src/parsers/contentParser');
const RSSGenerator = require('./src/utils/rssGenerator');
const CacheManager = require('./src/utils/cacheManager');

class TestSuite {
    constructor() {
        this.detector = new SiteDetector();
        this.generator = new RSSGenerator();
        this.cache = new CacheManager();
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🧪 RSSOS 全面测试套件启动\n');

        const testCategories = [
            { name: '单元测试', tests: this.getUnitTests() },
            { name: '网站检测测试', tests: this.getSiteDetectionTests() },
            { name: '内容解析测试', tests: this.getContentParsingTests() },
            { name: 'RSS生成测试', tests: this.getRSSGenerationTests() },
            { name: '缓存系统测试', tests: this.getCacheTests() },
            { name: '实际网站测试', tests: this.getRealSiteTests() }
        ];

        for (const category of testCategories) {
            console.log(`\n📋 ${category.name}`);
            console.log('='.repeat(50));

            for (const test of category.tests) {
                await this.runTest(test);
            }
        }

        this.printSummary();
    }

    /**
     * 运行单个测试
     */
    async runTest(test) {
        this.results.total++;
        const startTime = Date.now();

        try {
            console.log(`  🔍 ${test.name}...`);
            
            await test.fn();
            
            const duration = Date.now() - startTime;
            console.log(`  ✅ 通过 (${duration}ms)`);
            
            this.results.passed++;
            this.results.details.push({
                name: test.name,
                status: 'PASS',
                duration,
                category: test.category
            });
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`  ❌ 失败: ${error.message} (${duration}ms)`);
            
            this.results.failed++;
            this.results.details.push({
                name: test.name,
                status: 'FAIL',
                duration,
                error: error.message,
                category: test.category
            });
        }
    }

    /**
     * 获取单元测试
     */
    getUnitTests() {
        return [
            {
                name: '测试URL验证',
                category: 'unit',
                fn: async () => {
                    const validUrls = [
                        'https://example.com',
                        'http://test.org',
                        'https://sub.domain.com/path'
                    ];
                    
                    const invalidUrls = [
                        'not-a-url',
                        'ftp://example.com',
                        'javascript:alert(1)'
                    ];

                    validUrls.forEach(url => {
                        try {
                            new URL(url);
                        } catch (error) {
                            throw new Error(`有效URL被错误拒绝: ${url}`);
                        }
                    });

                    invalidUrls.forEach(url => {
                        try {
                            new URL(url);
                            if (!url.startsWith('http')) {
                                throw new Error(`无效URL被错误接受: ${url}`);
                            }
                        } catch (error) {
                            // 期望的错误
                        }
                    });
                }
            },
            {
                name: '测试GUID生成',
                category: 'unit',
                fn: async () => {
                    const siteInfo = { url: 'https://example.com', type: 'blog' };
                    const parser = new ContentParser(siteInfo);
                    
                    const guid1 = parser.generateGuid('test-article');
                    const guid2 = parser.generateGuid('test-article');
                    const guid3 = parser.generateGuid('different-article');
                    
                    if (guid1 !== guid2) {
                        throw new Error('相同输入应生成相同GUID');
                    }
                    
                    if (guid1 === guid3) {
                        throw new Error('不同输入应生成不同GUID');
                    }
                    
                    if (!guid1.startsWith('rssos-')) {
                        throw new Error('GUID应有正确的前缀');
                    }
                }
            },
            {
                name: '测试摘要生成',
                category: 'unit',
                fn: async () => {
                    const siteInfo = { url: 'https://example.com', type: 'blog' };
                    const parser = new ContentParser(siteInfo);
                    
                    const longText = 'A'.repeat(500);
                    const summary = parser.generateSummary(longText, 100);
                    
                    if (summary.length > 103) { // 100 + '...'
                        throw new Error('摘要长度超过限制');
                    }
                    
                    if (!summary.endsWith('...')) {
                        throw new Error('长文本摘要应以...结尾');
                    }
                    
                    const shortText = 'Short text';
                    const shortSummary = parser.generateSummary(shortText, 100);
                    
                    if (shortSummary !== shortText) {
                        throw new Error('短文本摘要应保持原样');
                    }
                }
            }
        ];
    }

    /**
     * 获取网站检测测试
     */
    getSiteDetectionTests() {
        return [
            {
                name: '检测WordPress博客',
                category: 'detection',
                fn: async () => {
                    const html = `
                        <html>
                            <head>
                                <meta name="generator" content="WordPress 6.0" />
                                <title>My Blog</title>
                            </head>
                            <body>
                                <article class="post">
                                    <h2 class="entry-title">Blog Post</h2>
                                    <div class="entry-content">Content here</div>
                                </article>
                            </body>
                        </html>
                    `;
                    
                    const result = await this.detector.detectSiteType(html, 'https://example-blog.com');
                    
                    if (result.type !== 'blog') {
                        throw new Error(`期望类型为blog，实际为${result.type}`);
                    }
                    
                    if (result.platform !== 'wordpress') {
                        throw new Error(`期望平台为wordpress，实际为${result.platform}`);
                    }
                    
                    if (result.confidence < 30) {
                        throw new Error(`置信度过低: ${result.confidence}%`);
                    }
                }
            },
            {
                name: '检测作品集网站',
                category: 'detection',
                fn: async () => {
                    const html = `
                        <html>
                            <head>
                                <meta name="description" content="Designer portfolio with creative work" />
                                <title>John Doe - Portfolio</title>
                            </head>
                            <body>
                                <div class="project">
                                    <h3>Project 1</h3>
                                    <div class="work-sample">Design work</div>
                                </div>
                            </body>
                        </html>
                    `;
                    
                    const result = await this.detector.detectSiteType(html, 'https://johndesigner.com');
                    
                    if (result.type !== 'portfolio') {
                        throw new Error(`期望类型为portfolio，实际为${result.type}`);
                    }
                    
                    if (!result.features.includes('portfolio-keywords')) {
                        throw new Error('应检测到portfolio关键词特征');
                    }
                }
            },
            {
                name: '检测新闻网站',
                category: 'detection',
                fn: async () => {
                    const html = `
                        <html>
                            <head>
                                <meta property="og:type" content="article" />
                                <script type="application/ld+json">
                                    {"@type": "NewsArticle", "headline": "Breaking News"}
                                </script>
                            </head>
                            <body>
                                <article>
                                    <h1>Breaking News Title</h1>
                                    <time datetime="2024-09-25">September 25, 2024</time>
                                    <p>News content here...</p>
                                </article>
                            </body>
                        </html>
                    `;
                    
                    const result = await this.detector.detectSiteType(html, 'https://news-site.com');
                    
                    if (result.type !== 'news') {
                        throw new Error(`期望类型为news，实际为${result.type}`);
                    }
                    
                    if (result.confidence < 50) {
                        throw new Error(`新闻网站置信度应该较高: ${result.confidence}%`);
                    }
                }
            }
        ];
    }

    /**
     * 获取内容解析测试
     */
    getContentParsingTests() {
        return [
            {
                name: '解析博客文章',
                category: 'parsing',
                fn: async () => {
                    const siteInfo = {
                        url: 'https://blog.example.com',
                        type: 'blog',
                        platform: 'wordpress',
                        selectors: {
                            articles: 'article',
                            title: '.entry-title',
                            content: '.entry-content',
                            link: 'a',
                            date: '.published'
                        }
                    };
                    
                    const html = `
                        <article>
                            <h2 class="entry-title"><a href="/post1">Test Article</a></h2>
                            <div class="entry-content">This is the article content.</div>
                            <time class="published" datetime="2024-09-25">September 25, 2024</time>
                        </article>
                    `;
                    
                    const parser = new ContentParser(siteInfo);
                    const articles = await parser.parseContent(html);
                    
                    if (articles.length === 0) {
                        throw new Error('未解析到任何文章');
                    }
                    
                    const article = articles[0];
                    if (article.title !== 'Test Article') {
                        throw new Error(`标题解析错误: ${article.title}`);
                    }
                    
                    if (!article.link.includes('/post1')) {
                        throw new Error(`链接解析错误: ${article.link}`);
                    }
                    
                    if (!article.content.includes('article content')) {
                        throw new Error(`内容解析错误: ${article.content}`);
                    }
                }
            },
            {
                name: '解析作品集项目',
                category: 'parsing',
                fn: async () => {
                    const siteInfo = {
                        url: 'https://portfolio.example.com',
                        type: 'portfolio',
                        platform: 'portfolio',
                        selectors: {
                            articles: '.project',
                            title: '.project-title',
                            content: '.project-description',
                            link: 'a',
                            image: 'img'
                        }
                    };
                    
                    const html = `
                        <div class="project">
                            <h3 class="project-title">Design Project</h3>
                            <p class="project-description">A modern web design project</p>
                            <a href="/project/design">View Project</a>
                            <img src="/images/project.jpg" alt="Project Image" />
                        </div>
                    `;
                    
                    const parser = new ContentParser(siteInfo);
                    const articles = await parser.parseContent(html);
                    
                    if (articles.length === 0) {
                        throw new Error('未解析到任何项目');
                    }
                    
                    const project = articles[0];
                    if (project.title !== 'Design Project') {
                        throw new Error(`项目标题解析错误: ${project.title}`);
                    }
                    
                    if (!project.image) {
                        throw new Error('未解析到项目图片');
                    }
                }
            }
        ];
    }

    /**
     * 获取RSS生成测试
     */
    getRSSGenerationTests() {
        return [
            {
                name: '生成基本RSS XML',
                category: 'rss',
                fn: async () => {
                    const articles = [
                        {
                            title: 'Test Article',
                            link: 'https://example.com/test',
                            description: 'Test description',
                            content: '<p>Test content</p>',
                            pubDate: new Date().toUTCString(),
                            guid: 'test-123',
                            author: 'Test Author'
                        }
                    ];
                    
                    const siteInfo = {
                        url: 'https://example.com',
                        type: 'blog',
                        platform: 'test'
                    };
                    
                    const rssXML = this.generator.generateRSS(articles, siteInfo);
                    
                    if (!rssXML.includes('<?xml version="1.0"')) {
                        throw new Error('RSS XML缺少XML声明');
                    }
                    
                    if (!rssXML.includes('<rss version="2.0"')) {
                        throw new Error('RSS XML缺少版本信息');
                    }
                    
                    if (!rssXML.includes('<title><![CDATA[Test Article]]></title>')) {
                        throw new Error('RSS XML缺少文章标题');
                    }
                    
                    if (!rssXML.includes('https://example.com/test')) {
                        throw new Error('RSS XML缺少文章链接');
                    }
                }
            },
            {
                name: '验证RSS格式',
                category: 'rss',
                fn: async () => {
                    const validRSS = `<?xml version="1.0" encoding="UTF-8"?>
                        <rss version="2.0">
                            <channel>
                                <title>Test</title>
                                <link>https://example.com</link>
                                <description>Test RSS</description>
                            </channel>
                        </rss>`;
                    
                    const invalidRSS = `<rss><channel><title>Broken`;
                    
                    if (!this.generator.validateRSS(validRSS)) {
                        throw new Error('有效RSS被错误拒绝');
                    }
                    
                    if (this.generator.validateRSS(invalidRSS)) {
                        throw new Error('无效RSS被错误接受');
                    }
                }
            },
            {
                name: '生成空RSS处理',
                category: 'rss',
                fn: async () => {
                    const siteInfo = {
                        url: 'https://example.com',
                        type: 'blog',
                        platform: 'test'
                    };
                    
                    const emptyRSS = this.generator.generateEmptyRSS('https://example.com', siteInfo);
                    
                    if (!emptyRSS.includes('<channel>')) {
                        throw new Error('空RSS应包含基本channel结构');
                    }
                    
                    if (emptyRSS.includes('<item>')) {
                        throw new Error('空RSS不应包含item元素');
                    }
                }
            }
        ];
    }

    /**
     * 获取缓存测试
     */
    getCacheTests() {
        return [
            {
                name: '缓存RSS内容',
                category: 'cache',
                fn: async () => {
                    const testUrl = 'https://test.com';
                    const testContent = '<rss><channel><title>Test</title></channel></rss>';
                    
                    // 缓存内容
                    this.cache.cacheRSS(testUrl, testContent);
                    
                    // 获取缓存
                    const cached = this.cache.getCachedRSS(testUrl);
                    
                    if (!cached) {
                        throw new Error('缓存内容未找到');
                    }
                    
                    if (cached.content !== testContent) {
                        throw new Error('缓存内容不匹配');
                    }
                    
                    if (!cached.hit) {
                        throw new Error('缓存命中标记错误');
                    }
                }
            },
            {
                name: '缓存过期处理',
                category: 'cache',
                fn: async () => {
                    const testUrl = 'https://test-expire.com';
                    
                    // 模拟过期检查
                    const shouldRefresh = this.cache.shouldRefreshCache(testUrl, 100); // 100ms
                    
                    if (!shouldRefresh) {
                        throw new Error('不存在的缓存应需要刷新');
                    }
                    
                    // 添加缓存
                    this.cache.cacheRSS(testUrl, 'test');
                    
                    // 立即检查（不应需要刷新）
                    const shouldNotRefresh = this.cache.shouldRefreshCache(testUrl, 60000); // 1分钟
                    
                    if (shouldNotRefresh) {
                        throw new Error('新缓存不应需要刷新');
                    }
                }
            },
            {
                name: '错误缓存功能',
                category: 'cache',
                fn: async () => {
                    const testUrl = 'https://error-test.com';
                    const testError = new Error('Test error');
                    
                    // 添加到错误缓存
                    this.cache.addToErrorCache(testUrl, testError);
                    
                    // 检查错误缓存
                    const inErrorCache = this.cache.isInErrorCache(testUrl);
                    
                    if (!inErrorCache) {
                        throw new Error('错误缓存未生效');
                    }
                    
                    // 清理测试
                    this.cache.clearCache(testUrl);
                }
            }
        ];
    }

    /**
     * 获取实际网站测试（可选，需要网络连接）
     */
    getRealSiteTests() {
        return [
            {
                name: '测试阮一峰博客解析（网络）',
                category: 'real-site',
                fn: async () => {
                    if (process.env.SKIP_NETWORK_TESTS === 'true') {
                        console.log('    ⏭️  跳过网络测试');
                        return;
                    }
                    
                    try {
                        const url = 'https://www.ruanyifeng.com/blog/';
                        const response = await fetch(url, {
                            timeout: 10000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (compatible; RSSOS/1.0)'
                            }
                        });
                        
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }
                        
                        const html = await response.text();
                        const siteInfo = await this.detector.detectSiteType(html, url);
                        
                        if (siteInfo.type !== 'blog') {
                            throw new Error(`期望检测为博客，实际为${siteInfo.type}`);
                        }
                        
                        if (siteInfo.platform !== 'movable-type') {
                            throw new Error(`期望平台为movable-type，实际为${siteInfo.platform}`);
                        }
                        
                        const parser = new ContentParser(siteInfo);
                        const articles = await parser.parseContent(html);
                        
                        if (articles.length === 0) {
                            throw new Error('未解析到任何文章');
                        }
                        
                        console.log(`    📊 解析到 ${articles.length} 篇文章`);
                        
                    } catch (error) {
                        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
                            console.log('    ⚠️  网络连接问题，跳过此测试');
                            return;
                        }
                        throw error;
                    }
                }
            }
        ];
    }

    /**
     * 打印测试总结
     */
    printSummary() {
        console.log('\n🎯 测试总结');
        console.log('='.repeat(50));
        console.log(`总计测试: ${this.results.total}`);
        console.log(`✅ 通过: ${this.results.passed}`);
        console.log(`❌ 失败: ${this.results.failed}`);
        console.log(`📊 成功率: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

        if (this.results.failed > 0) {
            console.log('\n❌ 失败的测试:');
            this.results.details
                .filter(test => test.status === 'FAIL')
                .forEach(test => {
                    console.log(`  • ${test.name}: ${test.error}`);
                });
        }

        // 性能统计
        const totalTime = this.results.details.reduce((sum, test) => sum + test.duration, 0);
        console.log(`\n⏱️  总耗时: ${totalTime}ms`);

        const avgTime = totalTime / this.results.total;
        console.log(`⚡ 平均耗时: ${avgTime.toFixed(1)}ms`);

        // 按类别统计
        console.log('\n📋 按类别统计:');
        const categories = {};
        this.results.details.forEach(test => {
            if (!categories[test.category]) {
                categories[test.category] = { total: 0, passed: 0 };
            }
            categories[test.category].total++;
            if (test.status === 'PASS') {
                categories[test.category].passed++;
            }
        });

        Object.entries(categories).forEach(([category, stats]) => {
            const rate = ((stats.passed / stats.total) * 100).toFixed(1);
            console.log(`  ${category}: ${stats.passed}/${stats.total} (${rate}%)`);
        });

        console.log('\n' + (this.results.failed === 0 ? '🎉 所有测试通过！' : '⚠️  存在失败的测试'));
    }
}

// 运行测试套件
if (require.main === module) {
    const testSuite = new TestSuite();
    
    testSuite.runAllTests().then(() => {
        process.exit(testSuite.results.failed === 0 ? 0 : 1);
    }).catch(error => {
        console.error('测试套件运行出错:', error);
        process.exit(1);
    });
}

module.exports = TestSuite;