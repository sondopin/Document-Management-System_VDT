import express from 'express';
import fileController from '../controllers/files';
import {verifyToken} from '../middleware/auth';

const router = express.Router();

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() ,
  fileFilter: (req:Request, file:Express.Multer.File, cb:any) => {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, true);
  }});

router.post('/upload', verifyToken, upload.array('files', 100), fileController.uploadFile);
router.post('/getfiles', verifyToken, fileController.getFiles);
router.post('/update/:file_id', verifyToken, fileController.updateFile);
router.post('/delete', verifyToken, fileController.deleteFile);
router.get('/download/:fileId', verifyToken, fileController.downloadFile);
router.post("/recover", verifyToken, fileController.recoveryFile);
router.post('/delete-permanently', verifyToken, fileController.deleteFilePermanently);
router.post('/share', verifyToken, fileController.getPresignedUrl);

export default router;
