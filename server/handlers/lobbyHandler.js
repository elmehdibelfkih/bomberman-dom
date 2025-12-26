export function lobbyHandler(req, res) {
    let filePath = '/index.html'
    let fullPath = join('./static', filePath)
    let ext = extname(fullPath)

    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    try {
        const content = readFileSync(fullPath);
        sendFile(res, content, contentType)
    } catch (error) {
        console.log(error)
        send500(res, 'homeHandler')
    }
}