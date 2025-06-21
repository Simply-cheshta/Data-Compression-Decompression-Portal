const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const compressRLE = require('./algorithm/rle');

const app = express();

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage }).single('myFile');

app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use('/outputs', express.static('outputs'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/uploads', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.render('index', { msg: err.message });
    }

    if (!req.file) {
      return res.render('index', { msg: 'No file uploaded!' });
    }

    const inputFilePath = `./uploads/${req.file.filename}`;
    const original = fs.readFileSync(inputFilePath, 'utf8');
    const compressed = compressRLE(original);

    if (!fs.existsSync('./outputs')) {
      fs.mkdirSync('./outputs');
    }

    const outputFilePath = `./outputs/compressed-${req.file.filename}`;
    fs.writeFileSync(outputFilePath, compressed);

    const originalSize = Buffer.byteLength(original, 'utf8');
    const compressedSize = Buffer.byteLength(compressed, 'utf8');
    const compressionRatio = ((compressedSize / originalSize) * 100).toFixed(2);

    res.render('compressed', {
      originalFile: req.file.filename,
      outputFile: 'compressed-' + req.file.filename,
      originalSize,
      compressedSize,
      compressionRatio
    });
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
