const globalAttrs = new Set([
  // Standard global attributes
  "id",
  "class",
  "style",
  "title",
  "lang",
  "dir",
  "hidden",
  "tabindex",
  "contenteditable",
  "draggable",
  "spellcheck",
  "role",
  "autocapitalize",
  "autofocus",
  "accesskey",
  "part",
  "slot",
  "translate",
  "enterkeyhint",
  "inputmode",
  "nonce",

  // Microdata attributes
  "itemid",
  "itemprop",
  "itemref",
  "itemscope",
  "itemtype",

  // Global ARIA attributes (can be used on any element)
  "aria-activedescendant",
  "aria-atomic",
  "aria-autocomplete",
  "aria-busy",
  "aria-checked",
  "aria-colcount",
  "aria-colindex",
  "aria-colspan",
  "aria-controls",
  "aria-current",
  "aria-describedat",
  "aria-describedby",
  "aria-disabled",
  "aria-dropeffect",
  "aria-errormessage",
  "aria-expanded",
  "aria-flowto",
  "aria-grabbed",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-level",
  "aria-live",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-orientation",
  "aria-owns",
  "aria-placeholder",
  "aria-posinset",
  "aria-pressed",
  "aria-readonly",
  "aria-relevant",
  "aria-required",
  "aria-roledescription",
  "aria-rowcount",
  "aria-rowindex",
  "aria-rowspan",
  "aria-selected",
  "aria-setsize",
  "aria-sort",
  "aria-valuemax",
  "aria-valuemin",
  "aria-valuenow",
  "aria-valuetext",

  // Custom data attributes — handled specially
  "data-*",
]);

const eventAttrs = new Set([
  // UI/Window events
  "onabort",
  "onerror",
  "onload",
  "onresize",
  "onscroll",
  "onunload",
  // Mouse events
  "onclick",
  "ondblclick",
  "onmousedown",
  "onmouseup",
  "onmouseover",
  "onmousemove",
  "onmouseout",
  "onmouseenter",
  "onmouseleave",
  "oncontextmenu",
  "onwheel",      // standard mouse wheel
  "onmousewheel", // older (deprecated but still widely supported)
  // Keyboard events
  "onkeydown",
  "onkeypress",
  "onkeyup",
  // Form/Focus events
  "onfocus",
  "onblur",
  "onchange",
  "oninput",
  "oninvalid",
  "onsubmit",
  "onreset",
  "onselect",
  "onsearch",
  // Drag & drop
  "ondrag",
  "ondragstart",
  "ondragenter",
  "ondragover",
  "ondragleave",
  "ondragexit",
  "ondragend",
  "ondrop",
  // Media events
  "oncanplay",
  "oncanplaythrough",
  "ondurationchange",
  "onemptied",
  "onended",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onpause",
  "onplay",
  "onplaying",
  "onprogress",
  "onratechange",
  "onseeking",
  "onseeked",
  "ontimeupdate",
  "onvolumechange",
  "onwaiting",
  // Pointer & touch (some modern events — optional)
  "onpointerdown",
  "onpointerup",
  "onpointermove",
  "onpointerover",
  "onpointerout",
  "onpointerenter",
  "onpointerleave",
  "ongotpointercapture",
  "onlostpointercapture",
  // Clipboard events
  "oncopy",
  "oncut",
  "onpaste",
  // Touchscreen events (may not be official attributes, but widely supported)
  "ontouchstart",
  "ontouchmove",
  "ontouchend",
  "ontouchcancel",
  // Other common events
  "onanimationstart",
  "onanimationend",
  "onanimationiteration",
  "ontransitionend",
]);

