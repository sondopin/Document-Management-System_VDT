import express from 'express';
import folderController from '../controllers/folders';
import {verifyToken} from '../middleware/auth';

const router = express.Router();

router.post('/prepare-upload', verifyToken, folderController.prepareFolderUpload);

// (Khuyến khích) Route để xác nhận toàn bộ folder đã được upload xong
router.post('/complete-upload', verifyToken, folderController.completeFolderUpload);

router.post('/create', verifyToken, folderController.createFolder);

router.post('/getfolders', verifyToken, folderController.getFolders);

router.post('/update/:folderId', verifyToken, folderController.updateFolder);

router.post('/delete', verifyToken, folderController.deleteFolder);

router.get('/download/:folderId', verifyToken, folderController.downloadFolder);

router.post("/recover", verifyToken, folderController.recoveryFolder);  

router.post('/delete-permanently', verifyToken, folderController.deleteFolderPermanently);

router.post('/share', verifyToken, folderController.shareFolder);

router.post('/unshare', verifyToken, folderController.unShareFolder);

export default router;
