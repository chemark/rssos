const cheerio = require('cheerio');
const fetch = require('node-fetch');
const { URL } = require('url');

/**
 * 通用内容解析器
 * 根据网站类型和检测结果解析网站内容
 */
class ContentParser {
  constructor(siteInfo) {
    this.siteInfo = siteInfo;
    this.baseUrl = new URL(siteInfo.url).origin;
  }

  /**
   * 解析网站内容，提取文章列表
   */
  async parseContent(html) {
    const $ = cheerio.load(html);
    const articles = [];

    // 根据网站类型选择解析策略
    switch (this.siteInfo.type) {
      case 'portfolio':
        return this.parsePortfolioContent($, html);
      case 'blog':
        return this.parseBlogContent($, html);
      case 'news':
        return this.parseNewsContent($, html);
      case 'ecommerce':
        return this.parseECommerceContent($, html);
      case 'repository':
        return this.parseRepositoryContent($, html);
      default:
        return this.parseGenericContent($, html);
    }
  }

  /**
   * 解析作品集内容
   */
  parsePortfolioContent($, html) {
    const articles = [];
    const selectors = this.siteInfo.selectors;

    // 如果是Figma类型的网站（如Jason Spielman），尝试获取JSON数据
    if (html.includes('_json/') && html.includes('.json')) {
      return this.parseFigmaBasedSite($, html);
    }

    // 标准作品集解析
    $(selectors.articles).each((index, element) => {
      const $el = $(element);
      
      const title = this.extractText($el, selectors.title) || `Project ${index + 1}`;
      const content = this.extractText($el, selectors.content) || '';
      const link = this.extractLink($el, selectors.link);
      const image = this.extractImage($el, selectors.image);
      
      if (title) {
        articles.push({
          title: title.trim(),
          link: link,
          description: content.trim() || `View details of ${title}`,
          content: this.generatePortfolioContent(title, content, image),
          pubDate: new Date().toUTCString(),
          guid: this.generateGuid(link || title),
          image: image
        });
      }
    });

    return articles.slice(0, 20); // 限制数量
  }

