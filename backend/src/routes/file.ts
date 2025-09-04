import express from 'express';
import fileController from '../controllers/files';
import {verifyToken} from '../middleware/auth';

const router = express.Router();


router.post('/generate-upload-url', verifyToken, fileController.generateUploadUrl);

router.post('/confirm-upload', verifyToken, fileController.confirmUpload);

// Multipart upload


router.post('/initiate-multipart', verifyToken, fileController.initiateMultipartUpload);
router.post('/get-part-presigned-url', verifyToken, fileController.getUploadPartPresignedUrl);
router.post('/complete-multipart', verifyToken, fileController.completeMultipartUpload);
router.post('/abort-multipart', verifyToken, fileController.abortMultipartUpload);


router.post('/getfiles', verifyToken, fileController.getFiles);

router.post('/update/:file_id', verifyToken, fileController.updateFile);

router.post('/delete', verifyToken, fileController.deleteFile);

router.get('/download/:fileId', verifyToken, fileController.downloadFile);

router.post("/recover", verifyToken, fileController.recoveryFile);

router.post('/delete-permanently', verifyToken, fileController.deleteFilePermanently);

router.post('/share-link', verifyToken, fileController.getPresignedUrl);

router.post('/share-user', verifyToken, fileController.shareFile);

router.post('/unshare', verifyToken, fileController.unShareFile);

export default router;
