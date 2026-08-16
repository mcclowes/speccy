import fs from 'node:fs';
import path from 'node:path';

export default function robotsPlugin(context) {
  return {
    name: 'speccy-robots',

    postBuild({ outDir }) {
      const sitemapUrl = new URL(
        path.posix.join(context.siteConfig.baseUrl, 'sitemap.xml'),
        context.siteConfig.url,
      );
      const content = `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl.href}\n`;

      fs.writeFileSync(path.join(outDir, 'robots.txt'), content, 'utf8');
    },
  };
}
