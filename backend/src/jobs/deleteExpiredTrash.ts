import cron from "node-cron";
import {File} from "../models/file";
import {Folder} from "../models/folder";
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// Chạy lúc 3h sáng hàng ngày
cron.schedule("0 3 * * *", async () => {
  const expiredDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const oldFiles = await File.find({
    is_deleted: true,
    deleted_at: { $lte: expiredDate }
  });

  for (const file of oldFiles) {
    if (file.key) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: file.key,
        })
      );
    }

    await File.findByIdAndDelete(file._id);
  }

  // TODO: Thêm xử lý folder nếu muốn
    const oldFolders = await Folder.find({
        is_deleted: true,
        deleted_at: { $lte: expiredDate }
    });

    for (const folder of oldFolders) {
        await Folder.findByIdAndDelete(folder._id);
    }

  console.log(`[CRON] Deleted ${oldFiles.length} expired files`);
});
