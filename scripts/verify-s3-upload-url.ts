import { createS3FileStorage } from "lib/file-storage/s3-file-storage";

async function main() {
  const filename = process.argv[2] || "test.png";
  const contentType = process.argv[3] || "image/png";

  const storage = createS3FileStorage();

  if (typeof (storage as any).createUploadUrl !== "function") {
    console.log(
      JSON.stringify(
        {
          directUploadSupported: false,
          message: "Storage driver does not support presigned uploads.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const res = await (storage as any).createUploadUrl({
    filename,
    contentType,
    expiresInSeconds: 900,
  });

  console.log(
    JSON.stringify({ directUploadSupported: !!res, ...res }, null, 2),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
