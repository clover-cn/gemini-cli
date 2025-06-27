$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer sk-imvhsrqgwvoyfmhubnqnomnrdkozhuzauygwksrlqnlvocac"
}

$body = @{
    model = "deepseek-ai/DeepSeek-V3"
    messages = @(
        @{
            role = "user"
            content = "测试"
        }
    )
    stream = $false
} | ConvertTo-Json -Depth 3

try {
    Write-Host "Sending request to SiliconFlow API..." -ForegroundColor Yellow
    Write-Host "Body: $body" -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Uri "https://api.siliconflow.cn/v1/chat/completions" -Method POST -Headers $headers -Body $body -TimeoutSec 30
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}
