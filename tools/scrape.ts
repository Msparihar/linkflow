#!/usr/bin/env node
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import * as fs from 'fs';

interface ScrapeOptions {
  url: string;
  outputFile?: string;
  selector?: string;
}

async function scrape(options: ScrapeOptions): Promise<string> {
  const { url, outputFile, selector } = options;

  // 1. Fetch HTML with browser-like headers
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // 2. Parse and clean HTML
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style, noscript, iframe, svg, img[src^="data:"]').remove();
  $('nav, footer, header, aside, .ad, .ads, .advertisement, .sidebar, .cookie-banner, .popup').remove();
  $('[role="navigation"], [role="banner"], [role="complementary"]').remove();

  // Get content from specified selector or find main content
  let content: string | null;
  if (selector) {
    content = $(selector).html();
  } else {
    // Try common content selectors in order of preference
    const contentSelectors = [
      'main article',
      'article',
      'main',
      '.content',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#content',
      'body'
    ];

    content = null;
    for (const sel of contentSelectors) {
      const element = $(sel).first();
      if (element.length && element.text().trim().length > 100) {
        content = element.html();
        break;
      }
    }

    if (!content) {
      content = $('body').html();
    }
  }

  if (!content) {
    throw new Error('No content found on page');
  }

  // 3. Convert to Markdown
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  });

  // Add rules for code blocks
  turndown.addRule('pre', {
    filter: 'pre',
    replacement: (content, node) => {
      const code = (node as Element).querySelector('code');
      const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
      return `\n\`\`\`${lang}\n${content.trim()}\n\`\`\`\n`;
    }
  });

  // Clean up the content before conversion
  const $content = cheerio.load(content);
  $content('a').each((_, el) => {
    const $el = $content(el);
    const href = $el.attr('href');
    if (href && !href.startsWith('http') && !href.startsWith('#')) {
      // Convert relative URLs to absolute
      try {
        const absoluteUrl = new URL(href, url).href;
        $el.attr('href', absoluteUrl);
      } catch {
        // Keep as-is if URL parsing fails
      }
    }
  });

  const markdown = turndown.turndown($content.html() || '');

  // Clean up excessive whitespace
  const cleanMarkdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .trim();

  // Add source reference
  const finalMarkdown = `${cleanMarkdown}\n\n---\n\nSource: ${url}`;

  // 4. Output
  if (outputFile) {
    fs.writeFileSync(outputFile, finalMarkdown, 'utf-8');
    console.log(`Saved to ${outputFile}`);
  } else {
    console.log(finalMarkdown);
  }

  return finalMarkdown;
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Web Scraper Tool - Fetch web pages and convert to markdown

Usage:
  npx tsx tools/scrape.ts <url> [output-file] [options]

Arguments:
  url          The URL to scrape (required)
  output-file  Path to save the markdown file (optional, prints to stdout if omitted)

Options:
  --selector, -s <selector>  CSS selector to extract specific content
  --help, -h                 Show this help message

Examples:
  npx tsx tools/scrape.ts https://example.com/docs
  npx tsx tools/scrape.ts https://example.com/docs output.md
  npx tsx tools/scrape.ts https://example.com/docs output.md --selector ".main-content"
`);
    process.exit(0);
  }

  const url = args[0];
  let outputFile: string | undefined;
  let selector: string | undefined;

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--selector' || args[i] === '-s') {
      selector = args[++i];
    } else if (!args[i].startsWith('-')) {
      outputFile = args[i];
    }
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error('Error: URL must start with http:// or https://');
    process.exit(1);
  }

  try {
    await scrape({ url, outputFile, selector });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
