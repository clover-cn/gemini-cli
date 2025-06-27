$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer sk-imvhsrqgwvoyfmhubnqnomnrdkozhuzauygwksrlqnlvocac"
    "Accept" = "text/event-stream"
}

$body = @{
    model = "deepseek-ai/DeepSeek-V3"
    messages = @(
        @{
            role = "user"
            content = "测试"
        }
    )
    stream = $true
} | ConvertTo-Json -Depth 3

try {
    Write-Host "Sending streaming request to SiliconFlow API..." -ForegroundColor Yellow
    Write-Host "Body: $body" -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Uri "https://api.siliconflow.cn/v1/chat/completions" -Method POST -Headers $headers -Body $body -TimeoutSec 30
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response Headers:" -ForegroundColor Cyan
    $response.Headers | Format-Table
    Write-Host "Response Content:" -ForegroundColor Green
    Write-Host $response.Content
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}
