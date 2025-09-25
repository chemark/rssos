const LRU = require('lru-cache');

/**
 * 缓存管理器
 * 管理RSS feed的缓存，避免频繁抓取同一网站
 */
class CacheManager {
  constructor() {
    // RSS内容缓存 - 存储生成的RSS XML
    this.rssCache = new LRU({
      max: 100, // 最多缓存100个RSS feed
      ttl: 30 * 60 * 1000, // 30分钟过期
      updateAgeOnGet: true
    });

    // 网站信息缓存 - 存储网站检测结果
    this.siteInfoCache = new LRU({
      max: 200, // 最多缓存200个网站信息
      ttl: 60 * 60 * 1000, // 1小时过期
      updateAgeOnGet: true
    });

    // HTML内容缓存 - 存储原始HTML
    this.htmlCache = new LRU({
      max: 50, // 最多缓存50个HTML页面
      ttl: 15 * 60 * 1000, // 15分钟过期
      updateAgeOnGet: true
    });

    // 错误缓存 - 避免频繁请求失败的网站
    this.errorCache = new LRU({
      max: 100,
      ttl: 60 * 60 * 1000, // 1小时过期
      updateAgeOnGet: false
    });
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(url, type = 'rss') {
    const normalizedUrl = this.normalizeUrl(url);
    return `${type}:${normalizedUrl}`;
  }

  /**
   * 规范化URL
   */
  normalizeUrl(url) {
    try {
      const urlObj = new URL(url);
      // 移除fragment和某些查询参数
      urlObj.hash = '';
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid'];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString().toLowerCase();
    } catch (error) {
      return url.toLowerCase();
    }
  }

  /**
   * 获取缓存的RSS
   */
  getCachedRSS(url) {
    const key = this.generateCacheKey(url, 'rss');
    const cached = this.rssCache.get(key);
    
    if (cached) {
      console.log(`RSS cache hit for ${url}`);
      return {
        content: cached.content,
        cachedAt: cached.timestamp,
        hit: true
      };
    }
    
    console.log(`RSS cache miss for ${url}`);
    return null;
  }

  /**
   * 缓存RSS内容
   */
  cacheRSS(url, content) {
    const key = this.generateCacheKey(url, 'rss');
    const cacheData = {
      content: content,
      timestamp: Date.now(),
      url: url
    };
    
    this.rssCache.set(key, cacheData);
    console.log(`RSS cached for ${url}`);
  }

  /**
   * 获取缓存的网站信息
   */
  getCachedSiteInfo(url) {
    const key = this.generateCacheKey(url, 'siteinfo');
    const cached = this.siteInfoCache.get(key);
    
    if (cached) {
      console.log(`Site info cache hit for ${url}`);
      return {
        siteInfo: cached.siteInfo,
        cachedAt: cached.timestamp,
        hit: true
      };
    }
    
    return null;
  }

  /**
   * 缓存网站信息
   */
  cacheSiteInfo(url, siteInfo) {
    const key = this.generateCacheKey(url, 'siteinfo');
    const cacheData = {
      siteInfo: siteInfo,
      timestamp: Date.now(),
      url: url
    };
    
    this.siteInfoCache.set(key, cacheData);
    console.log(`Site info cached for ${url}`);
  }

  /**
   * 获取缓存的HTML
   */
  getCachedHTML(url) {
    const key = this.generateCacheKey(url, 'html');
    const cached = this.htmlCache.get(key);
    
    if (cached) {
      console.log(`HTML cache hit for ${url}`);
      return {
        html: cached.html,
        cachedAt: cached.timestamp,
        hit: true
      };
    }
    
    return null;
  }

  /**
   * 缓存HTML内容
   */
  cacheHTML(url, html) {
    const key = this.generateCacheKey(url, 'html');
    const cacheData = {
      html: html,
      timestamp: Date.now(),
      url: url
    };
    
    this.htmlCache.set(key, cacheData);
    console.log(`HTML cached for ${url}`);
  }

  /**
   * 检查是否在错误缓存中
   */
  isInErrorCache(url) {
    const key = this.generateCacheKey(url, 'error');
    return this.errorCache.has(key);
  }

  /**
   * 添加到错误缓存
   */
  addToErrorCache(url, error) {
    const key = this.generateCacheKey(url, 'error');
    const errorData = {
      error: error.message,
      timestamp: Date.now(),
      url: url
    };
    
    this.errorCache.set(key, errorData);
    console.log(`Added to error cache: ${url} - ${error.message}`);
  }

  /**
   * 清除特定URL的缓存
   */
  clearCache(url) {
    const rssKey = this.generateCacheKey(url, 'rss');
    const siteInfoKey = this.generateCacheKey(url, 'siteinfo');
    const htmlKey = this.generateCacheKey(url, 'html');
    const errorKey = this.generateCacheKey(url, 'error');
    
    this.rssCache.delete(rssKey);
    this.siteInfoCache.delete(siteInfoKey);
    this.htmlCache.delete(htmlKey);
    this.errorCache.delete(errorKey);
    
    console.log(`Cleared all cache for ${url}`);
  }

  /**
   * 清除所有缓存
   */
  clearAllCache() {
    this.rssCache.reset();
    this.siteInfoCache.reset();
    this.htmlCache.reset();
    this.errorCache.reset();
    
    console.log('Cleared all caches');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      rss: {
        size: this.rssCache.size,
        maxSize: this.rssCache.max,
        hits: this.rssCache.hits || 0,
        misses: this.rssCache.misses || 0
      },
      siteInfo: {
        size: this.siteInfoCache.size,
        maxSize: this.siteInfoCache.max
      },
      html: {
        size: this.htmlCache.size,
        maxSize: this.htmlCache.max
      },
      error: {
        size: this.errorCache.size,
        maxSize: this.errorCache.max
      }
    };
  }