export const tagsMapAttributesSet = {
  // Document metadata
  html: new Set([...globalAttrs, ...eventAttrs, "manifest"]),
  head: new Set([...globalAttrs, ...eventAttrs]),
  title: new Set([...globalAttrs, ...eventAttrs]),
  base: new Set([...globalAttrs, ...eventAttrs, "href", "target"]),
  link: new Set([...globalAttrs, ...eventAttrs, "href", "rel", "as", "type", "media"]),
  meta: new Set([...globalAttrs, ...eventAttrs, "name", "content", "charset", "http-equiv"]),
  style: new Set([...globalAttrs, ...eventAttrs, "type", "media", "scoped"]),

  // Sections
  body: new Set([...globalAttrs, ...eventAttrs]),
  header: new Set([...globalAttrs, ...eventAttrs]),
  footer: new Set([...globalAttrs, ...eventAttrs]),
  main: new Set([...globalAttrs, ...eventAttrs]),
  nav: new Set([...globalAttrs, ...eventAttrs]),
  section: new Set([...globalAttrs, ...eventAttrs]),
  article: new Set([...globalAttrs, ...eventAttrs]),
  aside: new Set([...globalAttrs, ...eventAttrs]),
  figure: new Set([...globalAttrs, ...eventAttrs]),
  figcaption: new Set([...globalAttrs, ...eventAttrs]),
  address: new Set([...globalAttrs, ...eventAttrs]),
  div: new Set([...globalAttrs, ...eventAttrs]),

  // Headings
  h1: new Set([...globalAttrs, ...eventAttrs]),
  h2: new Set([...globalAttrs, ...eventAttrs]),
  h3: new Set([...globalAttrs, ...eventAttrs]),
  h4: new Set([...globalAttrs, ...eventAttrs]),
  h5: new Set([...globalAttrs, ...eventAttrs]),
  h6: new Set([...globalAttrs, ...eventAttrs]),
  hgroup: new Set([...globalAttrs, ...eventAttrs]),

  // Text content
  p: new Set([...globalAttrs, ...eventAttrs]),
  pre: new Set([...globalAttrs, ...eventAttrs]),
  blockquote: new Set([...globalAttrs, ...eventAttrs]),
  q: new Set([...globalAttrs, ...eventAttrs, "cite"]),
  small: new Set([...globalAttrs, ...eventAttrs]),
  strong: new Set([...globalAttrs, ...eventAttrs]),
  em: new Set([...globalAttrs, ...eventAttrs]),
  b: new Set([...globalAttrs, ...eventAttrs]),
  i: new Set([...globalAttrs, ...eventAttrs]),
  u: new Set([...globalAttrs, ...eventAttrs]),
  s: new Set([...globalAttrs, ...eventAttrs]),
  strike: new Set([...globalAttrs, ...eventAttrs]),
  code: new Set([...globalAttrs, ...eventAttrs]),
  var: new Set([...globalAttrs, ...eventAttrs]),
  samp: new Set([...globalAttrs, ...eventAttrs]),
  kbd: new Set([...globalAttrs, ...eventAttrs]),
  sub: new Set([...globalAttrs, ...eventAttrs]),
  sup: new Set([...globalAttrs, ...eventAttrs]),
  mark: new Set([...globalAttrs, ...eventAttrs]),
  abbr: new Set([...globalAttrs, ...eventAttrs]),
  cite: new Set([...globalAttrs, ...eventAttrs]),
  dfn: new Set([...globalAttrs, ...eventAttrs]),
  time: new Set([...globalAttrs, ...eventAttrs, "datetime"]),
  bdi: new Set([...globalAttrs, ...eventAttrs]),
  bdo: new Set([...globalAttrs, ...eventAttrs, "dir"]),
  wbr: new Set([...globalAttrs, ...eventAttrs]),
  br: new Set([...globalAttrs, ...eventAttrs]),

  // Links & media
  a: new Set([...globalAttrs, ...eventAttrs, "href", "target", "rel", "download", "hreflang", "type", "referrerpolicy"]),
  area: new Set([...globalAttrs, ...eventAttrs, "href", "alt", "coords", "shape", "target", "download"]),
  img: new Set([...globalAttrs, ...eventAttrs, "src", "alt", "srcset", "sizes", "crossorigin", "decoding", "loading", "width", "height", "referrerpolicy"]),
  picture: new Set([...globalAttrs, ...eventAttrs]),
  source: new Set([...globalAttrs, ...eventAttrs, "src", "type", "media", "sizes"]),
  audio: new Set([...globalAttrs, ...eventAttrs, "src", "controls", "autoplay", "muted", "loop", "preload"]),
  video: new Set([...globalAttrs, ...eventAttrs, "src", "controls", "autoplay", "muted", "loop", "poster", "width", "height", "preload"]),
  track: new Set([...globalAttrs, ...eventAttrs, "kind", "src", "srclang", "label", "default"]),
  iframe: new Set([...globalAttrs, ...eventAttrs, "src", "srcdoc", "name", "sandbox", "allow", "allowfullscreen", "referrerpolicy", "width", "height"]),
  map: new Set([...globalAttrs, ...eventAttrs, "name"]),
  canvas: new Set([...globalAttrs, ...eventAttrs, "width", "height"]),
  svg: new Set([...globalAttrs, ...eventAttrs]),
  math: new Set([...globalAttrs, ...eventAttrs]),
  embed: new Set([...globalAttrs, ...eventAttrs, "src", "type", "width", "height"]),
  object: new Set([...globalAttrs, ...eventAttrs, "data", "type", "name", "usemap", "width", "height"]),
  param: new Set([...globalAttrs, ...eventAttrs, "name", "value"]),
  span: new Set([...globalAttrs, ...eventAttrs]),

  // Forms
  form: new Set([...globalAttrs, ...eventAttrs, "action", "method", "enctype", "target", "autocomplete", "novalidate", "name"]),
  input: new Set([...globalAttrs, ...eventAttrs, "type", "value", "name", "placeholder", "checked", "disabled", "readonly", "required", "min", "max", "step", "maxlength", "multiple", "pattern", "size", "autocomplete", "accept"]),
  button: new Set([...globalAttrs, ...eventAttrs, "type", "disabled", "name", "value", "autofocus", "form", "formenctype", "formmethod", "formnovalidate", "formtarget"]),
  textarea: new Set([...globalAttrs, ...eventAttrs, "name", "placeholder", "rows", "cols", "maxlength", "readonly", "disabled", "required", "wrap"]),
  label: new Set([...globalAttrs, ...eventAttrs, "for"]),
  select: new Set([...globalAttrs, ...eventAttrs, "name", "size", "multiple", "disabled", "required", "autofocus"]),
  option: new Set([...globalAttrs, ...eventAttrs, "value", "selected", "disabled", "label"]),
  optgroup: new Set([...globalAttrs, ...eventAttrs, "label", "disabled"]),
  datalist: new Set([...globalAttrs, ...eventAttrs]),
  output: new Set([...globalAttrs, ...eventAttrs, "name", "for", "form", "type"]),
  progress: new Set([...globalAttrs, ...eventAttrs, "value", "max"]),
  meter: new Set([...globalAttrs, ...eventAttrs, "value", "min", "max", "low", "high", "optimum"]),

  // Lists
  ul: new Set([...globalAttrs, ...eventAttrs]),
  ol: new Set([...globalAttrs, ...eventAttrs]),
  li: new Set([...globalAttrs, ...eventAttrs]),

  // Tables
  table: new Set([...globalAttrs, ...eventAttrs, "summary", "width", "border", "cellpadding", "cellspacing"]),
  caption: new Set([...globalAttrs, ...eventAttrs]),
  colgroup: new Set([...globalAttrs, ...eventAttrs, "span"]),
  col: new Set([...globalAttrs, ...eventAttrs, "span"]),
  thead: new Set([...globalAttrs, ...eventAttrs]),
  tbody: new Set([...globalAttrs, ...eventAttrs]),
  tfoot: new Set([...globalAttrs, ...eventAttrs]),
  tr: new Set([...globalAttrs, ...eventAttrs]),
  td: new Set([...globalAttrs, ...eventAttrs, "colspan", "rowspan", "headers", "scope"]),
  th: new Set([...globalAttrs, ...eventAttrs, "colspan", "rowspan", "scope"]),

  // Interactive
  details: new Set([...globalAttrs, ...eventAttrs, "open"]),
  summary: new Set([...globalAttrs, ...eventAttrs]),
  dialog: new Set([...globalAttrs, ...eventAttrs, "open", "returnvalue"]),

  // Scripting
  script: new Set([...globalAttrs, ...eventAttrs, "src", "type", "async", "defer", "crossorigin", "nomodule", "referrerpolicy"]),
  noscript: new Set([...globalAttrs, ...eventAttrs]),

  // Deprecated / obsolete
  basefont: new Set([...globalAttrs, ...eventAttrs]),
  center: new Set([...globalAttrs, ...eventAttrs]),
  font: new Set([...globalAttrs, ...eventAttrs]),
  frameset: new Set([...globalAttrs, ...eventAttrs, "cols", "rows"]),
  frame: new Set([...globalAttrs, ...eventAttrs, "src", "name", "frameborder", "scrolling", "noresize", "longdesc"]),
  noframes: new Set([...globalAttrs, ...eventAttrs]),
  applet: new Set([...globalAttrs, ...eventAttrs, "code", "codebase", "alt", "height", "width"]),
  isindex: new Set([...globalAttrs, ...eventAttrs, "prompt"]),
  listing: new Set([...globalAttrs, ...eventAttrs]),
  xmp: new Set([...globalAttrs, ...eventAttrs]),
  plaintext: new Set([...globalAttrs, ...eventAttrs]),
  template: new Set([...globalAttrs, ...eventAttrs]),
  slot: new Set([...globalAttrs, ...eventAttrs])
};



export function validateDomNode(node) {
  // 1. Ignore non-element nodes (Text, Comment, etc.)
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return true
  }

  const tag = node.tagName.toLowerCase();

  // 2. Check tag existence
  const allowedAttrs = tagsMapAttributesSet[tag];
  if (!allowedAttrs) {
    return {
      valid: false,
      reason: `Tag <${tag}> is not allowed`,
    };
  }

  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();

    if (name.startsWith("data-") || name.startsWith("aria-")) {
      continue;
    }

    if (!allowedAttrs.has(name)) {
      return {
        valid: false,
        reason: `Attribute "${name}" is not allowed on <${tag}>`,
      };
    }
  }

  return true
}
