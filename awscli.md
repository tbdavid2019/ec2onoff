# 建立專屬 IAM 使用者指南 (AWS CLI)

因為這個應用程式會控制您的 EC2 伺服器，為了安全起見，我們強烈建議建立一個「權限最小化 (Least Privilege)」的 IAM 使用者給這個系統專用。

請在您**已經安裝並設定好 AWS CLI 的機器上**，依序執行以下 4 個步驟：

> **📌 準備工作：** 以下指令中的 `<YOUR_REGION>` 請替換為您的 AWS 區域（例如：`ap-northeast-1`），`<YOUR_INSTANCE_ID>` 請替換為您的 EC2 實體 ID（例如：`i-0123456789abcdef0`）。

### 第 1 步：建立限定權限的 IAM Policy
這個 Policy 只允許該使用者對特定的 EC2 實例執行啟動與停止操作，並且可以查看目前的狀態。

```bash
aws iam create-policy --policy-name EC2OnOffWebServerPolicy --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeInstanceStatus"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:StartInstances",
                "ec2:StopInstances"
            ],
            "Resource": "arn:aws:ec2:<YOUR_REGION>:*:instance/<YOUR_INSTANCE_ID>"
        }
    ]
}'
```

**⚠️ 注意：** 執行完這步後，終端機會回傳一段 JSON 格式的內容。請在其中找到包含 `"Arn": "arn:aws:iam::..."` 的這一行 ARN 字串，**將整個字串複製下來，第 3 步會用到**。

---

### 第 2 步：建立專用的 IAM 使用者
我們為這個專案建立一個名為 `EC2OnOffAppUser` 的使用者。

```bash
aws iam create-user --user-name EC2OnOffAppUser
```

---

### 第 3 步：將 Policy 綁定給使用者
將第 1 步建立的權限綁定到第 2 步建立的使用者身上。
**(請將下方指令中的 `<POLICY_ARN>` 替換為第 1 步複製出來的 ARN 字串，例如 `arn:aws:iam::123456789012:policy/EC2OnOffWebServerPolicy`)**

```bash
aws iam attach-user-policy --user-name EC2OnOffAppUser --policy-arn <POLICY_ARN>
```

---

### 第 4 步：產生存取金鑰 (Access Key)
最後，我們需要產生這把「鑰匙」讓程式可以使用。

```bash
aws iam create-access-key --user-name EC2OnOffAppUser
```

執行後，您會看到包含以下兩個重要資訊的結果：
* `AccessKeyId`
* `SecretAccessKey`

### ✅ 重要：下一步
請將產生出來的 **`AccessKeyId`** 與 **`SecretAccessKey`** 複製，並貼入您專案的 `.env` 檔案中對應的欄位，即可完成最後的設定！
