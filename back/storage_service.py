import json
import os
import boto3
from botocore.exceptions import ClientError
from urllib.parse import urlparse

class StorageService:
    @staticmethod
    def is_s3_path(path):
        """Check if the path is an S3 path (s3://bucket/key)"""
        return path.startswith('s3://')

    @staticmethod
    def parse_s3_path(s3_path):
        """Parse an S3 path into bucket and key components"""
        parsed = urlparse(s3_path)
        bucket = parsed.netloc
        key = parsed.path.lstrip('/')
        return bucket, key

    @staticmethod
    def load_data(file_path):
        """Load JSON data from either S3 or local filesystem"""
        if StorageService.is_s3_path(file_path):
            bucket, key = StorageService.parse_s3_path(file_path)
            s3 = boto3.client('s3')
            try:
                response = s3.get_object(Bucket=bucket, Key=key)
                content = response['Body'].read().decode('utf-8')
                return json.loads(content)
            except ClientError as e:
                if e.response['Error']['Code'] == 'NoSuchKey':
                    return []
                else:
                    raise
        else:
            # Local file system
            if os.path.exists(file_path):
                with open(file_path, 'r') as file:
                    return json.load(file)
            return []

    @staticmethod
    def save_data(data, file_path):
        """Save JSON data to either S3 or local filesystem"""
        json_content = json.dumps(data, indent=4)
        
        if StorageService.is_s3_path(file_path):
            bucket, key = StorageService.parse_s3_path(file_path)
            s3 = boto3.client('s3')
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=json_content,
                ContentType='application/json'
            )
        else:
            # Local file system
            with open(file_path, 'w') as file:
                file.write(json_content)