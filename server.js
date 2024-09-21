const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Function to modify HTML content before sending to the browser
const modifyHtml = async (html, req) => {
  const $ = cheerio.load(html);

  // Rewriting all internal links to go through the proxy
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('http')) {
      $(el).attr('href', `/proxy?url=${encodeURIComponent(href)}`);
    }
  });

  // Modifying resource URLs (CSS, JS, images, etc.)
  $('link[rel="stylesheet"], script, img').each((_, el) => {
    const src = $(el).attr('href') || $(el).attr('src');
    if (src && !src.startsWith('http')) {
      $(el).attr('href', `/proxy?url=${encodeURIComponent(src)}`);
      $(el).attr('src', `/proxy?url=${encodeURIComponent(src)}`);
    }
  });

  return $.html();
};

// Proxy route to handle all requests
app.get('/proxy', async (req, res) => {
  let { url } = req.query;

  if (!url) {
    return res.status(400).send('No URL provided');
  }

  // Add http:// if the user didn’t provide it
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  try {
    const targetUrl = new URL(url);
    const response = await fetch(targetUrl.href);
    const contentType = response.headers.get('content-type');

    // Check if it's HTML content
    if (contentType && contentType.includes('text/html')) {
      const body = await response.text();
      const modifiedHtml = await modifyHtml(body, req);
      res.setHeader('Content-Type', 'text/html');
      res.send(modifiedHtml);
    } else {
      // For non-HTML responses (like images, CSS, JS), just proxy them as-is
      response.body.pipe(res);
    }
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}`);
});
