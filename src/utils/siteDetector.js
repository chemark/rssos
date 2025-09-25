const cheerio = require('cheerio');

/**
 * 网站类型检测器
 * 用于识别网站的类型和结构，以便选择合适的解析策略
 */
class SiteDetector {
  constructor() {
    this.detectors = [
      this.detectWordPress,
      this.detectBlogger,
      this.detectMedium,
      this.detectGitHub,
      this.detectNews,
      this.detectECommerce,
      this.detectPortfolio,
      this.detectGeneric
    ];
  }

  /**
   * 分析网站类型
   */
  async detectSiteType(html, url) {
    const $ = cheerio.load(html);
    const siteInfo = {
      url: url,
      type: 'unknown',
      platform: 'unknown',
      confidence: 0,
      selectors: {},
      features: []
    };

    // 运行所有检测器
    for (const detector of this.detectors) {
      const result = detector.call(this, $, url, html);
      if (result.confidence > siteInfo.confidence) {
        Object.assign(siteInfo, result);
      }
    }

    return siteInfo;
  }

  /**
   * 检测WordPress网站
   */
  detectWordPress($, url, html) {
    let confidence = 0;
    const selectors = {};
    const features = [];

    // WordPress特征检测
    if (html.includes('wp-content') || html.includes('wp-includes')) {
      confidence += 30;
      features.push('wp-content-detected');
    }

    if ($('meta[name="generator"]').attr('content')?.includes('WordPress')) {
      confidence += 40;
      features.push('wp-generator-meta');
    }

    if ($('body').hasClass('wp-admin-bar-front')) {
      confidence += 20;
    }

    if (confidence > 50) {
      selectors.articles = '.post, article, .entry';
      selectors.title = '.entry-title, .post-title, h1, h2.entry-title';
      selectors.content = '.entry-content, .post-content, .content';
      selectors.date = '.entry-date, .post-date, time';
      selectors.link = '.entry-title a, .post-title a';
    }

    return {
      type: 'blog',
      platform: 'wordpress',
      confidence,
      selectors,
      features
    };
  }

  /**
   * 检测Medium网站
   */
  detectMedium($, url, html) {
    let confidence = 0;
    const selectors = {};
    const features = [];

    if (url.includes('medium.com')) {
      confidence += 60;
      features.push('medium-domain');
    }

    if (html.includes('Medium') || $('meta[property="al:web:url"]').attr('content')?.includes('medium.com')) {
      confidence += 30;
    }

    if (confidence > 50) {
      selectors.articles = 'article, .postArticle';
      selectors.title = 'h1, .graf--title';
      selectors.content = '.section-content, .postArticle-content';
      selectors.date = 'time, .postMetaInline time';
      selectors.author = '.postMetaInline a';
    }

    return {
      type: 'blog',
      platform: 'medium',
      confidence,
      selectors,
      features
    };
  }

  /**
   * 检测GitHub Pages或仓库
   */
  detectGitHub($, url, html) {
    let confidence = 0;
    const selectors = {};
    const features = [];

    if (url.includes('github.io') || url.includes('github.com')) {
      confidence += 50;
      features.push('github-domain');
    }

    if ($('meta[property="og:site_name"]').attr('content') === 'GitHub') {
      confidence += 30;
    }

    if (confidence > 50) {
      selectors.articles = '.commit, .issue-item, .release';
      selectors.title = '.commit-title, .issue-title, .release-title';
      selectors.content = '.commit-desc, .issue-body, .release-body';
      selectors.date = 'time, .date';
    }

    return {
      type: 'repository',
      platform: 'github',
      confidence,
      selectors,
      features
    };
  }

