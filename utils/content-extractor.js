class ContentExtractor {
    static SITE_TYPES = {
        YOUTUBE: 'youtube',
        NORMAL: 'normal',
        // 未來可以添加更多網站類型
        // MEDIUM: 'medium',
        // SUBSTACK: 'substack',
        // 等等...
    };

    static getSiteType(url) {
        try {
            const urlObj = new URL(url);
            if (
                urlObj.hostname.includes('youtube.com') ||
                urlObj.hostname.includes('youtu.be')
            ) {
                return this.SITE_TYPES.YOUTUBE;
            }
            // 未來可以在這裡添加更多網站的判斷
            // if (urlObj.hostname.includes('medium.com')) {
            //     return this.SITE_TYPES.MEDIUM;
            // }
            return this.SITE_TYPES.NORMAL;
        } catch (error) {
            console.error('Invalid URL:', url);
            return this.SITE_TYPES.NORMAL;
        }
    }

    static getYoutubeVideoId(url) {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('v');
        } else if (urlObj.hostname.includes('youtu.be')) {
            return urlObj.pathname.slice(1);
        }
        return null;
    }

    static cleanTextContent(content) {
        return content
            .replace(/\s+/g, ' ')
            .replace(/<[^>]*>/g, '')
            .trim();
    }
}

export default ContentExtractor;
