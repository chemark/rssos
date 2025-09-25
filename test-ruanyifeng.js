#!/usr/bin/env node

/**
 * 测试阮一峰博客的解析功能
 */

const fetch = require('node-fetch');
const SiteDetector = require('./src/utils/siteDetector');
const ContentParser = require('./src/parsers/contentParser');
const RSSGenerator = require('./src/utils/rssGenerator');

async function testRuanyifengBlog() {
  console.log('🧪 测试阮一峰博客解析...');
  
  const url = 'https://www.ruanyifeng.com/blog/';
  
  try {
    // 获取HTML内容
    console.log('📥 获取网站内容...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSOS/1.0)'
      }
    });
    
    const html = await response.text();
    console.log(`✅ 获取成功，HTML长度: ${html.length}`);
    
    // 检测网站类型
    console.log('🔍 检测网站类型...');
    const detector = new SiteDetector();
    const siteInfo = await detector.detectSiteType(html, url);
    
    console.log(`✅ 检测结果: ${siteInfo.type} (${siteInfo.platform}) - 置信度: ${siteInfo.confidence}%`);
    console.log(`📋 特征: ${siteInfo.features.join(', ')}`);
    
    // 解析内容
    console.log('📝 解析文章内容...');
    const parser = new ContentParser(siteInfo);
    const articles = await parser.parseContent(html);
    
    console.log(`✅ 解析完成，找到 ${articles.length} 篇文章:`);
    
    // 显示前5篇文章
    articles.slice(0, 5).forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title}`);
      console.log(`   🔗 ${article.link}`);
      console.log(`   📅 ${article.pubDate}`);
      console.log(`   📄 ${article.description.substring(0, 100)}...`);
    });
    
    // 生成RSS
    console.log('\n📡 生成RSS XML...');
    const generator = new RSSGenerator();
    const rssXML = generator.generateRSS(articles, siteInfo);
    
    console.log(`✅ RSS生成成功，XML长度: ${rssXML.length}`);
    
    // 显示RSS的前几行
    const lines = rssXML.split('\n').slice(0, 15);
    console.log('\n📄 RSS预览:');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`  ${line.trim()}`);
      }
    });
    
    console.log('\n🎉 阮一峰博客解析测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testRuanyifengBlog();
}

module.exports = { testRuanyifengBlog };