"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const folders_1 = __importDefault(require("../controllers/folders"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/prepare-upload', auth_1.verifyToken, folders_1.default.prepareFolderUpload);
// (Khuyến khích) Route để xác nhận toàn bộ folder đã được upload xong
router.post('/complete-upload', auth_1.verifyToken, folders_1.default.completeFolderUpload);
router.post('/create', auth_1.verifyToken, folders_1.default.createFolder);
router.post('/getfolders', auth_1.verifyToken, folders_1.default.getFolders);
router.post('/update/:folderId', auth_1.verifyToken, folders_1.default.updateFolder);
router.post('/delete', auth_1.verifyToken, folders_1.default.deleteFolder);
router.get('/download/:folderId', auth_1.verifyToken, folders_1.default.downloadFolder);
router.post("/recover", auth_1.verifyToken, folders_1.default.recoveryFolder);
router.post('/delete-permanently', auth_1.verifyToken, folders_1.default.deleteFolderPermanently);
router.post('/share', auth_1.verifyToken, folders_1.default.shareFolder);
router.post('/unshare', auth_1.verifyToken, folders_1.default.unShareFolder);
exports.default = router;
