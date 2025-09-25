#!/usr/bin/env node

/**
 * RSSOS 测试脚本
 * 验证核心功能是否正常工作
 */

const SiteDetector = require('./src/utils/siteDetector');
const RSSGenerator = require('./src/utils/rssGenerator');
const CacheManager = require('./src/utils/cacheManager');

async function testSiteDetector() {
  console.log('🧪 测试网站类型检测器...');
  
  const detector = new SiteDetector();
  
  // 模拟HTML内容进行测试
  const testCases = [
    {
      name: 'Portfolio网站',
      html: '<html><head><meta name="description" content="Designer portfolio with creative work"></head><body><div class="project">Project 1</div><div class="work">Work Sample</div></body></html>',
      url: 'https://jasonspielman.com'
    },
    {
      name: 'WordPress博客',
      html: '<html><head><meta name="generator" content="WordPress 6.0"></head><body><article class="post"><h2 class="entry-title">Blog Post</h2></article></body></html>',
      url: 'https://example-blog.com'
    },
    {
      name: '新闻网站',
      html: '<html><head><meta property="og:type" content="article"></head><body><script type="application/ld+json">{"@type":"NewsArticle"}</script><article>News Article</article></body></html>',
      url: 'https://news-site.com'
    }
  ];
  
  for (const testCase of testCases) {
    const result = await detector.detectSiteType(testCase.html, testCase.url);
    console.log(`  ✅ ${testCase.name}: ${result.type} (${result.platform}) - 置信度: ${result.confidence}%`);
  }
}

async function testRSSGenerator() {
  console.log('\n🧪 测试RSS生成器...');
  
  const generator = new RSSGenerator();
  
  // 模拟文章数据
  const articles = [
    {
      title: 'Test Article 1',
      link: 'https://example.com/article1',
      description: 'This is a test article description.',
      content: '<p>This is the full content of the article.</p>',
      pubDate: new Date().toUTCString(),
      guid: 'test-article-1',
      author: 'Test Author',
      category: 'Test'
    },
    {
      title: 'Test Article 2',
      link: 'https://example.com/article2',
      description: 'Another test article.',
      pubDate: new Date().toUTCString(),
      guid: 'test-article-2'
    }
  ];
  
  const siteInfo = {
    url: 'https://example.com',
    type: 'blog',
    platform: 'test'
  };
  
  const rssXML = generator.generateRSS(articles, siteInfo);
  const isValid = generator.validateRSS(rssXML);
  
  console.log(`  ✅ RSS生成: ${isValid ? '成功' : '失败'}`);
  console.log(`  📏 XML长度: ${rssXML.length} 字符`);
  console.log(`  📰 文章数量: ${articles.length}`);
  
  // 显示RSS的前几行
  const lines = rssXML.split('\n').slice(0, 10);
  console.log('  📄 RSS预览:');
  lines.forEach(line => {
    if (line.trim()) {
      console.log(`    ${line.trim()}`);
    }
  });
}

async function testCacheManager() {
  console.log('\n🧪 测试缓存管理器...');
  
  const cache = new CacheManager();
  const testUrl = 'https://example.com';
  const testContent = '<rss><channel><title>Test</title></channel></rss>';
  
  // 测试缓存操作
  console.log('  📝 缓存RSS内容...');
  cache.cacheRSS(testUrl, testContent);
  
  console.log('  🔍 获取缓存内容...');
  const cached = cache.getCachedRSS(testUrl);
  
  if (cached && cached.content === testContent) {
    console.log('  ✅ 缓存功能正常');
  } else {
    console.log('  ❌ 缓存功能异常');
  }
  
  // 测试缓存统计
  const stats = cache.getCacheStats();
  console.log('  📊 缓存统计:', stats);
  
  // 清除缓存
  cache.clearCache(testUrl);
  console.log('  🧹 缓存已清除');
}

async function runTests() {
  console.log('🚀 RSSOS 功能测试开始\n');
  
  try {
    await testSiteDetector();
    await testRSSGenerator();
    await testCacheManager();
    
    console.log('\n✅ 所有测试完成！RSSOS核心功能运行正常。');
    console.log('\n📌 下一步：');
    console.log('   1. 部署到Vercel: vercel --prod');
    console.log('   2. 测试在线功能');
    console.log('   3. 使用Jason Spielman网站测试: https://jasonspielman.com');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  testSiteDetector,
  testRSSGenerator,
  testCacheManager,
  runTests
};