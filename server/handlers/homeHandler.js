import { extname, join } from "path"
import { MIME_TYPES } from "./utils.js"
import { readFileSync } from "fs"


// serve html 'home page', and start getting in a lobby
// player chooses map, starts game, if there is already a room add him to it 
export function homeHandler(req, res) {
    let filePath = '/index.html'
    let fullPath = join('./static', filePath)
    let ext = extname(fullPath)

    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    try {
        const content = readFileSync(fullPath);
        res.writeHead(200, { 'content-type': contentType })
        res.end(content)
    } catch (error) {
        console.log(error)
        if (error.code = 'ENOENT') {
            res.writeHead(404, { 'content-type': 'text/plain' })
            res.end('404 not found')
        } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
        }
    }
}