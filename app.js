const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {compressRLE,decompressRLE} = require('./algorithms/rle');
const {compressHuffman,decompressHuffman}= require('./algorithms/huffman');
const zlib = require('zlib');
const app = express();
const cors = require('cors');
app.use(cors());

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

app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'outputs', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath); 
});

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/rle-compress', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.render('index', { msg: err.message });
    }

    if (!req.file) {
      return res.render('index', { msg: 'No file uploaded!' });
    }

    const inputFilePath = `./uploads/${req.file.filename}`;
    const original = fs.readFileSync(inputFilePath);
     
    let compressed;
    try{
    const start=Date.now();
    compressed = compressRLE(original);
    const end=Date.now();
    var timeTaken=`${end-start}ms`;
    }catch(e){
      return res.render('index',{msg:'Compression failed'});
    }
    if (!fs.existsSync('./outputs')) {
      fs.mkdirSync('./outputs');
    }

    const outputFileName = 'RLEcompressed-' + req.file.filename;
    const outputFilePath = `./outputs/${outputFileName}`;

    fs.writeFileSync(outputFilePath, compressed);

    const originalSize = original.length;
    const compressedSize = compressed.length;
    const compressionRatio = ((compressedSize / originalSize) * 100).toFixed(2);
    let warning = '';
    if (compressedSize > originalSize) {
           warning = 'Note: Compressed file is larger than the original. RLE may not be suitable for this file.';
        }
    res.render('compressed', {
      originalFile: req.file.filename,
      outputFile: outputFileName,
      originalSize,
      compressedSize,
      compressionRatio,
      processingTime:timeTaken,
      warning
    });
  });
});

app.post('/rle-decompress', (req, res) => {
  upload(req,res,(err)=>{
    if (err){
      return res.render('index',{msg:err.message});
    }

    if (!req.file){
      return res.render('index',{msg:'No file uploaded'});
    }
    const inputFilePath=`./uploads/${req.file.filename}`;
    const compressed=fs.readFileSync(inputFilePath);
    
    let decompressed;
    try{
      const start=Date.now();
      decompressed=decompressRLE(compressed);
      const end=Date.now();
      var timeTaken=`${end-start}ms`;
    }catch(e){
      return res.render('index',{msg:'Decompression failed'});
    }
    if (!fs.existsSync('./outputs')){
      fs.mkdirSync('./outputs');
    }
    const originalName = req.file.originalname;
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const outputFileName = `RLE-decompressed-${baseName}${ext}`;
    const outputFilePath = `./outputs/${outputFileName}`;
    fs.writeFileSync(outputFilePath,decompressed);
    
    const compressedSize=compressed.length;
    const decompressedSize=decompressed.length;
    const decompressionRatio = ((decompressedSize / compressedSize) * 100).toFixed(2);

    res.render('decompressed',{
    originalFile:req.file.filename,
    outputFile:outputFileName,
    compressedSize,
    decompressedSize,
    decompressionRatio,
    processingTime:timeTaken
    });
  });
});

app.post('/huffman-compress',(req,res)=>{
  upload(req,res,(err)=>{
    if (err) return res.render('index',{msg:err.message});
    if (!req.file) return res.render('index',{msg:'No file uploaded!'});
    const inputFilePath=`./uploads/${req.file.filename}`;
    const outputFileName = `huff-compressed-${req.file.filename}.huff`;
    const original=fs.readFileSync(inputFilePath);

    let compressed;
    try{
      const start=Date.now();
      compressed=compressHuffman(original);
      const end=Date.now();
      var timeTaken=`${end-start}ms`;
    }catch(e){
      return res.render('index',{msg:'Compression failed'});
    }
    
    if (!fs.existsSync('./outputs')) fs.mkdirSync('./outputs');
    const outputFilePath = `./outputs/${outputFileName}`;
    fs.writeFileSync(outputFilePath,compressed);

    const originalSize=original.length;
    const compressedSize=compressed.length;
    const compressionRatio=((compressedSize/originalSize)*100).toFixed(2);

    res.render('compressed',{
      originalFile:req.file.filename,
      outputFile:outputFileName,
      originalSize,
      compressedSize,
      compressionRatio,
      processingTime:timeTaken
    });
  });
});

