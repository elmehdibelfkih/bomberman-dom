import { extname, join } from "path"
import { MIME_TYPES } from "./utils.js"
import { readFileSync } from "fs"
import { validateNickname } from "../utils/validation.js"
import { send404Http, send500Http, sendErrorHttp, sendFileHttp } from "../helpers.js"


// serve html 'home page', and start getting in a lobby
// player chooses map, starts game, if there is already a room add him to it 
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