  /**
   * 解析Figma类型的网站（如Jason Spielman）
   */
  async parseFigmaBasedSite($, html) {
    const articles = [];
    
    try {
      // 提取JSON URL
      const jsonUrlMatch = html.match(/"preload"[^>]*href="([^"]*\/_json\/[^"]*\.json)"/);
      if (!jsonUrlMatch) {
        return this.parseGenericContent($, html);
      }

      const jsonUrl = `${this.baseUrl}${jsonUrlMatch[1]}`;
      console.log(`Fetching JSON data from: ${jsonUrl}`);

      // 获取JSON数据
      const jsonResponse = await fetch(jsonUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSSOS/1.0)'
        }
      });

      if (!jsonResponse.ok) {
        throw new Error(`Failed to fetch JSON: ${jsonResponse.status}`);
      }

      const jsonData = await jsonResponse.json();
      
      // 解析JSON数据中的项目信息
      if (jsonData && jsonData.nodeById) {
        const processedItems = new Set();
        
        Object.keys(jsonData.nodeById).forEach(nodeId => {
          const node = jsonData.nodeById[nodeId];
          
          // 查找交互节点（项目链接）
          if (node.interactions && Array.isArray(node.interactions)) {
            node.interactions.forEach(interaction => {
              if (interaction.actions && interaction.actions.length > 0) {
                const action = interaction.actions[0];
                if (action.connectionURL && action.connectionURL.startsWith('/') && 
                    !action.connectionURL.includes('http') && action.connectionURL.length > 1) {
                  
                  const projectName = action.connectionURL.replace('/', '').replace('-', ' ');
                  const projectKey = `project-${projectName}`;
                  
                  if (projectName && !processedItems.has(projectKey) && projectName.length < 30) {
                    processedItems.add(projectKey);
                    
                    articles.push({
                      title: `${this.capitalize(projectName)} - Portfolio Project`,
                      link: `${this.baseUrl}${action.connectionURL}`,
                      description: `Explore the ${projectName} project featuring innovative design work, UX research, and creative solutions.`,
                      content: this.generateFigmaProjectContent(projectName, action.connectionURL),
                      pubDate: new Date().toUTCString(),
                      guid: `figma-project-${nodeId}-${Date.now()}`,
                      category: 'Design'
                    });
                  }
                }
              }
            });
          }
          
          // 查找文本内容
          if (node.type === 'TEXT' && node.characters) {
            const text = node.characters.trim();
            if (text.length > 30 && text.length < 200 && 
                (text.toLowerCase().includes('design') || text.toLowerCase().includes('project') ||
                 text.toLowerCase().includes('developed') || text.toLowerCase().includes('led'))) {
              
              const textKey = `text-${text.substring(0, 20)}`;
              if (!processedItems.has(textKey)) {
                processedItems.add(textKey);
                
                const title = text.length > 60 ? text.substring(0, 57) + '...' : text;
                
                articles.push({
                  title: title.replace(/\n/g, ' ').trim(),
                  link: this.siteInfo.url,
                  description: text.replace(/\n/g, ' ').trim(),
                  content: `<p>${text.replace(/\n/g, '</p><p>')}</p>`,
                  pubDate: new Date().toUTCString(),
                  guid: `figma-text-${nodeId}-${Date.now()}`,
                  category: 'Design'
                });
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error parsing Figma-based site:', error);
      return this.parseGenericContent($, html);
    }

    return articles.length > 0 ? articles.slice(0, 10) : this.parseGenericContent($, html);
  }

  /**
   * 解析博客内容
   */
  parseBlogContent($, html) {
    const articles = [];
    const selectors = this.siteInfo.selectors;

    // 特殊处理Movable Type博客（如阮一峰的博客）
    if (this.siteInfo.platform === 'movable-type') {
      return this.parseMovableTypeBlog($, html);
    }

    $(selectors.articles).each((index, element) => {
      const $el = $(element);
      
      const title = this.extractText($el, selectors.title);
      const content = this.extractText($el, selectors.content);
      const link = this.extractLink($el, selectors.link);
      const date = this.extractDate($el, selectors.date);
      
      if (title) {
        articles.push({
          title: title.trim(),
          link: link,
          description: this.generateSummary(content, 200),
          content: content,
          pubDate: date ? new Date(date).toUTCString() : new Date().toUTCString(),
          guid: this.generateGuid(link || title),
          author: this.extractText($el, selectors.author) || 'Unknown'
        });
      }
    });

    return articles;
  }

  /**
   * 解析Movable Type博客内容
   */
  parseMovableTypeBlog($, html) {
    const articles = [];
    const processedLinks = new Set();

    // 首先解析主要的文章条目（entry-asset）
    $('.entry-asset').each((index, element) => {
      const $el = $(element);
      
      const titleEl = $el.find('.asset-name.entry-title a, .asset-name.entry-title');
      const title = titleEl.length > 0 ? titleEl.text().trim() : '';
      const link = titleEl.is('a') ? this.resolveUrl(titleEl.attr('href')) : this.siteInfo.url;
      
      const contentEl = $el.find('.asset-content, .asset-body, .entry-content');
      const content = contentEl.length > 0 ? contentEl.html() : '';
      
      const dateEl = $el.find('.asset-date, .published, time');
      let pubDate = new Date().toUTCString();
      if (dateEl.length > 0) {
        const dateText = dateEl.attr('datetime') || dateEl.text();
        if (dateText) {
          const parsedDate = new Date(dateText);
          if (!isNaN(parsedDate.getTime())) {
            pubDate = parsedDate.toUTCString();
          }
        }
      }
      
      if (title && !processedLinks.has(link)) {
        processedLinks.add(link);
        articles.push({
          title: title,
          link: link,
          description: this.generateSummary(content ? $('<div>').html(content).text() : title, 200),
          content: content || `<p>${title}</p>`,
          pubDate: pubDate,
          guid: this.generateGuid(link),
          author: '阮一峰',
          category: 'Blog'
        });
      }
    });

    // 然后解析最新文章列表（module-list-item）
    $('#homepage .module-list-item').each((index, element) => {
      const $el = $(element);
      const linkEl = $el.find('a');
      
      if (linkEl.length > 0) {
        const title = linkEl.text().trim();
        const link = this.resolveUrl(linkEl.attr('href'));
        
        // 提取日期信息
        const dateSpan = $el.find('span').first();
        let pubDate = new Date().toUTCString();
        if (dateSpan.length > 0) {
          const dateText = dateSpan.text().replace('»', '').trim();
          if (dateText) {
            const parsedDate = new Date(dateText + ' 00:00:00');
            if (!isNaN(parsedDate.getTime())) {
              pubDate = parsedDate.toUTCString();
            }
          }
        }
        
        if (title && !processedLinks.has(link) && !title.includes('更多文章')) {
          processedLinks.add(link);
          articles.push({
            title: title,
            link: link,
            description: `阮一峰的网络日志：${title}`,
            content: `<h2>${title}</h2><p>这是阮一峰网络日志的一篇文章，请点击链接查看完整内容。</p>`,
            pubDate: pubDate,
            guid: this.generateGuid(link),
            author: '阮一峰',
            category: 'Blog'
          });
        }
      }
    });

    return articles.slice(0, 20); // 限制数量
  }

  /**
   * 解析新闻内容
   */
  parseNewsContent($, html) {
    const articles = [];
    const selectors = this.siteInfo.selectors;

    $(selectors.articles).each((index, element) => {
      const $el = $(element);
      
      const title = this.extractText($el, selectors.title);
      const content = this.extractText($el, selectors.content);
      const summary = this.extractText($el, selectors.summary) || this.generateSummary(content, 150);
      const link = this.extractLink($el, selectors.link);
      const date = this.extractDate($el, selectors.date);
      
      if (title) {
        articles.push({
          title: title.trim(),
          link: link,
          description: summary,
          content: content,
          pubDate: date ? new Date(date).toUTCString() : new Date().toUTCString(),
          guid: this.generateGuid(link || title),
          category: 'News'
        });
      }
    });

    return articles;
  }

  /**
   * 解析电商内容
   */
  parseECommerceContent($, html) {
    const articles = [];
    const selectors = this.siteInfo.selectors;

    $(selectors.articles).each((index, element) => {
      const $el = $(element);
      
      const title = this.extractText($el, selectors.title);
      const content = this.extractText($el, selectors.content);
      const link = this.extractLink($el, selectors.link);
      const price = this.extractText($el, selectors.price);
      
      if (title) {
        articles.push({
          title: title.trim(),
          link: link,
          description: `${content || 'Product details'}${price ? ` - ${price}` : ''}`,
          content: this.generateProductContent(title, content, price),
          pubDate: new Date().toUTCString(),
          guid: this.generateGuid(link || title),
          category: 'Product'
        });
      }
    });

    return articles;
  }

  /**
   * 解析代码仓库内容
   */
  parseRepositoryContent($, html) {
    const articles = [];
    const selectors = this.siteInfo.selectors;

    $(selectors.articles).each((index, element) => {
      const $el = $(element);
      
      const title = this.extractText($el, selectors.title);
      const content = this.extractText($el, selectors.content);
      const link = this.extractLink($el, selectors.link);
      const date = this.extractDate($el, selectors.date);
      
      if (title) {
        articles.push({
          title: title.trim(),
          link: link,
          description: content || title,
          content: content,
          pubDate: date ? new Date(date).toUTCString() : new Date().toUTCString(),
          guid: this.generateGuid(link || title),
          category: 'Repository'
        });
      }
    });

    return articles;
  }

  /**
   * 通用内容解析
   */
  parseGenericContent($, html) {
    const articles = [];
    const selectors = this.siteInfo.selectors;

    $(selectors.articles).each((index, element) => {
      const $el = $(element);
      
      const title = this.extractText($el, selectors.title);
      const content = this.extractText($el, selectors.content);
      const link = this.extractLink($el, selectors.link);
      const date = this.extractDate($el, selectors.date);
      
      if (title && title.length > 5) {
        articles.push({
          title: title.trim(),
          link: link,
          description: this.generateSummary(content, 200),
          content: content,
          pubDate: date ? new Date(date).toUTCString() : new Date().toUTCString(),
          guid: this.generateGuid(link || title)
        });
      }
    });

    return articles;
  }

  // 工具方法
  extractText($el, selector) {
    if (!selector) return '';
    const element = $el.find(selector).first();
    if (element.length === 0) {
      // 如果找不到子元素，检查当前元素是否匹配
      return $el.is(selector) ? $el.text() : '';
    }
    return element.text();
  }

  extractLink($el, selector) {
    if (!selector) return this.siteInfo.url;
    
    let link = '';
    if (selector) {
      const linkEl = $el.find(selector).first();
      if (linkEl.length > 0) {
        link = linkEl.attr('href');
      }
    }
    
    if (!link) {
      // 尝试查找任何链接
      const anyLink = $el.find('a').first().attr('href');
      if (anyLink) link = anyLink;
    }

    return link ? this.resolveUrl(link) : this.siteInfo.url;
  }

  extractImage($el, selector) {
    if (!selector) return null;
    const imgEl = $el.find(selector).first();
    if (imgEl.length > 0) {
      const src = imgEl.attr('src') || imgEl.attr('data-src');
      return src ? this.resolveUrl(src) : null;
    }
    return null;
  }

  extractDate($el, selector) {
    if (!selector) return null;
    const dateEl = $el.find(selector).first();
    if (dateEl.length > 0) {
      return dateEl.attr('datetime') || dateEl.text();
    }
    return null;
  }

  resolveUrl(url) {
    if (!url) return this.siteInfo.url;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.baseUrl}${url}`;
    return `${this.baseUrl}/${url}`;
  }

  generateSummary(text, maxLength = 200) {
    if (!text) return '';
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
  }

  generateGuid(identifier) {
    const hash = require('crypto').createHash('md5').update(identifier + this.siteInfo.url).digest('hex');
    return `rssos-${hash.substring(0, 16)}`;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  generatePortfolioContent(title, content, image) {
    let html = `<h2>${title}</h2>`;
    if (image) {
      html += `<img src="${image}" alt="${title}" style="max-width: 100%; height: auto; margin: 10px 0;"/>`;
    }
    if (content) {
      html += `<p>${content}</p>`;
    }
    return html;
  }

  generateFigmaProjectContent(projectName, projectUrl) {
    return `
      <h2>${this.capitalize(projectName)} - Design Project</h2>
      <p>This project showcases innovative design work and creative problem-solving approaches.</p>
      <h3>Key Highlights:</h3>
      <ul>
        <li>User-centered design approach</li>
        <li>Innovative visual solutions</li>
        <li>Comprehensive research and testing</li>
        <li>Modern, clean aesthetic</li>
      </ul>
      <p><a href="${this.baseUrl}${projectUrl}">View full project details →</a></p>
    `;
  }

  generateProductContent(title, content, price) {
    let html = `<h2>${title}</h2>`;
    if (price) {
      html += `<p><strong>Price: ${price}</strong></p>`;
    }
    if (content) {
      html += `<p>${content}</p>`;
    }
    return html;
  }
}

module.exports = ContentParser;