import os
import shutil
import subprocess
import zipfile
import sys

def create_lambda_package(output_filename='lambda_function.zip', requirements_file='requirements.txt', function_file=None):
    """
    Create an AWS Lambda deployment package with the specified dependencies.
    
    Args:
        output_filename (str): Name of the output zip file
        requirements_file (str): Path to requirements.txt file
        function_file (str, optional): Path to your lambda function code
    """
    # Create a temporary directory for the package
    package_dir = 'lambda_package'
    if os.path.exists(package_dir):
        shutil.rmtree(package_dir)
    os.makedirs(package_dir)
    
    # Install dependencies to the package directory
    subprocess.check_call([
        sys.executable, 
        '-m', 'pip', 
        'install', 
        '-r', requirements_file, 
        '--target', package_dir, 
        '--no-cache-dir'
    ])
    
    # If function file is provided, copy it to the package directory
    if function_file and os.path.exists(function_file):
        shutil.copy2(function_file, package_dir)
    
    # Create a zip file of the package
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(package_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, package_dir)
                zipf.write(file_path, arcname)
    
    print(f"Package created successfully: {output_filename}")
    print(f"Package size: {os.path.getsize(output_filename) / (1024 * 1024):.2f} MB")
    
    # Clean up
    shutil.rmtree(package_dir)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Create an AWS Lambda deployment package')
    parser.add_argument('--output', '-o', default='lambda_function.zip', 
                        help='Output zip filename (default: lambda_function.zip)')
    parser.add_argument('--requirements', '-r', default='requirements.txt', 
                        help='Path to requirements.txt file (default: requirements.txt)')
    parser.add_argument('--function', '-f', 
                        help='Path to your lambda function code (optional)')
    
    args = parser.parse_args()
    
    create_lambda_package(args.output, args.requirements, args.function)