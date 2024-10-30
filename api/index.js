const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();


const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*'
  }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
// Helper function to combine HTML and CSS
const createEmailHTML = (template) => {
  // Extract and process base64 images from template HTML
  const processedHTML = template.html.replace(
    /src="data:image\/([a-zA-Z]*);base64,([^"]*)"/g,
    (match, imageType, base64Data) => {
      // Create a unique filename for the image
      const filename = `image_${Math.random().toString(36).substr(2, 9)}.${imageType}`;
      
      // Store the image data for attachment
      if (!template.images) template.images = [];
      template.images.push({
        filename: filename,
        path: `data:image/${imageType};base64,${base64Data}`,
        cid: filename, // Content ID referenced in HTML
        contentType: `image/${imageType}`,
        contentTransferEncoding: 'base64',
        contentDisposition: 'inline'
      });

      // Replace base64 data with CID reference
      return `src="cid:${filename}"`;
    }
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.name}</title>
        <style type="text/css">      
          ${template.css}
        </style>
      </head>
      <body>
        ${processedHTML}
      </body>
    </html>
  `;
};

app.post('/api/send-campaign', async (req, res) => {
    const { emailGroup, template } = req.body;

    // First create the processed HTML with embedded images
    const processedHTML = createEmailHTML(template);

    const mailOptions = {
      from: '"Email Campaign" <chopanm093@gmail.com>',
      to: emailGroup.emails,
      subject: template.subject,
      html: processedHTML,
      attachments: template.images.map(img => ({
        filename: img.filename,
        path: img.path,
        cid: img.filename,  
        contentType: img.contentType,
        contentTransferEncoding: 'base64',
        contentDisposition: 'inline'
      })),
      headers: {
        'MIME-Version': '1.0',
        'Content-Type': 'multipart/mixed; boundary="mixed"'
      }
    };
  
    try {
      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending emails:', error);
      res.status(500).json({ error: 'Failed to send emails' });
    }
});

app.get('/', (req, res) => {
    res.send('Email Service is running');
});
  
app.listen(PORT, () => {
    console.log('Server running on port',PORT);
});

// Export the Express app
module.exports = app;