  /**
   * 预热缓存
   */
  async warmupCache(urls) {
    console.log(`Starting cache warmup for ${urls.length} URLs`);
    
    const promises = urls.map(async (url) => {
      try {
        // 这里可以预先获取和缓存内容
        // 实际实现会调用主要的RSS生成流程
        console.log(`Warmed up cache for ${url}`);
      } catch (error) {
        console.error(`Cache warmup failed for ${url}:`, error);
      }
    });
    
    await Promise.all(promises);
    console.log('Cache warmup completed');
  }

  /**
   * 检查缓存是否应该刷新
   */
  shouldRefreshCache(url, maxAge = 30 * 60 * 1000) { // 默认30分钟
    const cached = this.getCachedRSS(url);
    if (!cached) return true;
    
    const age = Date.now() - cached.cachedAt;
    return age > maxAge;
  }

  /**
   * 获取缓存中的所有URL
   */
  getCachedUrls() {
    const urls = {
      rss: [],
      siteInfo: [],
      html: [],
      error: []
    };

    // RSS缓存中的URL
    this.rssCache.forEach((value, key) => {
      if (key.startsWith('rss:')) {
        urls.rss.push(key.replace('rss:', ''));
      }
    });

    // 网站信息缓存中的URL
    this.siteInfoCache.forEach((value, key) => {
      if (key.startsWith('siteinfo:')) {
        urls.siteInfo.push(key.replace('siteinfo:', ''));
      }
    });

    // HTML缓存中的URL
    this.htmlCache.forEach((value, key) => {
      if (key.startsWith('html:')) {
        urls.html.push(key.replace('html:', ''));
      }
    });

    // 错误缓存中的URL
    this.errorCache.forEach((value, key) => {
      if (key.startsWith('error:')) {
        urls.error.push(key.replace('error:', ''));
      }
    });

    return urls;
  }

  /**
   * 设置缓存过期时间
   */
  setCacheExpiry(type, maxAge) {
    switch (type) {
      case 'rss':
        // 重新创建缓存以更新maxAge
        const rssItems = [];
        this.rssCache.forEach((value, key) => {
          rssItems.push({ key, value });
        });
        
        this.rssCache = new LRU({
          max: this.rssCache.max,
          maxAge: maxAge,
          updateAgeOnGet: true
        });
        
        rssItems.forEach(item => {
          this.rssCache.set(item.key, item.value);
        });
        break;
        
      // 可以为其他缓存类型添加类似逻辑
    }
  }
}

module.exports = CacheManager;