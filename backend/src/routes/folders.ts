import express from 'express';
import folderController from '../controllers/folders';
import {verifyToken} from '../middleware/auth';

const router = express.Router();

// ⚠️ Quan trọng: gắn upload.single("file") đúng tên key bạn dùng trong Postman
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // bạn có thể tách ra file khác nếu muốn


router.post('/upload', verifyToken, upload.array('files'), folderController.uploadFolder);
router.post('/create', verifyToken, folderController.createFolder);
router.post('/getfolders', verifyToken, folderController.getFolders);
router.post('/update/:folderId', verifyToken, folderController.updateFolder);
router.post('/delete', verifyToken, folderController.deleteFolder);
router.get('/download/:folderId', verifyToken, folderController.downloadFolder);
router.post("/recover", verifyToken, folderController.recoveryFolder);  
router.post('/delete-permanently', verifyToken, folderController.deleteFolderPermanently);

export default router;
