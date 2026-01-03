

export function valideHtmlNode(node) {
    if (typeof node === "string") { return true }
    if (!node) { console.error("you cant render a falsy node", node); return false }
    if (!node.tag) { console.error("you cant render a falsy tag", node.tag); return false }
    return true
}