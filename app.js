const http = require('http');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const multiparty = require('multiparty');

const port = 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    fs.readFile('index.html', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else if (req.url === '/merge' && req.method === 'POST') {
    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error parsing form data');
        return;
      }

      const imageFile = files.image[0];

      if (!imageFile) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('No image file uploaded');
        return;
      }

      const imagePath = `public/${imageFile.originalFilename}`;

      fs.rename(imageFile.path, imagePath, (err) => {
        if (err) {
          console.error(err);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error uploading the image');
          return;
        }

        Promise.all([
          loadImage(imagePath),
          loadImage('public/watermark.png')
        ])
          .then(([image, watermark]) => {
            const canvas = createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(image, 0, 0);

            const watermarkWidth = 200; // Define the width of the watermark
            const watermarkHeight = (watermarkWidth / watermark.width) * watermark.height; // Maintain the aspect ratio based on the width
            const watermarkX = (image.width - watermarkWidth) / 2; // Center horizontally
            const watermarkY = 20; // 20px padding from the top

            ctx.drawImage(watermark, watermarkX, watermarkY, watermarkWidth, watermarkHeight);

            const mergedImageURL = canvas.toDataURL('image/jpeg');

            res.setHeader('Content-Disposition', 'attachment; filename=merged_image.jpg');
            res.setHeader('Content-Type', 'image/jpeg');

            const stream = canvas.createJPEGStream();
            stream.pipe(res);
          })
          .catch((err) => {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error processing the image');
          });
      });
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
