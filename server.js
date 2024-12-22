const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3006;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname))); // Serve files from root directory

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/interfaith_ensemble', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Essay Schema
const essaySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true,
        trim: true,
        lowercase: true
    },
    state: { 
        type: String, 
        required: true,
        trim: true
    },
    category: { 
        type: String, 
        required: true,
        enum: ['cultural-tradition', 'cuisine', 'music', 'art']
    },
    fileName: String,
    filePath: String,
    declaration: Boolean,
    submissionDate: { 
        type: Date, 
        default: Date.now 
    }
});

const Essay = mongoose.model('Essay', essaySchema);

// Multer Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['.doc', '.docx', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only .doc, .docx, and .pdf files are allowed.'));
        }
    }
});

// Routes
app.post('/submit-essay', upload.single('essay-file'), async (req, res) => {
    try {
        console.log('Received form submission:', req.body);
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const essay = new Essay({
            name: req.body.name,
            email: req.body.email,
            state: req.body.state,
            category: req.body.category,
            fileName: req.file.originalname,
            filePath: req.file.path,
            declaration: req.body.declaration === 'on'
        });

        await essay.save();
        console.log('Essay saved successfully');
        res.redirect('/thankyou.html');
    } catch (error) {
        console.error('Error processing submission:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

// Serve the submit.html file
app.get('/submit-essay', (req, res) => {
    res.sendFile(path.join(__dirname, 'submit.html'));
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});