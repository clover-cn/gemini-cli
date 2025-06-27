# 同步 fork 与上游仓库

Write-Host "正在同步 fork..." -ForegroundColor Green

# 获取上游最新更改
Write-Host "1. 获取上游更改..." -ForegroundColor Yellow
git fetch upstream

if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 无法获取上游更改" -ForegroundColor Red
    exit 1
}

# 切换到 main 分支
Write-Host "2. 切换到 main 分支..." -ForegroundColor Yellow
git checkout main

if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 无法切换到 main 分支" -ForegroundColor Red
    exit 1
}

# 合并上游更改
Write-Host "3. 合并上游更改..." -ForegroundColor Yellow
git merge upstream/main

if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 合并冲突，请手动解决" -ForegroundColor Red
    exit 1
}

# 推送到 origin
Write-Host "4. 推送到 GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 无法推送到 GitHub" -ForegroundColor Red
    exit 1
}

Write-Host "同步完成！" -ForegroundColor Green
