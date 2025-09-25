const fetch = require('node-fetch');
const SiteDetector = require('../src/utils/siteDetector');
const ContentParser = require('../src/parsers/contentParser');
const RSSGenerator = require('../src/utils/rssGenerator');
const CacheManager = require('../src/utils/cacheManager');

// 创建全局实例
const siteDetector = new SiteDetector();
const rssGenerator = new RSSGenerator();
const cacheManager = new CacheManager();

/**
 * RSSOS RSS生成API
 * 接收网站URL，返回RSS XML
 */
export default async function handler(req, res) {
  try {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // 只允许GET和HEAD请求
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 获取URL参数
    const { url, refresh } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing URL parameter',
        usage: 'GET /api/generate?url=https://example.com'
      });
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL format',
        provided: url
      });
    }

    console.log(`RSS generation request for: ${url}`);

    // 检查错误缓存
    if (cacheManager.isInErrorCache(url)) {
      console.log(`URL is in error cache: ${url}`);
      const errorRSS = rssGenerator.generateErrorRSS(
        new Error('URL temporarily unavailable due to previous errors'),
        url
      );
      
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5分钟缓存
      
      if (req.method === 'HEAD') {
        return res.status(200).end();
      }
      
      return res.status(200).send(errorRSS);
    }

    // 检查RSS缓存（除非强制刷新）
    if (!refresh) {
      const cachedRSS = cacheManager.getCachedRSS(url);
      if (cachedRSS) {
        console.log(`Returning cached RSS for: ${url}`);
        
        res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=1800'); // 30分钟缓存
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Length', Buffer.byteLength(cachedRSS.content, 'utf-8'));
        
        if (req.method === 'HEAD') {
          return res.status(200).end();
        }
        
        return res.status(200).send(cachedRSS.content);
      }
    }

    console.log(`Generating fresh RSS for: ${url}`);

    // 获取网站HTML内容
    let html;
    const cachedHTML = cacheManager.getCachedHTML(url);
    
    if (cachedHTML && !refresh) {
      html = cachedHTML.html;
    } else {
      const htmlResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSSOS/1.0; +https://rssos.com/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000,
        follow: 5
      });
      
      if (!htmlResponse.ok) {
        throw new Error(`HTTP ${htmlResponse.status}: ${htmlResponse.statusText}`);
      }
      
      html = await htmlResponse.text();
      
      // 缓存HTML内容
      cacheManager.cacheHTML(url, html);
    }

    // 检测网站类型和结构
    let siteInfo;
    const cachedSiteInfo = cacheManager.getCachedSiteInfo(url);
    
    if (cachedSiteInfo && !refresh) {
      siteInfo = cachedSiteInfo.siteInfo;
    } else {
      siteInfo = await siteDetector.detectSiteType(html, url);
      console.log(`Detected site type: ${siteInfo.type} (${siteInfo.platform}) - confidence: ${siteInfo.confidence}%`);
      
      // 缓存网站信息
      cacheManager.cacheSiteInfo(url, siteInfo);
    }

    // 解析网站内容
    const contentParser = new ContentParser(siteInfo);
    const articles = await contentParser.parseContent(html);
    
    console.log(`Extracted ${articles.length} articles from ${url}`);

    // 生成RSS XML
    let rssXML;
    
    if (articles.length > 0) {
      rssXML = rssGenerator.generateRSS(articles, siteInfo);
    } else {
      console.log(`No articles found for ${url}, generating empty RSS`);
      rssXML = rssGenerator.generateEmptyRSS(url, siteInfo);
    }

    // 验证RSS格式
    if (!rssGenerator.validateRSS(rssXML)) {
      throw new Error('Generated RSS XML is invalid');
    }

    // 缓存生成的RSS
    cacheManager.cacheRSS(url, rssXML);

    // 设置响应头
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800'); // 30分钟缓存
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Site-Type', `${siteInfo.type}/${siteInfo.platform}`);
    res.setHeader('X-Articles-Found', articles.length.toString());
    res.setHeader('Content-Length', Buffer.byteLength(rssXML, 'utf-8'));

    // 对于HEAD请求，只返回头信息
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    
    return res.status(200).send(rssXML);
    
  } catch (error) {
    console.error(`RSS generation error for ${req.query.url}:`, error);
    
    // 添加到错误缓存
    if (req.query.url) {
      cacheManager.addToErrorCache(req.query.url, error);
    }
    
    // 生成错误RSS
    const errorRSS = rssGenerator.generateErrorRSS(error, req.query.url || 'unknown');
    
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5分钟缓存错误
    res.setHeader('Content-Length', Buffer.byteLength(errorRSS, 'utf-8'));
    
    // 对于HEAD请求，只返回头信息
    if (req.method === 'HEAD') {
      return res.status(500).end();
    }
    
    return res.status(500).send(errorRSS);
  }
}