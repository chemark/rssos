/**
 * RSSOS 前端交互逻辑
 * 处理用户界面交互和API调用
 */

class RSSGenerator {
    constructor() {
        this.apiBase = this.getApiBase();
        this.initializeElements();
        this.bindEvents();
        this.loadFromURL();
    }

    /**
     * 获取API基础URL
     */
    getApiBase() {
        // 如果是本地开发环境
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            return '/api';
        }
        // 生产环境 - Vercel部署
        return '/api';
    }

    /**
     * 初始化DOM元素
     */
    initializeElements() {
        // 输入元素
        this.urlInput = document.getElementById('urlInput');
        this.generateBtn = document.getElementById('generateBtn');
        this.refreshCache = document.getElementById('refreshCache');

        // 状态区域
        this.loadingSection = document.getElementById('loadingSection');
        this.resultSection = document.getElementById('resultSection');
        this.errorSection = document.getElementById('errorSection');

        // 结果元素
        this.siteType = document.getElementById('siteType');
        this.articleCount = document.getElementById('articleCount');
        this.rssUrl = document.getElementById('rssUrl');
        this.copyBtn = document.getElementById('copyBtn');
        this.previewBtn = document.getElementById('previewBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.foloBtn = document.getElementById('foloBtn');
        this.reederBtn = document.getElementById('reederBtn');

        // 错误元素
        this.errorMessage = document.getElementById('errorMessage');
        this.retryBtn = document.getElementById('retryBtn');
        this.reportBtn = document.getElementById('reportBtn');

        // Toast通知
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toastMessage');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 生成按钮
        this.generateBtn.addEventListener('click', () => this.handleGenerate());

        // 输入框回车键
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleGenerate();
            }
        });

        // 输入框实时验证
        this.urlInput.addEventListener('input', () => this.validateInput());

        // 复制按钮
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());

        // 下载按钮
        this.downloadBtn.addEventListener('click', () => this.downloadRSS());

        // 重试按钮
        this.retryBtn.addEventListener('click', () => this.handleGenerate());

        // 反馈按钮
        this.reportBtn.addEventListener('click', () => this.reportIssue());

        // Folo一键订阅
        this.foloBtn.addEventListener('click', () => this.addToFolo());

        // Reeder一键订阅
        this.reederBtn.addEventListener('click', () => this.addToReeder());

        // 示例卡片点击
        document.querySelectorAll('.example-card').forEach(card => {
            card.addEventListener('click', () => {
                const url = card.dataset.url;
                if (url) {
                    this.urlInput.value = url;
                    this.validateInput();
                    this.scrollToGenerator();
                }
            });
        });
    }

    /**
     * 从URL参数加载
     */
    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        const url = params.get('url');
        if (url) {
            this.urlInput.value = decodeURIComponent(url);
            this.validateInput();
            // 自动生成RSS
            setTimeout(() => this.handleGenerate(), 500);
        }
    }

    /**
     * 验证输入
     */
    validateInput() {
        const url = this.urlInput.value.trim();
        const isValid = this.isValidUrl(url);
        
        this.generateBtn.disabled = !isValid;
        
        if (url && !isValid) {
            this.urlInput.style.borderColor = '#dc3545';
        } else {
            this.urlInput.style.borderColor = '';
        }
    }

    /**
     * 检查URL是否有效
     */
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    /**
     * 处理生成RSS请求
     */
    async handleGenerate() {
        const url = this.urlInput.value.trim();
        
        if (!this.isValidUrl(url)) {
            this.showToast('请输入有效的URL地址', 'error');
            return;
        }

        try {
            this.showLoading();
            this.hideError();
            this.hideResult();

            // 构建API请求URL
            const apiUrl = this.buildApiUrl(url);
            console.log('Requesting RSS generation for:', url);

            // 发起请求
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/rss+xml, application/xml, text/xml',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // 获取响应头信息
            const siteTypeHeader = response.headers.get('X-Site-Type') || 'unknown/unknown';
            const articlesFound = response.headers.get('X-Articles-Found') || '0';
            const cacheStatus = response.headers.get('X-Cache') || 'MISS';

            // 获取RSS内容
            const rssContent = await response.text();

            // 显示结果
            this.showResult(url, apiUrl, siteTypeHeader, articlesFound, cacheStatus);

            console.log('RSS generation successful:', {
                siteType: siteTypeHeader,
                articles: articlesFound,
                cache: cacheStatus
            });

            // 更新浏览器历史
            this.updateURL(url);

        } catch (error) {
            console.error('RSS generation failed:', error);
            this.showError(error);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 构建API请求URL
     */
    buildApiUrl(url) {
        const apiUrl = new URL(`${this.apiBase}/generate`, window.location.origin);
        apiUrl.searchParams.set('url', url);
        
        if (this.refreshCache.checked) {
            apiUrl.searchParams.set('refresh', '1');
        }
        
        return apiUrl.toString();
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        this.loadingSection.classList.remove('hidden');
        this.generateBtn.disabled = true;
        this.generateBtn.innerHTML = '<span class="btn-text">生成中...</span><div class="loading-spinner" style="width:16px;height:16px;margin:0;border-width:2px;"></div>';
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.loadingSection.classList.add('hidden');
        this.generateBtn.disabled = false;
        this.generateBtn.innerHTML = '<span class="btn-text">生成RSS</span><span class="btn-icon">⚡</span>';
    }

    /**
     * 显示结果
     */
    showResult(originalUrl, rssUrl, siteTypeHeader, articlesFound, cacheStatus) {
        // 解析网站类型信息
        const [siteType, platform] = siteTypeHeader.split('/');
        
        // 更新网站信息
        this.siteType.textContent = this.formatSiteType(siteType, platform);
        this.articleCount.textContent = `找到 ${articlesFound} 篇文章`;

        // 设置RSS URL
        this.rssUrl.value = rssUrl;
        this.previewBtn.href = rssUrl;

        // 添加缓存状态标识
        if (cacheStatus === 'HIT') {
            this.siteType.textContent += ' (缓存)';
        }

        // 显示结果区域
        this.resultSection.classList.remove('hidden');
        this.scrollToResult();
    }

    /**
     * 格式化网站类型显示
     */
    formatSiteType(type, platform) {
        const typeMap = {
            'portfolio': '作品集',
            'blog': '博客',
            'news': '新闻',
            'repository': '代码仓库',
            'ecommerce': '电商',
            'unknown': '未知'
        };

        const platformMap = {
            'wordpress': 'WordPress',
            'figma': 'Figma',
            'github': 'GitHub',
            'medium': 'Medium',
            'portfolio': '自定义',
            'news': '新闻网站',
            'unknown': '通用'
        };

        const typeText = typeMap[type] || type;
        const platformText = platformMap[platform] || platform;
        
        return `${typeText} • ${platformText}`;
    }

    /**
     * 显示错误
     */
    showError(error) {
        let errorText = '生成RSS时发生错误';
        
        if (error.message.includes('HTTP 400')) {
            errorText = 'URL格式不正确或无法访问';
        } else if (error.message.includes('HTTP 404')) {
            errorText = '网站未找到，请检查URL是否正确';
        } else if (error.message.includes('HTTP 500')) {
            errorText = '服务器内部错误，请稍后重试';
        } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
            errorText = '网络连接错误，请检查网络连接';
        } else if (error.message) {
            errorText = error.message;
        }

        this.errorMessage.textContent = errorText;
        this.errorSection.classList.remove('hidden');
        this.scrollToError();
    }

    /**
     * 隐藏错误
     */
    hideError() {
        this.errorSection.classList.add('hidden');
    }

    /**
     * 隐藏结果
     */
    hideResult() {
        this.resultSection.classList.add('hidden');
    }

    /**
     * 复制到剪贴板
     */
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.rssUrl.value);
            this.showToast('RSS链接已复制到剪贴板！', 'success');
            
            // 更新复制按钮状态
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<span class="copy-icon">✅</span><span class="copy-text">已复制</span>';
            this.copyBtn.style.background = '#d4edda';
            this.copyBtn.style.borderColor = '#c3e6cb';
            this.copyBtn.style.color = '#155724';
            
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
                this.copyBtn.style.background = '';
                this.copyBtn.style.borderColor = '';
                this.copyBtn.style.color = '';
            }, 2000);

        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showToast('复制失败，请手动选择复制', 'error');
            
            // 手动选择文本
            this.rssUrl.select();
            this.rssUrl.setSelectionRange(0, 99999);
        }
    }

    /**
     * 下载RSS文件
     */
    async downloadRSS() {
        try {
            const response = await fetch(this.rssUrl.value);
            const rssContent = await response.text();
            
            // 创建下载链接
            const blob = new Blob([rssContent], { type: 'application/rss+xml' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = this.generateFilename();
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            this.showToast('RSS文件下载已开始', 'success');
            
        } catch (error) {
            console.error('Download failed:', error);
            this.showToast('下载失败，请稍后重试', 'error');
        }
    }

    /**
     * 生成下载文件名
     */
    generateFilename() {
        try {
            const url = new URL(this.urlInput.value);
            const hostname = url.hostname.replace('www.', '');
            const timestamp = new Date().toISOString().split('T')[0];
            return `${hostname}-rss-${timestamp}.xml`;
        } catch (error) {
            return `rss-feed-${Date.now()}.xml`;
        }
    }

    /**
     * 反馈问题
     */
    reportIssue() {
        const title = encodeURIComponent('RSSOS RSS生成问题反馈');
        const body = encodeURIComponent(`**问题URL:** ${this.urlInput.value}\n\n**错误信息:**\n${this.errorMessage.textContent}\n\n**问题描述:**\n请描述您遇到的问题...\n\n**浏览器信息:**\n${navigator.userAgent}\n\n**时间:**\n${new Date().toLocaleString()}`);
        const githubUrl = `https://github.com/chemark/rssos/issues/new?title=${title}&body=${body}&labels=bug`;
        
        window.open(githubUrl, '_blank');
    }

    /**
     * 一键添加到Folo
     */
    addToFolo() {
        if (!this.rssUrl.value) {
            this.showToast('请先生成RSS链接', 'error');
            return;
        }

        try {
            // Folo的添加订阅URL scheme
            // 参考: https://github.com/RSSNext/Follow
            const foloUrl = `https://app.folo.is/add?url=${encodeURIComponent(this.rssUrl.value)}`;
            
            // 尝试打开Folo应用
            window.open(foloUrl, '_blank');
            
            this.showToast('正在打开Folo...', 'success');
            
            // 统计点击
            console.log('Folo subscription initiated:', this.rssUrl.value);
            
        } catch (error) {
            console.error('Failed to open Folo:', error);
            this.showToast('无法打开Folo，请手动复制RSS链接', 'error');
        }
    }

    /**
     * 一键添加到Reeder
     */
    addToReeder() {
        if (!this.rssUrl.value) {
            this.showToast('请先生成RSS链接', 'error');
            return;
        }

        try {
            // Reeder的URL scheme
            // 参考: https://reederapp.com/support/
            const reederUrl = `reeder://add-feed/${encodeURIComponent(this.rssUrl.value)}`;
            
            // 先尝试打开Reeder URL scheme
            const link = document.createElement('a');
            link.href = reederUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            // 监听blur事件来检测是否成功打开
            let appOpened = false;
            const handleBlur = () => {
                appOpened = true;
                window.removeEventListener('blur', handleBlur);
            };
            
            window.addEventListener('blur', handleBlur);
            
            // 点击链接
            link.click();
            document.body.removeChild(link);
            
            // 2秒后检查是否成功打开
            setTimeout(() => {
                window.removeEventListener('blur', handleBlur);
                if (!appOpened) {
                    // 如果未成功打开，尝试打开Mac App Store
                    const appStoreUrl = 'https://apps.apple.com/app/reeder-5/id1529448980';
                    window.open(appStoreUrl, '_blank');
                    this.showToast('Reeder未安装，正在打开App Store...', 'info');
                } else {
                    this.showToast('正在打开Reeder...', 'success');
                }
            }, 2000);
            
            // 统计点击
            console.log('Reeder subscription initiated:', this.rssUrl.value);
            
        } catch (error) {
            console.error('Failed to open Reeder:', error);
            this.showToast('无法打开Reeder，请手动复制RSS链接', 'error');
        }
    }

    /**
     * 显示Toast通知
     */
    showToast(message, type = 'info') {
        this.toastMessage.textContent = message;
        
        // 设置样式
        this.toast.className = 'toast show';
        if (type === 'success') {
            this.toast.style.background = '#28a745';
        } else if (type === 'error') {
            this.toast.style.background = '#dc3545';
        } else {
            this.toast.style.background = '#323232';
        }

        // 自动隐藏
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    /**
     * 滚动到生成器
     */
    scrollToGenerator() {
        document.querySelector('.main').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    /**
     * 滚动到结果
     */
    scrollToResult() {
        setTimeout(() => {
            this.resultSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    }

    /**
     * 滚动到错误
     */
    scrollToError() {
        setTimeout(() => {
            this.errorSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    }

    /**
     * 更新浏览器URL
     */
    updateURL(url) {
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('url', encodeURIComponent(url));
        window.history.pushState({}, '', currentUrl);
    }
}

/**
 * 工具函数
 */
class Utils {
    /**
     * 防抖函数
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 格式化日期
     */
    static formatDate(date) {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * 检查是否为移动设备
     */
    static isMobile() {
        return window.innerWidth <= 768;
    }

    /**
     * 平滑滚动到元素
     */
    static scrollToElement(element, offset = 0) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    // 初始化RSS生成器
    const rssGenerator = new RSSGenerator();

    // 添加页面交互增强
    addPageEnhancements();

    console.log('RSSOS frontend initialized successfully');
});

/**
 * 添加页面交互增强
 */
function addPageEnhancements() {
    // 添加输入焦点效果
    document.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });

    // 添加卡片悬停效果
    document.querySelectorAll('.feature-card, .example-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });

    // 添加按钮点击效果
    document.querySelectorAll('button, .action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // 创建涟漪效果
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .focused {
            transform: scale(1.02);
        }
        
        .loading-dots::after {
            content: '';
            animation: loading-dots 1.5s infinite;
        }
        
        @keyframes loading-dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
        }
    `;
    document.head.appendChild(style);

    // 性能监控
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log(`Page load time: ${Math.round(perfData.loadEventEnd - perfData.loadEventStart)}ms`);
        });
    }
}