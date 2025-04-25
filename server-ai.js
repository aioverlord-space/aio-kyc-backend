
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const field = file.fieldname;
    const timestamp = Date.now();
    cb(null, `${field}_${timestamp}${ext}`);
  }
});

const upload = multer({ storage });

// Simulate AI review logic
function aiEvaluateKYC(formData) {
  const rand = Math.random();
  if (rand < 0.8) {
    return { status: 'approved', reason: null };
  } else {
    const reasons = [
      'Document is blurry or incomplete',
      'Liveness test failed: face not centered',
      'ID type not recognized',
      'Incomplete form data'
    ];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    return { status: 'rejected', reason };
  }
}

// Handle KYC submission with AI auto-review
app.post('/submit-kyc', upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), (req, res) => {
  const formData = req.body;
  const files = req.files;
  const review = aiEvaluateKYC(formData);

  const record = {
    submittedAt: new Date(),
    formData,
    files: Object.keys(files).map(key => files[key][0].filename),
    status: review.status,
    reason: review.reason
  };

  const fileName = `kyc_${Date.now()}.json`;
  const filePath = path.join(__dirname, 'uploads', fileName);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));

  res.status(200).json({ message: 'KYC reviewed', result: record });
});

// API to list all KYC submissions
app.get('/submissions', (req, res) => {
  const dir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));

  const results = files.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file)));
    return {
      file,
      name: data.formData.firstname + ' ' + data.formData.surname,
      status: data.status,
      reason: data.reason,
      document: data.files.find(f => f.startsWith('document')),
      video: data.files.find(f => f.startsWith('video')),
      submittedAt: data.submittedAt
    };
  });

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`AI KYC server running at http://localhost:${PORT}`);
});
