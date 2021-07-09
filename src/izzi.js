"use strict";

var allNodes=[]
var izziNodes = []
const izData = new Map();
const setStateTostateMap = new Map();
const loop = (node) => {
    var nodes = node.childNodes;    
    for (var i = 0; i <nodes.length; i++){
        if(!nodes[i]){
            continue;
        }
        if(nodes[i].nodeName === "IZZI"){
            izziNodes.push(nodes[i])
            continue;
        }
        if(nodes[i].childNodes.length > 0){
            loop(nodes[i]);
        }
        allNodes.push(nodes[i])
    }
}
function parseVar(str) {
  var re = /\{\{(.*?)\}\}/g;
  var results = []
  var match = re.exec(str);
  while (match != null) {
    results.push(match[1])
    match = re.exec(str);
  }
  return results
}
const linkData = (template, vars, obj, tagType, attributeType = null) =>{
    let isState, key,izziReturn,attributeValue;
    vars.map(v=>{
        template = template.replaceAll(`{{${v}}}`,'${'+v+'}')
    })
    vars.map(v=>{
        isState = new Function(`return ${v.substr(0,v.indexOf("."))}`)();
        if(isState?.type !== 'izziState'){
            isState = new Function(`return ${v}`)()
        }
        key = isState?.type === 'izziState'?isState.id:v
        if(!izData.get(key))
            izData.set(key,[])
        izData.get(key).push({
            element: obj, 
            tagType: tagType,
            ...(attributeType&& {attributeType: attributeType}),
            template: tagType === 'izziTag'?new Function('return ()=>{return ' + template.trim() + '}')():new Function('return ()=>{return `' + template + '`}')()
        })
    })
}
const escapeHTML = (unsafe) => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
const unEscapedHTML = (elm) =>{
    let p = document.createElement('textarea');
    p.innerHTML = elm.innerHTML
    window.a=p.defaultValue.trim()
    return p.defaultValue.trim()
}
const initIzziTag = () =>{
    let bindVars
    izziNodes.map(iNode=>{
        bindVars = iNode.getAttribute("bind")?.split(",");
        if(!bindVars)
            bindVars=[""]
        if(bindVars?.length){
            linkData(unEscapedHTML(iNode), bindVars, iNode,  "izziTag")
        }
    })
}

const initMagicTag = () =>{
    let vars;
    allNodes.map(n=>{
        if(n.data){
            let template;
            template = n.data
            template = template.replace(/\s+/g, ' ')
            vars = parseVar(template)
            if(vars.length){
                linkData(template, vars, n,  "magicTag")
            }
        }
        if(n.attributes){
            for(let i=0;i< n.attributes.length; i++){
                let template, attributeType;
                template = n.attributes[i].value
                template = template.replace(/\s+/g, ' ')
                attributeType = n.attributes[i].name
                vars = parseVar(n.attributes[i].value)
                if(vars.length){
                    linkData(template, vars, n,  "magicTagAttribute", attributeType)
                }
            }
        }
    })
}

const useState = (defaultValue) =>{
    let newState = {
        type:'izziState',
        id: setStateTostateMap.size,
        state: defaultValue,
        set: (newValue) =>{
            newState.state = newValue;
            render(newState.id)
        },
        get: ()=>{
            return newState.state
        }
    }
    setStateTostateMap.set(setStateTostateMap.size, newState)
    return newState;
}
const renderHTML = (izziKey) =>{
    izData.get(izziKey)?.map(izzi=>{
        let izziTemplate = izzi.template()
        if(Array.isArray(izziTemplate))
            izziTemplate=izziTemplate.join("")
        else if(typeof(izziTemplate) === "object")
            izziTemplate = JSON.stringify(izziTemplate)
        else
            izziTemplate = izziTemplate
        if(izzi.tagType==="magicTag"){
            izzi.element.textContent = izziTemplate
        }else if(izzi.tagType ==='izziTag'){
            izzi.element.innerHTML = izziTemplate
        }else if(izzi.tagType === "magicTagAttribute"){
            izzi.attributeType === 'value' ? izzi.element.value = izziTemplate : izzi.element.setAttribute(izzi.attributeType, izziTemplate)
        }
    })
}
const render = (izziKey = null) =>{
    console.log(izziKey)
    if(izziKey === null){
        [...izData.keys()].map(key=>{
            renderHTML(key)
        });
    }else{
        renderHTML(izziKey)
    }

}
const init = async (id) =>{
    loop(document.getElementById(id));
    initMagicTag();
    initIzziTag()
    render()
}