const fetch = require('node-fetch');
const validUrl = require('valid-url');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { url } = req.body;

  // Validate if the input is a URL
  if (validUrl.isUri(url)) {
    try {
      const response = await fetch(url);
      const body = await response.text();
      res.status(200).send(body);
    } catch (error) {
      res.status(500).send('Error fetching the requested URL.');
    }
  } else {
    // If it's not a valid URL, return a Google search
    res.redirect(`https://www.google.com/search?q=${encodeURIComponent(url)}`);
  }
}
