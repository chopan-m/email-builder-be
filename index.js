const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Define paths
const dataDir = path.join(__dirname, 'data');
const emailGroupsPath = path.join(dataDir, 'emailGroups.json');
const templatesPath = path.join(dataDir, 'templates.json');

// Initialize data files
const initializeDataFiles = async () => {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true });

    // Initialize emailGroups.json
    try {
      await fs.access(emailGroupsPath);
      const emailGroupsData = await fs.readFile(emailGroupsPath, 'utf8');
      if (!emailGroupsData) {
        await fs.writeFile(emailGroupsPath, '[]');
      }
    } catch {
      await fs.writeFile(emailGroupsPath, '[]');
    }

    // Initialize templates.json
    try {
      await fs.access(templatesPath);
      const templatesData = await fs.readFile(templatesPath, 'utf8');
      if (!templatesData) {
        await fs.writeFile(templatesPath, '[]');
      }
    } catch {
      await fs.writeFile(templatesPath, '[]');
    }

    console.log('Data files initialized successfully');
  } catch (error) {
    console.error('Error initializing data files:', error);
  }
};

// Helper function to read JSON file
const readJsonFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
};

// Initialize data files on server start
initializeDataFiles();

// API endpoints for email groups
app.post('/data/emailGroups', async (req, res) => {
  try {
    await fs.writeFile(emailGroupsPath, JSON.stringify(req.body, null, 2));
    res.json({ message: 'Email groups saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save email groups' });
  }
});

app.get('/data/emailGroups', async (req, res) => {
  try {
    const groups = await readJsonFile(emailGroupsPath);
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read email groups' });
  }
});

// API endpoints for templates
app.post('/data/templates', async (req, res) => {
  try {
    await fs.writeFile(templatesPath, JSON.stringify(req.body, null, 2));
    res.json({ message: 'Templates saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save templates' });
  }
});

app.get('/data/templates', async (req, res) => {
  try {
    const templates = await readJsonFile(templatesPath);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read templates' });
  }
});

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
  const { emailGroup, template, name } = req.body;

  try {
    // Read data using helper function
    const emailGroups = await readJsonFile(emailGroupsPath);
    const templates = await readJsonFile(templatesPath);

    console.log('Email Groups:', emailGroups); // Debug log
    console.log('Templates:', templates); // Debug log
    console.log('Requested Group:', emailGroup); // Debug log
    console.log('Requested Template:', template); // Debug log

    const selectedGroup = emailGroups.find(group => group.name === emailGroup);
    const selectedTemplate = templates.find(t => t.name === template);

    if (!selectedGroup || !selectedGroup.emails || selectedGroup.emails.length === 0) {
      throw new Error('Email group not found or has no emails');
    }

    if (!selectedTemplate || !selectedTemplate.html) {
      throw new Error('Template not found or invalid');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'chopanm093@gmail.com',
        pass: 'avuyoyoczxwktcjb',
      },
    });

    await transporter.sendMail({
      from: 'chopanm093@gmail.com',
      to: selectedGroup.emails[0],
      subject: `Test: ${name}`,
      html: selectedTemplate.html,
    });
    
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Data directory:', dataDir);
});
