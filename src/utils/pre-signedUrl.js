require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const generateUploadUrl = async (fileName, fileType) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Expires: 60 * 5, 
    ContentType: fileType,  
    //ACL: "private", 
  };

  return s3.getSignedUrlPromise('putObject', params);
};

const generateDownloadUrl = async (fileName) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Expires: 60 * 5, 
  };

  return s3.getSignedUrlPromise('getObject', params);
};

module.exports = { generateUploadUrl, generateDownloadUrl };