app.post('/huffman-decompress',(req,res)=>{
  upload(req,res,(err)=>{
    if (err){
      return res.render('index',{msg:err.message});
    }
    if (!req.file){
      return res.render('index',{msg:'No file uploaded'});
    }
    const inputFilePath=`./uploads/${req.file.filename}`;
    const compressed=fs.readFileSync(inputFilePath);
    let decompressed;
    try{
      const start=Date.now();
      decompressed=decompressHuffman(compressed);
      const end=Date.now();
      var timeTaken=`${end-start}ms`;
    }catch(e){
      return res.render('index',{msg:'Decompression failed'});
    }
    if (!fs.existsSync('./outputs')){
      fs.mkdirSync('./outputs');
    }
    const originalName = req.file.originalname.replace(/^huff-compressed-/, '').replace(/\.huff$/, '');
    const ext = path.extname(originalName); 
    const baseName = path.basename(originalName, ext);
    const outputFileName = `Huff-decompressed-${baseName}${ext}`;
    const outputFilePath=`./outputs/${outputFileName}`;
    fs.writeFileSync(outputFilePath,decompressed);

    const compressedSize=compressed.length;
    const decompressedSize=decompressed.length;
    const decompressionRatio = ((decompressedSize / compressedSize) * 100).toFixed(2);

    res.render('decompressed',{
      originalFile:req.file.filename,
      outputFile:outputFileName,
      compressedSize,
      decompressedSize,
      decompressionRatio,
      processingTime:timeTaken
    });
  });
});

app.post('/lz77-compress', (req, res) => { 
  upload(req, res, (err) => {
    if (err) return res.render('index', { msg: err.message });
    if (!req.file) return res.render('index', { msg: 'No file uploaded!' });

    const inputFilePath = `./uploads/${req.file.filename}`;
    const outputFileName = `lz77-compressed-${req.file.filename}.deflate`;
    const original = fs.readFileSync(inputFilePath);

    let compressed;
    try {
      const start = Date.now();
      compressed = zlib.deflateSync(original); 
      const end = Date.now();
      var timeTaken = `${end - start}ms`;
    } catch (e) {
      return res.render('index', { msg: 'Compression failed' });
    }

    if (!fs.existsSync('./outputs')) fs.mkdirSync('./outputs');
    const outputFilePath = `./outputs/${outputFileName}`;
    fs.writeFileSync(outputFilePath, compressed);

    const originalSize = original.length;
    const compressedSize = compressed.length;
    const compressionRatio = ((compressedSize / originalSize) * 100).toFixed(2);

    let warning = '';
    if (compressedSize > originalSize) {
      warning = 'Compressed file is larger than the original. LZ77 may not be effective.';
    }

    res.render('compressed', {
      originalFile: req.file.filename,
      outputFile: outputFileName,
      originalSize,
      compressedSize,
      compressionRatio,
      processingTime: timeTaken,
      warning
    });
  });
});

app.post('/lz77-decompress', (req, res) => { 
  upload(req, res, (err) => {
    if (err) return res.render('index', { msg: err.message });
    if (!req.file) return res.render('index', { msg: 'No file uploaded!' });

    const inputFilePath = `./uploads/${req.file.filename}`;
    const compressed = fs.readFileSync(inputFilePath);

    let decompressed;
    try {
      const start = Date.now();
      decompressed = zlib.inflateSync(compressed); 
      const end = Date.now();
      var timeTaken = `${end - start}ms`;
    } catch (e) {
      return res.render('index', { msg: 'Decompression failed' });
    }

    if (!fs.existsSync('./outputs')) fs.mkdirSync('./outputs');

    const originalName = req.file.originalname.replace(/^lz77-compressed-/, '').replace(/\.deflate$/, '');
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const outputFileName = `lz77-decompressed-${baseName}${ext}`;
    const outputFilePath = `./outputs/${outputFileName}`;
    fs.writeFileSync(outputFilePath, decompressed);

    const compressedSize = compressed.length;
    const decompressedSize = decompressed.length;
    const decompressionRatio = ((decompressedSize / compressedSize) * 100).toFixed(2);

    res.render('decompressed', {
      originalFile: req.file.filename,
      outputFile: outputFileName,
      compressedSize,
      decompressedSize,
      decompressionRatio,
      processingTime: timeTaken
    });
  });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



