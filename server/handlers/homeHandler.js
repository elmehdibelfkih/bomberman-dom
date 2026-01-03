import { extname, join } from "path"
import { MIME_TYPES } from "./utils.js"
import { readFileSync } from "fs"
import { send404Http, send500Http, sendErrorHttp, sendFileHttp } from "../helpers.js"


export function homeHandler(req, res) {
    let filePath = '/index.html'
    let fullPath = join('./static', filePath)
    let ext = extname(fullPath)

    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    try {
        const content = readFileSync(fullPath);
        sendFileHttp(res, content, contentType)
    } catch (error) {
        console.log(error)
        send500Http(res, 'homeHandler')
    }
}