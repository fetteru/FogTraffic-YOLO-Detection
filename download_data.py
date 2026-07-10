import os
import kagglehub

# 项目根目录
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# 下载到项目 myprojectdata/ 目录
download_path = os.path.join(PROJECT_ROOT, "myprojectdata")
os.makedirs(download_path, exist_ok=True)

path = kagglehub.dataset_download("bratjay/ua-detrac-orig", path=download_path)
print("数据集存放路径：", path)