  /**
   * 检测新闻网站
   */
  detectNews($, url, html) {
    let confidence = 0;
    const selectors = {};
    const features = [];

    // 新闻网站特征
    const newsKeywords = ['news', 'article', 'story', 'breaking', 'latest'];
    const newsSelectors = $('.article, .news-item, .story');
    
    if (newsSelectors.length > 5) {
      confidence += 20;
      features.push('multiple-articles');
    }

    // 检查meta标签
    const articleType = $('meta[property="og:type"]').attr('content');
    if (articleType === 'article') {
      confidence += 30;
      features.push('article-meta');
    }

    // 检查JSON-LD结构化数据
    if (html.includes('"@type":"NewsArticle"') || html.includes('"@type":"Article"')) {
      confidence += 40;
      features.push('structured-data');
    }

    if (confidence > 30) {
      selectors.articles = 'article, .article, .news-item, .story, .post';
      selectors.title = 'h1, h2, .headline, .title, .article-title';
      selectors.content = '.article-content, .story-content, .content, .text';
      selectors.date = 'time, .date, .published, .timestamp';
      selectors.summary = '.summary, .excerpt, .intro';
    }

    return {
      type: 'news',
      platform: 'news',
      confidence,
      selectors,
      features
    };
  }

  /**
   * 检测电商网站
   */
  detectECommerce($, url, html) {
    let confidence = 0;
    const selectors = {};
    const features = [];

    // 电商特征检测
    if ($('.product, .item, .goods').length > 5) {
      confidence += 30;
      features.push('product-listings');
    }

    if (html.includes('"@type":"Product"')) {
      confidence += 40;
      features.push('product-structured-data');
    }

    // 常见电商关键词
    const ecommerceKeywords = ['price', 'cart', 'buy', 'shop', 'product'];
    const keywordMatches = ecommerceKeywords.filter(keyword => 
      html.toLowerCase().includes(keyword)
    ).length;

    confidence += keywordMatches * 5;

    if (confidence > 25) {
      selectors.articles = '.product, .item, .goods, .listing';
      selectors.title = '.product-title, .item-title, h1, h2';
      selectors.content = '.description, .product-desc, .details';
      selectors.price = '.price, .cost, .amount';
    }

    return {
      type: 'ecommerce',
      platform: 'shop',
      confidence,
      selectors,
      features
    };
  }

  /**
   * 检测作品集网站
   */
  detectPortfolio($, url, html) {
    let confidence = 0;
    const selectors = {};
    const features = [];

    // 作品集特征
    const portfolioKeywords = ['portfolio', 'work', 'project', 'case-study', 'design'];
    const keywordMatches = portfolioKeywords.filter(keyword => 
      html.toLowerCase().includes(keyword) || url.toLowerCase().includes(keyword)
    ).length;

    confidence += keywordMatches * 10;

    // 检查是否有项目展示
    if ($('.project, .work, .case-study, .portfolio-item').length > 2) {
      confidence += 30;
      features.push('project-listings');
    }

    // 检查设计相关的meta标签
    const description = $('meta[name="description"]').attr('content')?.toLowerCase() || '';
    if (['designer', 'portfolio', 'creative', 'artist', 'developer'].some(word => 
      description.includes(word))) {
      confidence += 20;
      features.push('design-description');
    }

    if (confidence > 25) {
      selectors.articles = '.project, .work, .case-study, .portfolio-item';
      selectors.title = '.project-title, .work-title, h1, h2, h3';
      selectors.content = '.project-desc, .work-description, .description';
      selectors.image = '.project-image, .work-image, img';
      selectors.link = '.project-link, .work-link, a';
    }

    return {
      type: 'portfolio',
      platform: 'portfolio',
      confidence,
      selectors,
      features
    };
  }

  /**
   * 通用检测器（fallback）
   */
  detectGeneric($, url, html) {
    const selectors = {
      articles: 'article, .post, .entry, .item, .content-item',
      title: 'h1, h2, .title, .headline, .entry-title',
      content: '.content, .text, .description, .summary',
      date: 'time, .date, .published',
      link: 'a'
    };

    return {
      type: 'generic',
      platform: 'unknown',
      confidence: 10, // 最低优先级
      selectors,
      features: ['generic-fallback']
    };
  }
}

module.exports = SiteDetector;